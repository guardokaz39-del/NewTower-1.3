import { EventBus, Events } from '../EventBus';
import { Enemy } from '../Enemy';
import { getEnemyType } from '../Config';

export class AcidPuddle {
    x: number;
    y: number;
    radius: number;
    duration: number;
    healTimer: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.radius = 25; // Smaller, concentrated puddle
        this.duration = 5.0; // 5 seconds
        this.healTimer = 0;
    }

    update(dt: number, enemies: Enemy[]) {
        this.duration -= dt;
        this.healTimer += dt;

        // Heal every 0.5 seconds
        if (this.healTimer >= 0.5) {
            this.healTimer = 0;
            const healAmountPercent = 0.03;

            enemies.forEach((e) => {
                if (!e.isAlive() || e.finished) return;

                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                if (dist < this.radius) {
                    // Heal 3% of MAX HP
                    const heal = e.maxHealth * healAmountPercent;
                    if (e.currentHealth < e.maxHealth) {
                        e.currentHealth = Math.min(e.maxHealth, e.currentHealth + heal);
                        // Visual feedback maybe?
                    }
                }
            });
        }
    }

    isExpired(): boolean {
        return this.duration <= 0;
    }
}

export class AcidPuddleSystem {
    private puddles: AcidPuddle[] = [];
    private ctx: CanvasRenderingContext2D;
    private unsubDied: () => void;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        // Listen for enemy deaths
        this.unsubDied = EventBus.getInstance().on(Events.ENEMY_DIED, this.onEnemyDied.bind(this));
    }

    public destroy() {
        if (this.unsubDied) this.unsubDied();
    }

    private onEnemyDied(data: { enemy: Enemy }) {
        const enemy = data.enemy;
        if (!enemy) return;

        // Try lookup with Upper Case (Config often uses upper keys but ID property might be lower)
        const typeKey = enemy.typeId.toUpperCase();
        let config = getEnemyType(typeKey);

        // Fallback for strict ID match if upper fails
        if (!config) config = getEnemyType(enemy.typeId);

        if (config && config.archetype === 'SPIDER') {
            this.spawnPuddle(enemy.x, enemy.y);
        }
    }

    public spawnPuddle(x: number, y: number) {
        this.puddles.push(new AcidPuddle(x, y));
    }

    public update(dt: number, enemies: Enemy[]) {
        for (const puddle of this.puddles) {
            puddle.update(dt, enemies);
        }
        // Remove expired
        this.puddles = this.puddles.filter((p) => !p.isExpired());
    }

    public draw() {
        if (this.puddles.length === 0) return;

        this.ctx.save();

        // Toxic Sludge Colors
        const LIQUID_COLOR = '#33691e'; // Dark swampy base
        const LIQUID_MID = '#64dd17'; // Poison green mid
        const LIQUID_HIGHLIGHT = '#ccff90'; // Pale toxic top

        for (const p of this.puddles) {
            const time = Date.now() * 0.001;
            const remaining = p.duration;

            // Fade out
            let globalAlpha = 1.0;
            if (remaining < 1.0) globalAlpha = remaining;
            this.ctx.globalAlpha = globalAlpha * 0.85;

            // Generate deterministic shape based on position (seed)
            // We want it to look "splattered", not round.
            // Technique: Draw 3-5 overlapping "blobs" with different distortions

            const seed = p.x + p.y; // Static seed for this puddle
            const numBlobs = 3 + (Math.floor(seed) % 3); // 3 to 5 blobs

            this.ctx.translate(p.x, p.y);

            // Draw Blobs
            for (let i = 0; i < numBlobs; i++) {
                const angle = (i / numBlobs) * Math.PI * 2 + seed;
                const dist = (seed % 10) + 5; // Offset from center
                const bx = Math.cos(angle) * dist;
                const by = Math.sin(angle) * dist;

                // Blob Radius
                const br = p.radius * (0.6 + Math.sin(seed * i) * 0.2);

                // Draw distorted blob
                this.ctx.fillStyle = i % 2 === 0 ? LIQUID_COLOR : LIQUID_MID;
                this.ctx.beginPath();

                const segments = 12;
                for (let j = 0; j <= segments; j++) {
                    const theta = (j / segments) * Math.PI * 2;
                    // High frequency noise for "jagged liquid" edge
                    const noise = Math.sin(theta * 6 + time * 2) * 0.1;
                    const staticNoise = Math.cos(theta * 4 + seed) * 0.2;

                    const r = br * (1 + noise + staticNoise);
                    const px = bx + Math.cos(theta) * r;
                    const py = by + Math.sin(theta) * r;

                    if (j === 0) this.ctx.moveTo(px, py);
                    else this.ctx.lineTo(px, py);
                }
                this.ctx.fill();
            }

            // Bubbles (Popping)
            // Draw bubbles ON TOP
            const numBubbles = 2 + (Math.floor(time * 2) % 3);
            this.ctx.fillStyle = LIQUID_HIGHLIGHT;
            for (let k = 0; k < numBubbles; k++) {
                const bAngle = (time + k) * 2;
                const bDist = (Math.sin(time * 3 + k) + 1) * p.radius * 0.4;
                const bx = Math.cos(bAngle) * bDist;
                const by = Math.sin(bAngle) * bDist;
                const bSize = 2 + Math.sin(time * 10 + k) * 1.5;
                if (bSize > 0.5) {
                    this.ctx.beginPath();
                    this.ctx.arc(bx, by, bSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }

            this.ctx.translate(-p.x, -p.y);
        }
        this.ctx.restore();
    }
}
