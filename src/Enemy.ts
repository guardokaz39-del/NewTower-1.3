import { CONFIG, getEnemyType } from './Config';
import { Assets } from './Assets';
import { Projectile } from './Projectile';

export interface IEnemyConfig {
    id: string;
    health: number;
    speed: number;
    armor?: number;
    x?: number;
    y?: number;
    path: { x: number; y: number }[];
}

interface IStatus {
    type: 'slow' | 'burn';
    duration: number;
    power: number;
}

export class Enemy {
    public id: string;
    public typeId: string = 'grunt';

    public currentHealth: number;
    public maxHealth: number;
    public baseSpeed: number;
    public armor: number;
    public reward: number = 5; // Reward for killing this enemy

    public x: number;
    public y: number;

    private path: { x: number; y: number }[];
    public pathIndex: number = 0;
    public finished: boolean = false;

    public statuses: IStatus[] = [];
    public damageModifier: number = 1.0;     // Damage multiplier (e.g., 1.2 = +20% damage)
    public killedByProjectile: Projectile | null = null;   // Track what projectile killed this enemy
    public hitFlashTimer: number = 0;        // Timer for white flash on hit

    constructor(config?: IEnemyConfig) {
        if (config) {
            this.init(config);
        }
    }

    public init(config: IEnemyConfig) {
        this.id = config.id;
        this.maxHealth = config.health;
        this.currentHealth = config.health;
        this.baseSpeed = config.speed;
        this.armor = config.armor || 0;

        this.x = config.x || 0;
        this.y = config.y || 0;
        this.path = config.path;
        this.pathIndex = 0;
        this.finished = false;

        this.damageModifier = 1.0;
        this.killedByProjectile = null;
    }

    public reset() {
        this.statuses = [];
        this.hitFlashTimer = 0;
        this.pathIndex = 0;
        this.finished = false;
        this.damageModifier = 1.0;
        this.killedByProjectile = null;
        this.x = -1000; // Move offscreen
        this.y = -1000;
    }

    public setType(id: string) {
        this.typeId = id;
    }

    public takeDamage(amount: number, projectile?: Projectile): void {
        // Apply damage modifier (from slow effects, etc.)
        const modifiedAmount = amount * this.damageModifier;
        const actualDamage = Math.max(1, modifiedAmount - this.armor);
        this.currentHealth -= actualDamage;
        if (this.currentHealth < 0) this.currentHealth = 0;

        // Visual Feedback: Hit Flash
        this.hitFlashTimer = 5; // 5 frames ~ 80ms

        // Track what killed this enemy
        if (!this.isAlive() && projectile) {
            this.killedByProjectile = projectile;
        }
    }

