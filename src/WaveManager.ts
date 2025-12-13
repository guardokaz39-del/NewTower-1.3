import { IGameScene } from './scenes/IGameScene';
import { CONFIG } from './Config';
import { IWaveConfig } from './MapData';

/**
 * Manages wave logic, spawning enemies, and tracking wave progress.
 */
export class WaveManager {
    private scene: IGameScene;
    public isWaveActive: boolean = false;
    private enemiesToSpawn: string[] = [];
    private spawnTimer: number = 0;

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

        // If not active, activate. If active, we just continue.
        if (!this.isWaveActive) {
            this.isWaveActive = true;
        } else {
            // Early wave bonus!
            this.scene.money += CONFIG.ECONOMY.EARLY_WAVE_BONUS;
            this.scene.metrics.trackMoneyEarned(CONFIG.ECONOMY.EARLY_WAVE_BONUS);
            this.scene.showFloatingText('EARLY START!', this.scene.game.canvas.width / 2, 300, 'gold');
        }

        this.generateWave(this.scene.wave);
        this.scene.metrics.trackWaveReached(this.scene.wave);

        // === WAVE START SCREEN FLASH ===
        this.scene.effects.add({
            type: 'screen_flash',
            x: 0,
            y: 0,
            life: 20,
            flashColor: 'rgba(255, 50, 50, ',
        });
        // === END WAVE START FLASH ===

        this.scene.showFloatingText(
            `WAVE ${this.scene.wave}`,
            this.scene.game.canvas.width / 2,
            this.scene.game.canvas.height / 2,
            '#fff',
        );

        this.scene.ui.update();
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
        this.scene.showFloatingText('WAVE CLEARED!', this.scene.game.canvas.width / 2, 200, 'gold');

        // Награда
        this.scene.money += CONFIG.ECONOMY.WAVE_CLEAR_REWARD * 10 + CONFIG.ECONOMY.EARLY_WAVE_BONUS;

        // Даем карту (с шансом или гарантированно каждые X волн)
        if (this.scene.wave % 2 === 0) {
            this.scene.giveRandomCard();
        }

        this.scene.ui.update();
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
