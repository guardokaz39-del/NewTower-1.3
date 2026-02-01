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
    private ctx: CanvasRenderingContext2D;
    private canvasWidth: number;
    private canvasHeight: number;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.canvasWidth = ctx.canvas.width;
        this.canvasHeight = ctx.canvas.height;
    }

    public add(effect: IEffect) {
        if (!effect.maxLife) effect.maxLife = effect.life;
        this.effects.push(effect);
    }

    public get activeEffects(): IEffect[] {
        return this.effects;
    }

    public update(dt: number) {
        this.effects.forEach((e) => {
            e.life -= dt;

            if (e.type === 'particle' || e.type === 'text' || e.type === 'debris') {
                if (e.vx) e.x += e.vx * dt;
                if (e.vy) e.y += e.vy * dt;

                // Gravity for debris
                // Gravity for debris
                if (e.type === 'debris') {
                    if (e.gravity) e.vy = (e.vy || 0) + e.gravity * dt;
                    if (e.vx) {
                        // Drag: 0.98 per frame approx means ~30% remaining after 1 sec
                        // pow(0.3, dt) is a good approximation for framerate independent damping
                        e.vx *= Math.pow(0.3, dt);
                    }
                    // Rotation
                    if (e.rotation !== undefined && e.vRot) {
                        // Assuming vRot is now passed in radians/sec
                        e.rotation += e.vRot * dt;
                    }
                }
            }
        });

        this.effects = this.effects.filter((e) => e.life > 0);
    }

    public draw() {
        this.effects.forEach((e) => {
            // Try Factory first
            if (RendererFactory.drawEffect(this.ctx, e)) {
                return;
            }

            const progress = e.life / (e.maxLife || 1);

            this.ctx.save();
            this.ctx.globalAlpha = progress;

            if (e.type === 'explosion') {
                this.ctx.fillStyle = e.color || 'orange';
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.radius || 30, 0, Math.PI * 2);
                this.ctx.fill();
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
                // Вспышка на дуле башни - BAKED
                const img = Assets.get('effect_muzzle_flash');
                if (img) {
                    const r = e.radius || 12;
                    this.ctx.drawImage(img, e.x - r, e.y - r, r * 2, r * 2);
                } else {
                    const gradient = this.ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius || 12);
                    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
                    gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.5)');
                    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
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
        });
    }
}