    // ИСПРАВЛЕНИЕ: метод стал public
    public move(): void {
        let speedMod = 1;
        const slow = this.statuses.find((s) => s.type === 'slow');
        if (slow) speedMod -= slow.power;

        const currentSpeed = Math.max(0, this.baseSpeed * speedMod);

        if (this.pathIndex >= this.path.length) {
            this.finished = true;
            return;
        }

        const node = this.path[this.pathIndex];
        const targetX = node.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const targetY = node.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= currentSpeed) {
            this.x = targetX;
            this.y = targetY;
            this.pathIndex++;
        } else {
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * currentSpeed;
            this.y += Math.sin(angle) * currentSpeed;
        }
    }

    public isAlive(): boolean {
        return this.currentHealth > 0;
    }

    public getHealthPercent(): number {
        return this.currentHealth / this.maxHealth;
    }

    public applyStatus(type: 'slow' | 'burn', duration: number, power: number, damageBonus?: number) {
        const existing = this.statuses.find((s) => s.type === type);
        if (existing) {
            existing.duration = duration;
            existing.power = power;
        } else {
            this.statuses.push({ type, duration, power });
        }

        // Apply damage modifier for slowed enemies (Ice level 2+)
        if (type === 'slow' && damageBonus) {
            this.damageModifier = damageBonus;
        }
    }

    public update(): void {
        // Update status durations
        this.statuses = this.statuses.filter((s) => {
            s.duration--;
            return s.duration > 0;
        });

        // Reset damage modifier if no slow status
        if (!this.statuses.some(s => s.type === 'slow')) {
            this.damageModifier = 1.0;
        }

        // Update flash timer
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const safeType = this.typeId ? this.typeId.toLowerCase() : 'grunt';
        const typeConf = getEnemyType(safeType.toUpperCase()) || getEnemyType('GRUNT');

        // Defaults
        const scale = typeConf?.scale || 1.0;
        const archetype = typeConf?.archetype || 'SKELETON';
        const props = typeConf?.props || [];
        const baseColor = typeConf?.color || '#fff';
        const tint = typeConf?.tint;

        ctx.save();
        ctx.translate(this.x, this.y);

        // === ANIMATIONS (Phase 3) ===

        // 1. Rotation towards movement
        if (this.pathIndex < this.path.length - 1) {
            const next = this.path[this.pathIndex];
            const dx = next.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 - this.x;
            const dy = next.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 - this.y;
            const moveAngle = Math.atan2(dy, dx);
            ctx.rotate(moveAngle + Math.PI / 2); // Rotate sprite to face movement direction
        }

        // 2. Breathing (pulsation)
        const breathePhase = (Date.now() * 0.001) + (parseInt(this.id.slice(-3), 36) * 0.5);
        const breatheScale = 1.0 + Math.sin(breathePhase) * 0.03;
        ctx.scale(breatheScale, breatheScale);

        // 3. Movement arc (vertical bob)
        const walkCycle = (Date.now() * 0.01) % (Math.PI * 2);
        const verticalBob = Math.abs(Math.sin(walkCycle)) * 2;
        ctx.translate(0, -verticalBob);

        // -- VISUAL STACK --

        // 1. Shadow Layer
        const shadowImg = Assets.get('shadow_small');
        if (shadowImg) {
            const shadowW = 32 * scale; // Native size 32x16
            const shadowH = 16 * scale;
            ctx.drawImage(shadowImg, -shadowW / 2, -shadowH / 2 + 10 * scale, shadowW, shadowH);
        } else {
            // Fallback
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            const shadowW = 16 * scale;
            const shadowH = 8 * scale;
            ctx.ellipse(0, 10 * scale, shadowW, shadowH, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Body Layer
        const bodyImgName = `enemy_${archetype.toLowerCase()}`;
        const bodyImg = Assets.get(bodyImgName);

        if (bodyImg) {
            const size = 48 * scale;
            const half = size / 2;

            // Draw Body
            ctx.drawImage(bodyImg, -half, -half, size, size);

            // Apply Tint (if defined)
            if (tint) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop'; // Draw only on existing pixels
                ctx.fillStyle = tint;
                ctx.globalAlpha = 0.5; // Tint strength
                ctx.fillRect(-half, -half, size, size);
                ctx.restore();
            }

            // Apply Hit Flash (White)
            if (this.hitFlashTimer > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.8;
                ctx.fillRect(-half, -half, size, size);
                ctx.restore();
            }

            // Apply Status Tints (Ice/Burn)
            // Ice
            if (this.statuses.some(s => s.type === 'slow')) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = '#00e5ff'; // Cyan
                ctx.globalAlpha = 0.4;
                ctx.fillRect(-half, -half, size, size);
                ctx.restore();
            }
            // Burn
            if (this.statuses.some(s => s.type === 'burn')) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = '#ff3d00'; // Orange
                ctx.globalAlpha = 0.4;
                ctx.fillRect(-half, -half, size, size);
                ctx.restore();
            }

        } else {
            // Fallback
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(0, 0, 16 * scale, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Props Layer (Equipmnent)
        if (props.length > 0) {
            props.forEach(propId => {
                const propImg = Assets.get(propId);
                if (propImg) {
                    // Prop specific offsets? For now center them
                    const pSize = 32 * scale;
                    const pHalf = pSize / 2;
                    ctx.drawImage(propImg, -pHalf, -pHalf, pSize, pSize);
                }
            });
        }

        // 3.5. Status Particles Layer (Phase 3)
        // Ice crystals orbiting slowed enemies
        if (this.statuses.some(s => s.type === 'slow')) {
            for (let i = 0; i < 3; i++) {
                const angle = (Date.now() * 0.003) + (i * Math.PI * 2 / 3);
                const orbX = Math.cos(angle) * 20;
                const orbY = Math.sin(angle) * 20;
                ctx.fillStyle = '#4fc3f7'; // Light Blue 300
                ctx.beginPath();
                ctx.arc(orbX, orbY, 3, 0, Math.PI * 2);
                ctx.fill();
                // Inner glow
                ctx.fillStyle = '#e1f5fe'; // Light Blue 50
                ctx.beginPath();
                ctx.arc(orbX, orbY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 4. UI Layer (HP Bar)
        // Only show if damaged
        if (this.currentHealth < this.maxHealth) {
            const barWidth = CONFIG.UI.HP_BAR_WIDTH;
            const barHeight = CONFIG.UI.HP_BAR_HEIGHT;
            const barY = -30 * scale; // Adjust height based on scale

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

            // Health bar
            const hpPercent = this.currentHealth / this.maxHealth;
            let hpColor = '#4caf50'; // green
            if (hpPercent < 0.3) hpColor = '#f44336'; // red
            else if (hpPercent < 0.6) hpColor = '#ff9800'; // orange

            ctx.fillStyle = hpColor;
            ctx.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight);
        }

        ctx.restore();
    }
}
