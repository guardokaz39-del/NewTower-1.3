import { Assets } from './Assets';
import { RendererFactory } from './RendererFactory';
import { CONFIG } from './Config';
import { PerformanceMonitor } from './utils/PerformanceMonitor';

export enum EffectPriority {
    HIGH = 1, // Gameplay critical (Explosions, Muzzle Flash) - Budget: 400
    MEDIUM = 2, // Feedback (Damage Text, Status) - Budget: 200
    LOW = 3 // Cosmetic (Smoke, Debris, Sparks) - Budget: 200
}

export interface IEffect {
    type: 'explosion' | 'text' | 'particle' | 'scan' | 'debris' | 'screen_flash' | 'muzzle_flash' | 'scale_pop';
    x: number;
    y: number;
    life: number;
    maxLife?: number;
    priority?: EffectPriority; // Default: LOW

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

    // Budgeting Limits
    private static LIMIT_HIGH = 400;
    private static LIMIT_MEDIUM = 200;
    private static LIMIT_LOW = 200;

    // Static Gradient Cache
    private static gradientCache: Map<string, HTMLCanvasElement> = new Map();

    // Helper to get cached gradient
    private static getCachedGradient(colorStart: string, colorEnd: string, size: number): HTMLCanvasElement {
        const key = `${colorStart}_${colorEnd}_${size}`;
        if (!this.gradientCache.has(key)) {
            const cvs = document.createElement('canvas'); // Not attached to DOM, lightweight
            cvs.width = size * 2;
            cvs.height = size * 2;
            const ctx = cvs.getContext('2d');
            if (ctx) {
                const g = ctx.createRadialGradient(size, size, 0, size, size, size);
                g.addColorStop(0, colorStart);
                g.addColorStop(1, colorEnd);
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, size * 2, size * 2);
            }
            this.gradientCache.set(key, cvs);
        }
        return this.gradientCache.get(key)!;
    }

    // Static Sprite Cache
    private static spriteCache: Map<string, HTMLCanvasElement> = new Map();

    private static getSprite(type: 'ring' | 'rays'): HTMLCanvasElement {
        if (!this.spriteCache.has(type)) {
            const size = 64;
            const cvs = document.createElement('canvas');
            cvs.width = size;
            cvs.height = size;
            const ctx = cvs.getContext('2d');
            if (!ctx) return cvs;

            const center = size / 2;

            if (type === 'ring') {
                // High quality ring
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(center, center, 28, 0, Math.PI * 2);
                ctx.stroke();
                // Add glow to ring
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 6;
                ctx.stroke();
            } else if (type === 'rays') {
                // Starburst rays
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                const count = 8;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(center + Math.cos(angle) * 10, center + Math.sin(angle) * 10);
                    ctx.lineTo(center + Math.cos(angle) * 30, center + Math.sin(angle) * 30);
                    ctx.stroke();
                }
            }
            this.spriteCache.set(type, cvs);
        }
        return this.spriteCache.get(type)!;
    }

    private static getGradientSprite(color: 'orange' | 'cyan'): HTMLCanvasElement {
        if (!this.spriteCache.has(color)) {
            const size = 64;
            const cvs = document.createElement('canvas');
            cvs.width = size;
            cvs.height = size;
            const ctx = cvs.getContext('2d');
            if (ctx) {
                const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
                if (color === 'orange') {
                    g.addColorStop(0, 'rgba(255, 255, 200, 1)');
                    g.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)');
                    g.addColorStop(1, 'rgba(255, 0, 0, 0)');
                } else {
                    g.addColorStop(0, 'rgba(225, 255, 255, 1)');
                    g.addColorStop(0.5, 'rgba(0, 200, 255, 0.8)');
                    g.addColorStop(1, 'rgba(0, 0, 255, 0)');
                }
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, size, size);
            }
            this.spriteCache.set(color, cvs);
        }
        return this.spriteCache.get(color)!;
    }

    // Current counts
    private countHigh = 0;
    private countMedium = 0;
    private countLow = 0;

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
            effect.priority = EffectPriority.LOW; // Default reset
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
        return { type, x: 0, y: 0, life: 0, priority: EffectPriority.LOW };
    }

    /**
     * Release effect back to pool
     */
    private release(effect: IEffect): void {
        this.pool.push(effect);
    }

    public add(effect: IEffect) {
        // Enforce priority check if not already set (legacy calls)
        if (!effect.priority) effect.priority = EffectPriority.LOW;

        // Perform Check
        if (!this.canSpawn(effect.priority, effect.x, effect.y, effect.type)) {
            // Immediately pool it back if rejected (if it came from acquire)
            // But wait, 'add' usually takes a created object.
            // If we reject it here, the caller loses reference and it's GC'd.
            // That's fine for now.
            return;
        }

        if (!effect.maxLife) effect.maxLife = effect.life;

        this.effects.push(effect);
        this.incrementCount(effect.priority);
    }

    /**
     * Add effect using pool (preferred method)
     * @performance Use this instead of add() for better memory efficiency
     */
    public spawn(config: Partial<IEffect> & { type: IEffect['type']; life: number }): IEffect | null {
        // 1. Check if we SHOULD spawn
        const priority = config.priority || EffectPriority.LOW;
        const x = config.x || 0;
        const y = config.y || 0;

        if (!this.canSpawn(priority, x, y, config.type)) {
            return null;
        }

        const effect = this.acquire(config.type);
        Object.assign(effect, config);
        // Ensure priority is set from config or default
        effect.priority = priority;

        if (!effect.maxLife) effect.maxLife = effect.life;

        this.effects.push(effect);
        this.incrementCount(priority);

        return effect;
    }

    /**
     * Intelligent Spawn Logic (LOD + Culling + Budget)
     */
    private canSpawn(priority: EffectPriority, x: number, y: number, type: string): boolean {
        // 1. Spatial Culling (Skip if off-screen)
        // Global effects (screen_flash) ignore this
        if (type !== 'screen_flash') {
            const margin = 50;
            if (x < -margin || x > this.canvasWidth + margin ||
                y < -margin || y > this.canvasHeight + margin) {
                return false;
            }
        }

        // 2. Dynamic LOD based on FPS
        const fps = PerformanceMonitor.getFps();

        // Critical Performance (< 30 FPS): BLOCK Low & Medium
        if (fps < 30 && priority !== EffectPriority.HIGH) {
            return false;
        }

        // Low Performance (< 45 FPS): BLOCK Low
        if (fps < 45 && priority === EffectPriority.LOW) {
            return false;
        }

        // 3. Budget Check
        if (priority === EffectPriority.HIGH) {
            // High priority usually spawns, but let's keep sane limit (800 total?)
            // We implement "recycle oldest" later if needed, for now soft cap
            return this.countHigh < EffectSystem.LIMIT_HIGH;
        } else if (priority === EffectPriority.MEDIUM) {
            return this.countMedium < EffectSystem.LIMIT_MEDIUM;
        } else {
            return this.countLow < EffectSystem.LIMIT_LOW;
        }
    }

    private incrementCount(priority: EffectPriority) {
        if (priority === EffectPriority.HIGH) this.countHigh++;
        else if (priority === EffectPriority.MEDIUM) this.countMedium++;
        else this.countLow++;
    }

    private decrementCount(priority: EffectPriority) {
        if (priority === EffectPriority.HIGH) this.countHigh--;
        else if (priority === EffectPriority.MEDIUM) this.countMedium--;
        else this.countLow--;
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
        this.countHigh = 0;
        this.countMedium = 0;
        this.countLow = 0;
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

                // Track count cleanup
                this.decrementCount(dead.priority || EffectPriority.LOW);

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
                    // OPTIMIZED: Use cached gradient
                    const colorCore = 'rgba(255, 255, 200, 0.9)';
                    const colorFade = 'rgba(255, 100, 0, 0)';

                    // We can bake the color into the cache based on e.color if needed, 
                    // but for now let's use a generic warm glow + composite if possible, 
                    // or just cache specific colors.

                    // Let's use the explicit color from effect or default:
                    const mainColor = e.color || 'rgba(255, 150, 50, 0.6)';

                    // Draw using cache
                    // Note: We cache a generic white glow and tint it? 
                    // Canvas doesn't support easy tinting without composite overhead.
                    // Better to cache specific common colors: Fire (Orange), Ice (Cyan).

                    // For now, let's cache the exact gradient needed for this effect frame? No, that's too many.
                    // Cache the BASE gradient at fixed large size, then drawImage with scale.
                    const cacheSize = 64;
                    const cachedParams = e.color ? e.color : 'orange';
                    // Simple key based on color. We assume standard fade to transparent.

                    const glowCanvas = EffectSystem.getCachedGradient(
                        'rgba(255, 255, 255, 0.9)', // White core
                        'rgba(255, 255, 255, 0)',   // Transparent edge
                        cacheSize
                    );

                    this.ctx.save();
                    this.ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow
                    // Apply tint via color (if we used white gradient) -> actually lighter blends colors.
                    // If we want colored glow, we should better cache colored gradients or use fillStyle.

                    // Let's rely on cached colored gradients for main types.
                    const isIce = e.color && e.color.includes('0, 188, 212');
                    const startColor = isIce ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 200, 50, 0.8)';
                    const endColor = isIce ? 'rgba(0, 100, 255, 0)' : 'rgba(255, 50, 0, 0)';

                    const specificGlow = EffectSystem.getCachedGradient(startColor, endColor, 32);

                    this.ctx.drawImage(
                        specificGlow,
                        e.x - coreRadius,
                        e.y - coreRadius,
                        coreRadius * 2,
                        coreRadius * 2
                    );
                    this.ctx.restore();
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

                // OPTIMIZATION: Only stroke text for High Priority (Crits)
                if (e.priority === EffectPriority.HIGH) {
                    this.ctx.strokeStyle = 'black';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeText(e.text || '', e.x, e.y);
                }
            } else if (e.type === 'particle') {
                // Standard Spark - OPTIMIZED to fillRect for small particles
                this.ctx.fillStyle = e.color || '#fff';
                const r = e.radius || 2;
                if (r < 3) {
                    // Faster than arc
                    this.ctx.fillRect(e.x - r, e.y - r, r * 2, r * 2);
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
                    this.ctx.fill();
                }
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
                    // OPTIMIZED: Use cached gradient for muzzle flash
                    // Determine color key
                    const coreColor = e.color || 'rgba(255, 255, 200, 0.9)';
                    const fadeColor = 'rgba(255, 255, 255, 0)';

                    const flashSize = e.radius || 12;
                    const cacheKey = `${coreColor}_${flashSize}`;

                    // Get or create specific cache
                    let flashCanvas = EffectSystem.gradientCache.get(cacheKey);
                    if (!flashCanvas) {
                        flashCanvas = EffectSystem.getCachedGradient(coreColor, fadeColor, flashSize);
                        EffectSystem.gradientCache.set(cacheKey, flashCanvas);
                    }

                    this.ctx.save();
                    this.ctx.globalCompositeOperation = 'lighter';
                    this.ctx.drawImage(
                        flashCanvas,
                        e.x - flashSize,
                        e.y - flashSize
                    );
                    this.ctx.restore();
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
