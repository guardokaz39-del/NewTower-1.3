import { IGameScene } from './scenes/IGameScene';
import { CONFIG } from './Config';
import { IWaveConfig, SpawnPattern } from './MapData';
import { SoundManager, SoundPriority } from './SoundManager';
import { EventBus, Events } from './EventBus';

/**
 * Структура для хранения метаданных о враге в очереди спавна
 */
interface SpawnQueueEntry {
    type: string;
    pattern: SpawnPattern;
    baseInterval: number;
}

/**
 * Manages wave logic, spawning enemies, and tracking wave progress.
 */
export class WaveManager {
    private scene: IGameScene;
    public isWaveActive: boolean = false;

    // Новая система с метаданными вместо простого массива строк
    private spawnQueue: SpawnQueueEntry[] = [];
    private spawnTimer: number = 0;
    private currentPattern: SpawnPattern = 'normal';
    private currentBaseInterval: number = 40;
    private currentIndex: number = 0; // Индекс текущего врага в очереди

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
            this.scene.showFloatingText(`EARLY! +${CONFIG.ECONOMY.EARLY_WAVE_BONUS}💰`, this.scene.game.width / 2, 300, 'gold');
        }

        this.generateWave(this.scene.wave);
        this.scene.metrics.trackWaveReached(this.scene.wave);



        // Wave visuals now handled by NotificationSystem via EventBus
        // this.scene.ui.update(); // EventBus handles UI
    }

    public update(dt: number) {
        if (!this.isWaveActive) return;

        // Спавн врагов из очереди
        if (this.spawnQueue.length > 0) {
            this.spawnTimer += dt;

            // Динамический интервал в зависимости от паттерна
            const requiredDelay = this.getNextSpawnDelay();

            if (this.spawnTimer >= requiredDelay) {
                const entry = this.spawnQueue.shift()!;
                this.scene.spawnEnemy(entry.type);

                // Sound: Boss Spawn
                if (entry.type.toUpperCase() === 'SPIDER' || entry.type.toUpperCase() === 'TANK') {
                    SoundManager.play('boss_spawn', SoundPriority.HIGH);
                }

                this.spawnTimer = 0;

                // Обновить паттерн для следующего врага
                this.updateCurrentPattern();
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
                this.scene.game.width / 2,
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

    public getWaveConfig(waveNum: number): IWaveConfig | null {
        let waveConfig: IWaveConfig | null = null;

        // 1. Пытаемся взять волну из Карты (из редактора)
        if (this.scene.mapData && this.scene.mapData.waves && this.scene.mapData.waves.length > 0) {
            // Note: Map data often repeats the last wave or loops, but for now we just clamp
            // Actually, if we want "infinite" waves logic, we need to replicate how generateWave picks it.
            // Current generateWave logic: Math.min(waveNum - 1, length - 1)
            const idx = Math.min(waveNum - 1, this.scene.mapData.waves.length - 1);
            waveConfig = this.scene.mapData.waves[idx];
        }

        // 2. Если в карте пусто, берем из Config (фолбек)
        if (!waveConfig) {
            const idx = Math.min(waveNum - 1, CONFIG.WAVES.length - 1);
            const rawData = CONFIG.WAVES[idx];

            if (Array.isArray(rawData)) {
                // @ts-ignore
                waveConfig = { enemies: rawData };
            } else {
                waveConfig = rawData as unknown as IWaveConfig;
            }
        }

        return waveConfig;
    }

    private generateWave(waveNum: number) {
        this.spawnQueue = [];
        this.currentIndex = 0;

        const waveConfig = this.getWaveConfig(waveNum);

        // Разбор конфига и заполнение очереди с метаданными
        if (waveConfig && waveConfig.enemies) {
            waveConfig.enemies.forEach((group) => {
                // Миграция и получение паттерна
                const migrated = this.migrateGroupConfig(group);
                const baseInterval = this.getBaseIntervalFromRate(group.spawnRate);

                for (let i = 0; i < migrated.count; i++) {
                    this.spawnQueue.push({
                        type: migrated.type,
                        pattern: migrated.pattern,
                        baseInterval: baseInterval
                    });
                }
            });
        }

        // Перемешиваем врагов в волне, чтобы было веселее
        this.spawnQueue.sort(() => Math.random() - 0.5);

        // Инициализируем паттерн первого врага
        if (this.spawnQueue.length > 0) {
            this.currentPattern = this.spawnQueue[0].pattern;
            this.currentBaseInterval = this.spawnQueue[0].baseInterval;
        }
    }

    /**
     * Мигрирует старые конфигурации к новому формату
     * Безопасно обрабатывает отсутствующие поля
     */
    private migrateGroupConfig(group: any): { type: string; count: number; pattern: SpawnPattern } {
        // Если уже есть новое поле - используем его
        if (group.spawnPattern) {
            return {
                type: group.type,
                count: group.count,
                pattern: group.spawnPattern as SpawnPattern
            };
        }

        // Миграция из старого формата
        // Эвристика: если было много врагов с fast - делаем swarm
        let defaultPattern: SpawnPattern = 'normal';
        if (group.spawnRate === 'fast' && group.count > 15) {
            defaultPattern = 'swarm';
        }

        return {
            type: group.type,
            count: group.count,
            pattern: defaultPattern
        };
    }

    /**
     * Конвертирует старый spawnRate в базовый интервал
     */
    private getBaseIntervalFromRate(rate?: 'fast' | 'medium' | 'slow'): number {
        switch (rate) {
            case 'fast': return 0.4; // 25 / 60
            case 'slow': return 1.0; // 60 / 60
            case 'medium':
            default: return 0.66; // 40 / 60
        }
    }

    /**
     * Вычисляет следующий интервал спавна в зависимости от паттерна
     */
    private getNextSpawnDelay(): number {
        // Minimum delay 0.05s (instead of 5 frames) to avoiding instant stacking but allow fast fire
        const baseInterval = Math.max(0.05, this.currentBaseInterval);

        switch (this.currentPattern) {
            case 'normal':
                // Фиксированный интервал
                return baseInterval;

            case 'random':
                // Рандомизация ±30% от базового
                const variance = baseInterval * 0.3;
                const randomDelay = baseInterval + (Math.random() - 0.5) * 2 * variance;
                return Math.max(0.05, randomDelay);

            case 'swarm':
                // Очень короткие интервалы (10-25% от базового)
                const swarmBase = baseInterval * 0.15;
                const swarmVariance = swarmBase * 0.5;
                const swarmDelay = swarmBase + Math.random() * swarmVariance;
                return Math.max(0.02, swarmDelay);

            default:
                console.warn('[WaveManager] Unknown spawn pattern:', this.currentPattern);
                return baseInterval;
        }
    }

    /**
     * Обновляет текущий паттерн для следующего врага в очереди
     */
    private updateCurrentPattern(): void {
        if (this.spawnQueue.length > 0) {
            const next = this.spawnQueue[0];
            this.currentPattern = next.pattern;
            this.currentBaseInterval = next.baseInterval;
        }
    }
}
