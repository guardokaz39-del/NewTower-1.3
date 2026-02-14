import { IGameScene } from './scenes/IGameScene';
import { CONFIG } from './Config';
import { IWaveConfig, SpawnPattern, IWaveGroup, IWaveGroupRaw } from './MapData';
import { Rng } from './utils/Rng';
import { SoundManager, SoundPriority } from './SoundManager';
import { EventBus, Events } from './EventBus';

/**
 * Metadata for a queued enemy spawn.
 * Internal Use Only: Derives from normalized IWaveGroup.
 */
interface SpawnQueueEntry {
    type: string;
    pattern: SpawnPattern;
    interval: number; // Delay BEFORE this unit spawns (seconds)
}

/**
 * Manages wave logic, spawning enemies, and tracking wave progress.
 */
export class WaveManager {
    private scene: IGameScene;
    public isWaveActive: boolean = false;

    // Queue with pre-calculated determinism
    private spawnQueue: SpawnQueueEntry[] = [];
    private spawnTimer: number = 0;

    // Determinism & State
    private readonly runSeed: number;
    private pendingWaveStarts: number = 0; // Tracks queued early starts
    private lastEarlyBonusTime: number = -1; // Cooldown for early wave bonus (ms)
    private waveStartLives: number = 0; // Snapshot for perfect wave check

    // Card reward tracking
    private lastCardGivenForWave: number = 0;

    constructor(scene: IGameScene, runSeed: number) {
        this.scene = scene;
        this.runSeed = runSeed;
    }

    /**
     * Starts the next wave. If already active, appends to queue and adds bonus.
     */
    public startWave() {
        const nowMs = Date.now();

        // Logic split:
        if (!this.isWaveActive) {
            // Case A: Fresh Start
            this.scene.wave++;
            this.isWaveActive = true;
            this.pendingWaveStarts = 0;

            // Snapshot lives for "Perfect Wave" check (only on fresh start of a sequence)
            this.waveStartLives = this.scene.lives;

            this.generateWave(this.scene.wave);
            EventBus.getInstance().emit(Events.WAVE_STARTED, this.scene.wave);
        } else {
            // Case B: Early Start (Stacking)
            // Give bonus only if cooldown passed to prevent accidental double-clicks
            if (nowMs - this.lastEarlyBonusTime > 500) {
                this.scene.addMoney(CONFIG.ECONOMY.EARLY_WAVE_BONUS);
                this.scene.metrics.trackMoneyEarned(CONFIG.ECONOMY.EARLY_WAVE_BONUS);
                this.scene.showFloatingText(`EARLY! +${CONFIG.ECONOMY.EARLY_WAVE_BONUS}💰`, this.scene.game.width / 2, 300, 'gold');
                this.lastEarlyBonusTime = nowMs;
            }

            this.pendingWaveStarts++;
            this.scene.wave++;
            this.generateWave(this.scene.wave); // Appends to queue WITHOUT clearing

            // Notify UI of new wave number
            EventBus.getInstance().emit(Events.WAVE_STARTED, this.scene.wave);
        }

        this.scene.metrics.trackWaveReached(this.scene.wave);
    }

    public update(dt: number) {
        if (!this.isWaveActive) return;

        // Process Spawn Queue
        if (this.spawnQueue.length > 0) {
            this.spawnTimer += dt;

            // Peek at next enemy
            const nextEntry = this.spawnQueue[0];

            if (this.spawnTimer >= nextEntry.interval) {
                // Time to spawn!
                // FIFO: Remove from head
                const entry = this.spawnQueue.shift()!;
                this.scene.spawnEnemy(entry.type);

                // Sound: Boss Spawn
                if (entry.type.toUpperCase() === 'SPIDER' || entry.type.toUpperCase() === 'TANK') {
                    SoundManager.play('boss_spawn', SoundPriority.HIGH);
                }

                this.spawnTimer = 0;
            }
        } else {
            // If queue is empty AND no enemies alive -> Wave Complete
            if (this.scene.enemies.length === 0) {
                this.endWave();
            }
        }
    }

    private endWave() {
        this.isWaveActive = false;
        EventBus.getInstance().emit(Events.WAVE_COMPLETED, this.scene.wave);

        // Progressive economy
        const reward = CONFIG.ECONOMY.WAVE_BASE_REWARD + (this.scene.wave * CONFIG.ECONOMY.WAVE_SCALING_FACTOR);
        this.scene.addMoney(reward);

        // Perfect wave bonus
        if (this.scene.lives >= this.waveStartLives) {
            this.scene.addMoney(CONFIG.ECONOMY.PERFECT_WAVE_BONUS);
            this.scene.metrics.trackMoneyEarned(CONFIG.ECONOMY.PERFECT_WAVE_BONUS);
            this.scene.showFloatingText(
                `PERFECT! +${CONFIG.ECONOMY.PERFECT_WAVE_BONUS}💰`,
                this.scene.game.width / 2,
                350,
                '#00ffff'
            );
        }

        // Give card reward (for all completed waves since last grant)
        const wavesToReward = this.scene.wave - this.lastCardGivenForWave;
        if (wavesToReward > 0) {
            for (let i = 0; i < wavesToReward; i++) {
                this.scene.giveRandomCard();
            }
            this.lastCardGivenForWave = this.scene.wave;
        }
    }

