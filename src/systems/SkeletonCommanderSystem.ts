import { EventBus, Events } from '../EventBus';
import { Enemy } from '../Enemy';
import { getEnemyType } from '../Config';

export class SkeletonCommanderSystem {
    private ctx: CanvasRenderingContext2D;
    private listenersSetup = false;
    private listenerId: number = -1;

    // Visual Effects List
    private buffEffects: Array<{
        startX: number, startY: number,
        target: Enemy, // Reference to living target
        currX: number, currY: number,
        life: number,
        maxLife: number
    }> = [];

    private recentDeaths: Array<{ x: number, y: number, typeId: string }> = [];

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        if (!this.listenersSetup) {
            this.listenerId = EventBus.getInstance().on(Events.ENEMY_DIED, this.onEnemyDied.bind(this));
            this.listenersSetup = true;
        }
    }

    public destroy() {
        if (this.listenerId !== -1) {
            EventBus.getInstance().off(this.listenerId);
            this.listenerId = -1;
        }
        this.listenersSetup = false;
    }

    private onEnemyDied(data: { enemy: Enemy }) {
        const deadEnemy = data.enemy;
        if (!deadEnemy) return;
        this.recentDeaths.push({ x: deadEnemy.x, y: deadEnemy.y, typeId: deadEnemy.typeId });
    }

    public update(dt: number, enemies: Enemy[]) {
        // Process recent deaths
        if (this.recentDeaths.length > 0) {

            // Find Active Commanders
            const commanders = enemies.filter(e => {
                if (!e.isAlive() || e.finished) return false;
                const conf = getEnemyType(e.typeId.toUpperCase()) || getEnemyType(e.typeId);
                return conf && conf.archetype === 'SKELETON_COMMANDER';
            });

            if (commanders.length > 0) {
                for (const death of this.recentDeaths) {
                    const deadConf = getEnemyType(death.typeId.toUpperCase()) || getEnemyType(death.typeId);

                    // Allow Buff from SKELETON or COMMANDER chains
                    const isSkeleton = deadConf && (deadConf.archetype === 'SKELETON' || deadConf.archetype === 'SKELETON_COMMANDER');

                    if (isSkeleton) {
                        // Find CLOSEST Commander within range
                        let bestCmd: Enemy | null = null;
                        let minDist = 192; // Max range (3 tiles)

                        for (const cmd of commanders) {
                            const dist = Math.hypot(cmd.x - death.x, cmd.y - death.y);
                            if (dist < minDist) {
                                minDist = dist;
                                bestCmd = cmd;
                            }
                        }

                        if (bestCmd) {
                            this.spawnSoulEffect(bestCmd, death.x, death.y);
                        }
                    }
                }
            }
            this.recentDeaths = []; // Clear queue
        }

        // Update Effects
        this.buffEffects.forEach(fx => {
            fx.life -= dt;

            // Update target pos
            const tx = fx.target.x;
            const ty = fx.target.y;

            // Move towards target
            const t = 1.0 - (fx.life / fx.maxLife); // 0 to 1
            // Ease out cubic
            const ease = 1 - Math.pow(1 - t, 3);

            fx.currX = fx.startX + (tx - fx.startX) * ease;
            fx.currY = fx.startY + (ty - fx.startY) * ease;

            // If extremely close, trigger impact?
            // We do impact logic in update OR draw. 
            // Logic: Healing happens on impact? Or instantly?
            // User asked: "Soul flies to commander". implies delayed effect.
            // But for gameplay responsiveness, instant heal is safer. 
            // However, let's make heal happen when particle arrives for "correctness".
        });

        // Trigger Heal on arrival (approximate check)
        // Actually, let's keep heal instant for now? No, user wants polish.
        // Let's check for arrival.
        for (let i = this.buffEffects.length - 1; i >= 0; i--) {
            const fx = this.buffEffects[i];
            const dist = Math.hypot(fx.currX - fx.target.x, fx.currY - fx.target.y);
            if (dist < 10 && fx.life > 0) {
                // Arrived!
                this.buffCommander(fx.target);
                fx.life = 0; // End effect
            }
        }

        this.buffEffects = this.buffEffects.filter(fx => fx.life > 0 && fx.target.isAlive() && !fx.target.finished);
    }

    private spawnSoulEffect(target: Enemy, startX: number, startY: number) {
        this.buffEffects.push({
            startX: startX, startY: startY,
            target: target,
            currX: startX, currY: startY,
            life: 0.6, // Faster flight
            maxLife: 0.6
        });
    }

    private buffCommander(cmd: Enemy) {
        // Heal
        const heal = cmd.maxHealth * 0.05; // 5%
        if (cmd.currentHealth < cmd.maxHealth) {
            cmd.currentHealth = Math.min(cmd.maxHealth, cmd.currentHealth + heal);
        }
        // Maybe spawn a "Heal Flash" effect here?
        // Rely on draw() to show impact flash.
    }

    public draw() {
        if (this.buffEffects.length === 0) return;

        this.ctx.save();

        for (const fx of this.buffEffects) {
            // "Soul" Particle flying to Commander
            // Smaller size requested
            this.ctx.fillStyle = '#ffd700'; // Gold Soul
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#ffd700';

            this.ctx.beginPath();
            this.ctx.arc(fx.currX, fx.currY, 2.5, 0, Math.PI * 2); // Smaller (was 4)
            this.ctx.fill();

            // Trail
            this.ctx.shadowBlur = 0;
            this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.moveTo(fx.startX, fx.startY);
            this.ctx.lineTo(fx.currX, fx.currY);
            this.ctx.stroke();

            // Flash on commander (Impact visual)
            // If very close to end of life (arrival)
            if (fx.life < 0.1) {
                this.ctx.globalAlpha = 0.6;
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(fx.target.x, fx.target.y, 12, 0, Math.PI * 2); // Smaller flash
                this.ctx.fill();
            }
        }
        this.ctx.restore();
    }
}
