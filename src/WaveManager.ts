import { IGameScene } from './scenes/IGameScene';
import { CONFIG } from './Config';
import { IWaveConfig } from './MapData';
import { SoundManager, SoundPriority } from './SoundManager';
import { EventBus, Events } from './EventBus';

/**
 * Manages wave logic, spawning enemies, and tracking wave progress.
 */
export class WaveManager {
    private scene: IGameScene;
    public isWaveActive: boolean = false;
    private enemiesToSpawn: string[] = [];
    private spawnTimer: number = 0;

    // Card reward tracking - track last wave number that received a card
    private lastCardGivenForWave: number = 0;

    constructor(scene: IGameScene) {
        this.scene = scene;
    }

    /**
     * Starts the next wave. If already active, adds bonus.
     */
    public startWave() {
        // ALLOW EARLY WAVE START
        // If wave is active, we just increment and add more enemies to the queue

        this.scene.wave++;
        EventBus.getInstance().emit(Events.WAVE_STARTED, this.scene.wave);

        // If not active, activate. If active, we just continue.
        if (!this.isWaveActive) {
            this.isWaveActive = true;
        } else {
            // Early wave bonus!
            // Early wave bonus!
            this.scene.addMoney(CONFIG.ECONOMY.EARLY_WAVE_BONUS);
            this.scene.metrics.trackMoneyEarned(CONFIG.ECONOMY.EARLY_WAVE_BONUS);
            this.scene.showFloatingText(`EARLY! +${CONFIG.ECONOMY.EARLY_WAVE_BONUS}💰`, this.scene.game.canvas.width / 2, 300, 'gold');
        }

        this.generateWave(this.scene.wave);
        this.scene.metrics.trackWaveReached(this.scene.wave);



        // Wave visuals now handled by NotificationSystem via EventBus
        // this.scene.ui.update(); // EventBus handles UI
    }

    public update() {
        if (!this.isWaveActive) return;

        // Спавн врагов
        if (this.enemiesToSpawn.length > 0) {
            this.spawnTimer++;
            // Спавним чуть быстрее (каждые 40 кадров вместо 60)
            if (this.spawnTimer >= 40) {
                const type = this.enemiesToSpawn.shift()!;
                this.scene.spawnEnemy(type);

                // Sound: Boss Spawn
                if (type.toUpperCase() === 'SPIDER' || type.toUpperCase() === 'TANK') {
                    SoundManager.play('boss_spawn', SoundPriority.HIGH);
                }

                this.spawnTimer = 0;
            }
        } else {
            // Если очередь пуста И врагов на карте нет -> победа в волне
            if (this.scene.enemies.length === 0) {
                this.endWave();
            }
        }
    }

    private endWave() {
        this.isWaveActive = false;
        EventBus.getInstance().emit(Events.WAVE_COMPLETED, this.scene.wave);
        // Wave clear visuals now handled by NotificationSystem via EventBus

        // Progressive economy: Base reward + scaling per wave
        const reward = CONFIG.ECONOMY.WAVE_BASE_REWARD + (this.scene.wave * CONFIG.ECONOMY.WAVE_SCALING_FACTOR);
        this.scene.addMoney(reward);

        // Perfect wave bonus (no lives lost this game/wave - strictly checking if at max lives)
        // Note: This checks if current lives equals starting lives. 
        // If we want per-wave perfection, we'd need to snapshot lives at wave start.
        // Assuming "Perfect Wave" means "No leaks currently" or "Full Health".
        // Let's go with: If player has full health (startingLives), give bonus.
        if (this.scene.lives >= this.scene.startingLives) {
            this.scene.addMoney(CONFIG.ECONOMY.PERFECT_WAVE_BONUS);
            this.scene.metrics.trackMoneyEarned(CONFIG.ECONOMY.PERFECT_WAVE_BONUS);
            this.scene.showFloatingText(
                `PERFECT! +${CONFIG.ECONOMY.PERFECT_WAVE_BONUS}💰`,
                this.scene.game.canvas.width / 2,
                350,
                '#00ffff' // Cyan for perfect
            );
        }

        // Give card for this completed wave (only once per wave number)
        // This ensures card is given even if wave was started early
        if (this.scene.wave > this.lastCardGivenForWave) {
            this.scene.giveRandomCard();
            this.lastCardGivenForWave = this.scene.wave;
        }

        // this.scene.ui.update(); // EventBus handles UI
    }

    private generateWave(waveNum: number) {
        this.enemiesToSpawn = [];

        let waveConfig: IWaveConfig | null = null;

        // 1. Пытаемся взять волну из Карты (из редактора)
        if (this.scene.mapData && this.scene.mapData.waves && this.scene.mapData.waves.length > 0) {
            const idx = Math.min(waveNum - 1, this.scene.mapData.waves.length - 1);
            waveConfig = this.scene.mapData.waves[idx];
        }

        // 2. Если в карте пусто, берем из Config (фолбек)
        if (!waveConfig) {
            const idx = Math.min(waveNum - 1, CONFIG.WAVES.length - 1);
            const rawData = CONFIG.WAVES[idx];

            // Проверяем: если rawData это массив, то оборачиваем его вручную
            if (Array.isArray(rawData)) {
                // @ts-ignore - TS thinks rawData is readonly array which works for us
                waveConfig = { enemies: rawData };
            } else {
                // Иначе считаем, что это уже правильный объект
                waveConfig = rawData as unknown as IWaveConfig;
            }
        }

        // Разбор конфига и заполнение очереди
        if (waveConfig && waveConfig.enemies) {
            waveConfig.enemies.forEach((entry) => {
                for (let i = 0; i < entry.count; i++) {
                    this.enemiesToSpawn.push(entry.type);
                }
            });
        }

        // Перемешиваем врагов в волне, чтобы было веселее
        this.enemiesToSpawn.sort(() => Math.random() - 0.5);
    }
}