    public getWaveConfig(waveNum: number): IWaveConfig | null {
        let waveConfig: IWaveConfig | null = null;

        // 1. Try Map Data
        if (this.scene.mapData && this.scene.mapData.waves && this.scene.mapData.waves.length > 0) {
            const idx = Math.min(waveNum - 1, this.scene.mapData.waves.length - 1);
            waveConfig = this.scene.mapData.waves[idx];
        }

        // 2. Fallback to Global Config
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

    /**
     * Generates a wave DETERMINISTICALLY.
     * Normalizes config before processing.
     */
    private generateWave(waveNum: number) {
        const waveConfig = this.getWaveConfig(waveNum);
        if (!waveConfig || !waveConfig.enemies) return;

        // 1. Create ISOLATED RNG
        const waveSeed = (this.runSeed ^ (waveNum * 1664525)) >>> 0;
        const waveRng = new Rng(waveSeed);

        // 2. Normalize and Process Config
        const waveEnemies: SpawnQueueEntry[] = [];

        waveConfig.enemies.forEach((rawGroup: IWaveGroupRaw) => {
            // STRICT MIGRATION: Convert Raw Config to Normalized Group
            const group: IWaveGroup = WaveManager.normalizeWaveGroup(rawGroup);

            for (let i = 0; i < group.count; i++) {
                // Use NORMALIZED baseInterval
                const delay = this.calculateDelay(group.pattern, group.baseInterval, waveRng);

                waveEnemies.push({
                    type: group.type,
                    pattern: group.pattern,
                    interval: delay
                });
            }
        });

        // 3. Shuffle
        waveRng.shuffle(waveEnemies);

        // 4. Append
        this.spawnQueue.push(...waveEnemies);
    }

    /**
     * Pure function to normalize legacy or partial config into strict IWaveGroup
     * Made PUBLIC STATIC to allow ThreatService to use the EXACT same logic
     */
    public static normalizeWaveGroup(raw: IWaveGroupRaw): IWaveGroup {
        // Validation
        if (!raw.type) throw new Error('[WaveManager] Invalid group: missing type');
        if (raw.count <= 0) throw new Error('[WaveManager] Invalid group: count must be > 0');

        // Resolve Pattern
        // Priority: pattern > spawnPattern > default
        const pattern: SpawnPattern = raw.pattern || raw.spawnPattern || 'normal';

        // Resolve Base Interval
        // Priority: baseInterval > spawnRate mapping > default
        let baseInterval = 0.66; // default medium

        if (raw.baseInterval !== undefined) {
            baseInterval = raw.baseInterval;
        } else if (raw.spawnRate) {
            baseInterval = WaveManager.getBaseIntervalFromRate(raw.spawnRate);
        }

        // Clamping (Safety)
        // Prevent near-zero intervals crashing the game or 50s intervals breaking flow
        baseInterval = Math.max(0.05, Math.min(baseInterval, 10.0));

        return {
            type: raw.type,
            count: raw.count,
            baseInterval: baseInterval,
            pattern: pattern
        };
    }

    private calculateDelay(pattern: SpawnPattern, baseInterval: number, rng: Rng): number {
        // Use normalized interval
        const safeBase = baseInterval;

        switch (pattern) {
            case 'normal':
                return safeBase;

            case 'random':
                // ±30% variance
                const variance = safeBase * 0.3;
                const randomOffset = (rng.next() - 0.5) * 2 * variance;
                return Math.max(0.05, safeBase + randomOffset);

            case 'swarm':
                // Fast: 10-25% of base
                const swarmBase = safeBase * 0.15;
                const swarmVariance = swarmBase * 0.5;
                const swarmDelay = swarmBase + rng.next() * swarmVariance;
                return Math.max(0.02, swarmDelay);

            default:
                return safeBase;
        }
    }

    public static getBaseIntervalFromRate(rate: 'fast' | 'medium' | 'slow'): number {
        switch (rate) {
            case 'fast': return 0.4;
            case 'slow': return 1.0;
            case 'medium':
            default: return 0.66;
        }
    }
}
