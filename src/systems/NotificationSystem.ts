import { EffectSystem } from '../EffectSystem';
import { EventBus, Events } from '../EventBus';
import { SoundManager, SoundPriority } from '../SoundManager';

/**
 * NotificationSystem - Visual notifications for game events
 * Wave start, wave clear, boss spawn, etc.
 */
export class NotificationSystem {
    private effects: EffectSystem;
    private canvas: HTMLCanvasElement;

    // Active notifications queue
    private notifications: INotification[] = [];

    constructor(effects: EffectSystem, canvas: HTMLCanvasElement) {
        this.effects = effects;
        this.canvas = canvas;

        this.initSubscriptions();
    }

    private initSubscriptions() {
        const bus = EventBus.getInstance();

        bus.on(Events.WAVE_STARTED, (wave: number) => {
            this.showWaveStart(wave);
        });

        bus.on(Events.WAVE_COMPLETED, (wave: number) => {
            this.showWaveClear(wave);
        });
    }

    /**
     * Wave Start notification - big zoom-in text
     */
    public showWaveStart(waveNum: number) {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // Main wave text with zoom effect
        this.effects.add({
            type: 'text',
            text: `WAVE ${waveNum}`,
            x: cx,
            y: cy,
            life: 90,
            color: '#fff',
            fontSize: 48,
            vy: 0
        });

        // Subtitle
        this.effects.add({
            type: 'text',
            text: 'INCOMING',
            x: cx,
            y: cy + 50,
            life: 70,
            color: '#ff5722',
            fontSize: 24,
            vy: 0
        });

        // Screen flash (red tint)
        this.effects.add({
            type: 'screen_flash',
            x: 0,
            y: 0,
            life: 25,
            flashColor: 'rgba(255, 50, 50, '
        });

        // Sound
        SoundManager.play('boss_spawn', SoundPriority.HIGH);
    }

    /**
     * Wave Clear notification - gold flash + confetti
     */
    public showWaveClear(waveNum: number) {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // Victory text
        this.effects.add({
            type: 'text',
            text: 'WAVE CLEARED!',
            x: cx,
            y: cy - 30,
            life: 80,
            color: '#ffd700',
            fontSize: 36,
            vy: -0.5
        });

        // Gold screen flash
        this.effects.add({
            type: 'screen_flash',
            x: 0,
            y: 0,
            life: 20,
            flashColor: 'rgba(255, 215, 0, '
        });

        // Confetti particles
        this.spawnConfetti(cx, cy);

        // Sound
        SoundManager.play('click', SoundPriority.HIGH);
    }

    /**
     * Boss Spawn notification - dramatic darkening + spotlight
     */
    public showBossSpawn(bossName: string, x: number, y: number) {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // Warning text
        this.effects.add({
            type: 'text',
            text: '⚠️ BOSS ⚠️',
            x: cx,
            y: cy - 100,
            life: 120,
            color: '#ff0000',
            fontSize: 42,
            vy: 0
        });

        // Boss name
        this.effects.add({
            type: 'text',
            text: bossName.toUpperCase(),
            x: cx,
            y: cy - 50,
            life: 100,
            color: '#fff',
            fontSize: 28,
            vy: 0
        });

        // Dark flash
        this.effects.add({
            type: 'screen_flash',
            x: 0,
            y: 0,
            life: 40,
            flashColor: 'rgba(0, 0, 0, '
        });

        // Sound
        SoundManager.play('boss_spawn', SoundPriority.HIGH);
    }

    /**
     * Spawn confetti particles
     */
    private spawnConfetti(cx: number, cy: number) {
        const colors = ['#ffd700', '#ff5722', '#4caf50', '#2196f3', '#e91e63'];

        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.effects.add({
                type: 'particle',
                x: cx + (Math.random() - 0.5) * 100,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2, // Bias upward
                life: 40 + Math.random() * 30,
                color: color,
                radius: 3 + Math.random() * 3
            });
        }
    }

    /**
     * Custom notification (for special events)
     */
    public showCustom(text: string, color: string = '#fff', duration: number = 60) {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        this.effects.add({
            type: 'text',
            text: text,
            x: cx,
            y: cy,
            life: duration,
            color: color,
            fontSize: 32,
            vy: -0.5
        });
    }
}

interface INotification {
    type: 'wave_start' | 'wave_clear' | 'boss_spawn' | 'custom';
    text: string;
    life: number;
    maxLife: number;
}
