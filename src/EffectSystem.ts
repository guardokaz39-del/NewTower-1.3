import { Assets } from './Assets';
import { RendererFactory } from './RendererFactory';
import { CONFIG } from './Config';

export interface IEffect {
    type: 'explosion' | 'text' | 'particle' | 'scan' | 'debris' | 'screen_flash' | 'muzzle_flash' | 'scale_pop';
    x: number;
    y: number;
    life: number;
    maxLife?: number;

    // Параметры
    radius?: number;
    size?: number; // Для частиц
    color?: string;
    text?: string;
    vx?: number;
    vy?: number;
    rotation?: number; // Вращение частицы
    vRot?: number; // Скорость вращения
    fontSize?: number; // For custom text size
    gravity?: number; // For debris with gravity
    flashColor?: string; // For screen flash
    enemySprite?: string; // For scale_pop death animation
    enemyColor?: string; // For enemy tint in scale_pop
}

export class EffectSystem {
    private effects: IEffect[] = [];
    private pool: IEffect[] = []; // Object Pool for recycling
    private ctx: CanvasRenderingContext2D;
    private canvasWidth: number;
    private canvasHeight: number;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.canvasWidth = ctx.canvas.width;
        this.canvasHeight = ctx.canvas.height;
    }

    /**
     * Acquire an effect from pool or create new one
     * @performance Reduces GC pressure by reusing objects
     */
    public acquire(type: IEffect['type']): IEffect {
        const effect = this.pool.pop();
        if (effect) {
            // Reset pooled object
            effect.type = type;
            effect.x = 0;
            effect.y = 0;
            effect.life = 0;
            effect.maxLife = undefined;
            effect.radius = undefined;
            effect.size = undefined;
            effect.color = undefined;
            effect.text = undefined;
            effect.vx = undefined;
            effect.vy = undefined;
            effect.rotation = undefined;
            effect.vRot = undefined;
            effect.fontSize = undefined;
            effect.gravity = undefined;
            effect.flashColor = undefined;
            effect.enemySprite = undefined;
            effect.enemyColor = undefined;
            return effect;
        }
        return { type, x: 0, y: 0, life: 0 };
    }

    /**
     * Release effect back to pool
     */
    private release(effect: IEffect): void {
        this.pool.push(effect);
    }

    public add(effect: IEffect) {
        if (!effect.maxLife) effect.maxLife = effect.life;
        this.effects.push(effect);
    }

    /**
     * Add effect using pool (preferred method)
     * @performance Use this instead of add() for better memory efficiency
     */
    public spawn(config: Partial<IEffect> & { type: IEffect['type']; life: number }): IEffect {
        const effect = this.acquire(config.type);
        Object.assign(effect, config);
        if (!effect.maxLife) effect.maxLife = effect.life;
        this.effects.push(effect);
        return effect;
    }

    public get activeEffects(): IEffect[] {
        return this.effects;
    }

    /**
     * Get number of active effects
     */
    public getCount(): number {
        return this.effects.length;
    }

    /**
     * Clear all active effects (for debugging)
     */
    public clear(): void {
        // Return all effects to pool
        for (let i = 0; i < this.effects.length; i++) {
            this.release(this.effects[i]);
        }
        this.effects.length = 0;
    }

    public update(dt: number) {
        // Update all effects
        for (let i = 0; i < this.effects.length; i++) {
            const e = this.effects[i];
            e.life -= dt;

            if (e.type === 'particle' || e.type === 'text' || e.type === 'debris') {
                if (e.vx) e.x += e.vx * dt;
                if (e.vy) e.y += e.vy * dt;

                // Gravity for debris
                if (e.type === 'debris') {
                    if (e.gravity) e.vy = (e.vy || 0) + e.gravity * dt;
                    if (e.vx) {
                        e.vx *= Math.pow(0.3, dt);
                    }
                    if (e.rotation !== undefined && e.vRot) {
                        e.rotation += e.vRot * dt;
                    }
                }
            }
        }

        // In-place removal (backward iteration) - NO NEW ARRAY ALLOCATION
        for (let i = this.effects.length - 1; i >= 0; i--) {
            if (this.effects[i].life <= 0) {
                const dead = this.effects[i];
                // Swap with last and pop
                this.effects[i] = this.effects[this.effects.length - 1];
                this.effects.pop();
                // Return to pool
                this.release(dead);
            }
        }
    }

    public draw() {
        for (let i = 0; i < this.effects.length; i++) {
            const e = this.effects[i];
            // Try Factory first
            if (RendererFactory.drawEffect(this.ctx, e)) {
                continue;
            }

            const progress = e.life / (e.maxLife || 1);

            this.ctx.save();
            this.ctx.globalAlpha = progress;

            if (e.type === 'explosion') {
                const radius = e.radius || 30;
                const time = 1 - progress; // 0 -> 1 over lifetime

                // Layer 1: Expanding shockwave ring
                const ringRadius = radius * (0.3 + time * 0.7);
                const ringWidth = 3 + (1 - time) * 4;
                this.ctx.strokeStyle = e.color || 'rgba(255, 150, 50, 0.8)';
                this.ctx.lineWidth = ringWidth;
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, ringRadius, 0, Math.PI * 2);
                this.ctx.stroke();

                // Layer 2: Inner glow core (shrinking)
                const coreRadius = radius * 0.4 * progress;
                if (coreRadius > 1) {
                    const gradient = this.ctx.createRadialGradient(
                        e.x, e.y, 0,
                        e.x, e.y, coreRadius
                    );
                    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
                    gradient.addColorStop(0.5, e.color || 'rgba(255, 150, 50, 0.6)');
                    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(e.x, e.y, coreRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                // Layer 3: Radial rays (spikes)
                if (progress > 0.3) {
                    const rayCount = 8;
                    const rayLength = radius * 0.6 * progress;
                    this.ctx.strokeStyle = e.color || 'rgba(255, 200, 100, 0.7)';
                    this.ctx.lineWidth = 2;
                    for (let i = 0; i < rayCount; i++) {
                        const angle = (i / rayCount) * Math.PI * 2;
                        const startR = radius * 0.15;
                        this.ctx.beginPath();
                        this.ctx.moveTo(
                            e.x + Math.cos(angle) * startR,
                            e.y + Math.sin(angle) * startR
                        );
                        this.ctx.lineTo(
                            e.x + Math.cos(angle) * rayLength,
                            e.y + Math.sin(angle) * rayLength
                        );
                        this.ctx.stroke();
                    }
                }
            } else if (e.type === 'text') {
                const fontSize = e.fontSize || 16;
                this.ctx.fillStyle = e.color || '#fff';
                this.ctx.font = `bold ${fontSize}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(e.text || '', e.x, e.y);
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = fontSize > 20 ? 3 : 2;
                this.ctx.strokeText(e.text || '', e.x, e.y);
            } else if (e.type === 'particle') {
                // Standard Spark
                this.ctx.fillStyle = e.color || '#fff';
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.radius || 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (e.type === 'debris') {
                // Осколок (квадрат), который крутится и падает
                this.ctx.translate(e.x, e.y);
                if (e.rotation) this.ctx.rotate(e.rotation);
                this.ctx.fillStyle = e.color || '#fff';
                const s = e.size || 4;
                this.ctx.fillRect(-s / 2, -s / 2, s, s);
            } else if (e.type === 'muzzle_flash') {
                // Вспышка на дуле башни
                // If we have a specific image, usage it (color tinting is hard with drawImage without composite)
                // BUT Phase 2 requires colored flashes.
                // Let's rely on procedural gradient for colored flashes unless we have tinted assets.
                // Current asset 'effect_muzzle_flash' is likely yellow/orange.

                // If color is specified, FORCE procedural generation for now to ensure color match
                const useProcedural = !!e.color;

                const img = Assets.get('effect_muzzle_flash');
                if (img && !useProcedural) {
                    const r = e.radius || 12;
                    this.ctx.drawImage(img, e.x - r, e.y - r, r * 2, r * 2);
                } else {
                    const gradient = this.ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius || 12);
                    // Use e.color as the center/core color
                    // Parse color or use default. 
                    // To make a nice gradient we need RGBA.
                    // Simple approach: Use e.color for center, fade to transparent

                    const coreColor = e.color || 'rgba(255, 255, 200, 0.9)';

                    gradient.addColorStop(0, coreColor);
                    gradient.addColorStop(0.4, coreColor); // Solid core
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(e.x, e.y, e.radius || 12, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            } else if (e.type === 'screen_flash') {
                // Flash по краям экрана
                const flashAlpha = progress * 0.4;
                const color = e.flashColor || 'rgba(255, 0, 0, ';
                const gradient = this.ctx.createRadialGradient(
                    this.canvasWidth / 2, this.canvasHeight / 2, 0,
                    this.canvasWidth / 2, this.canvasHeight / 2, Math.max(this.canvasWidth, this.canvasHeight) * 0.7
                );
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
                gradient.addColorStop(1, color + flashAlpha + ')');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            } else if (e.type === 'scale_pop') {
                // Enemy death scale pop
                const scaleProgress = 1 - progress; // Reverse: 0 -> 1
                const scale = 1 + scaleProgress * 0.5; // Scale from 1.0 to 1.5

                if (e.enemySprite) {
                    const img = Assets.get(e.enemySprite);
                    if (img) {
                        this.ctx.save();
                        this.ctx.translate(e.x, e.y);
                        this.ctx.scale(scale, scale);

                        const size = 64;
                        const half = size / 2;
                        this.ctx.drawImage(img, -half, -half, size, size);

                        // Apply tint if available
                        if (e.enemyColor) {
                            this.ctx.globalCompositeOperation = 'source-atop';
                            this.ctx.fillStyle = e.enemyColor;
                            this.ctx.globalAlpha = 0.3 * progress;
                            this.ctx.fillRect(-half, -half, size, size);
                        }

                        this.ctx.restore();
                    }
                }
            }

            this.ctx.restore();
        }
    }
}
