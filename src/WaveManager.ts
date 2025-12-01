import type { GameScene } from './scenes/GameScene';
import { CONFIG } from './Config';
import { IWaveConfig } from './MapData';

export class WaveManager {
    private scene: GameScene;
    public isWaveActive: boolean = false;
    private enemiesToSpawn: string[] = [];
    private spawnTimer: number = 0;

    constructor(scene: any) {
        this.scene = scene;
    }

    public startWave() {
        if (this.isWaveActive) return;

        this.scene.wave++;
        this.isWaveActive = true;

        this.generateWave(this.scene.wave);

        this.scene.showFloatingText(
            `WAVE ${this.scene.wave}`,
            this.scene.game.canvas.width / 2,
            this.scene.game.canvas.height / 2,
            '#fff'
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
        this.scene.showFloatingText("WAVE CLEARED!", this.scene.game.canvas.width / 2, 200, 'gold');

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

            // --- ИСПРАВЛЕНИЕ ОШИБКИ TS2741 ---
            // Проверяем: если rawData это массив, то оборачиваем его вручную
            if (Array.isArray(rawData)) {
                waveConfig = { enemies: rawData as any };
            } else {
                // Иначе считаем, что это уже правильный объект
                waveConfig = rawData as IWaveConfig;
            }
        }

        // Разбор конфига и заполнение очереди
        if (waveConfig && waveConfig.enemies) {
            waveConfig.enemies.forEach(entry => {
                for (let i = 0; i < entry.count; i++) {
                    this.enemiesToSpawn.push(entry.type);
                }
            });
        }

        // Перемешиваем врагов в волне, чтобы было веселее
        this.enemiesToSpawn.sort(() => Math.random() - 0.5);
    }
}