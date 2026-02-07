import { UnitRenderer } from './UnitRenderer';
import type { Enemy } from '../../Enemy';

export class RatUnitRenderer implements UnitRenderer {
    // 🎨 Darker Alchemical Palette
    private static readonly FUR_COLOR = '#3e2723';       // Dark Chocolate
    private static readonly FUR_LIGHT = '#5d4037';       // Muddy Brown
    private static readonly SKIN_COLOR = '#bcaaa4';      // Pale, Sickly Skin
    private static readonly POISON_GLOW = '#64dd17';     // Toxic Neon Green (Darker shade)
    private static readonly POISON_LIQUID = '#76ff03';   // Bright Core
    private static readonly BARREL_WOOD = '#261b18';     // Burnt Wood
    private static readonly BARREL_RIM = '#4e342e';      // Rusted Iron

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.005;
        const walkCycle = time * (enemy.baseSpeed * 2.5);
        const isMoving = !enemy.finished && enemy.currentHealth > 0;

        // Rat is low to the ground
        const bounce = isMoving ? Math.abs(Math.sin(walkCycle)) * 1 * scale : 0;

        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';
        const r = rotation;
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();
        ctx.translate(0, -bounce);

        // Shake/Wobble Effect for the unstable payload
        if (isMoving) {
            const wobble = Math.sin(time * 15) * 0.05; // Fast jitter
            ctx.rotate(wobble);
        }

        if (facing === 'SIDE') {
            if (Math.abs(rotation) > Math.PI / 2) {
                ctx.scale(-1, 1);
            }
            this.drawSide(ctx, scale, walkCycle, isMoving, time);
        } else if (facing === 'UP') {
            this.drawBack(ctx, scale, walkCycle, isMoving, time);
        } else {
            this.drawFront(ctx, scale, walkCycle, isMoving, time);
        }

        ctx.restore();
    }

    // === FRONT ===
    private drawFront(ctx: CanvasRenderingContext2D, scale: number, walkCycle: number, isMoving: boolean, time: number) {
        // Feet
        const footOff = Math.sin(walkCycle) * 3 * scale;
        this.drawPaw(ctx, -5 * scale, 6 * scale + footOff, scale);
        this.drawPaw(ctx, 5 * scale, 6 * scale - footOff, scale);

        // Body
        ctx.fillStyle = RatUnitRenderer.FUR_COLOR;
        ctx.beginPath(); ctx.ellipse(0, 0, 7 * scale, 6 * scale, 0, 0, Math.PI * 2); ctx.fill();

        // Barrel (Unstable!)
        ctx.save();
        ctx.translate(0, -7 * scale);
        // Liquid Slosh Animation
        const slosh = Math.sin(time * 8) * 0.2;
        ctx.rotate(slosh);

        this.drawBarrel(ctx, scale, true);
        ctx.restore();

        // Head
        ctx.save();
        ctx.translate(0, 1 * scale); // Lower head (hunchback)
        this.drawHeadFront(ctx, scale);
        ctx.restore();
    }

    // === BACK ===
    private drawBack(ctx: CanvasRenderingContext2D, scale: number, walkCycle: number, isMoving: boolean, time: number) {
        // Feet
        const footOff = Math.sin(walkCycle) * 3 * scale;
        this.drawPaw(ctx, -5 * scale, 6 * scale + footOff, scale);
        this.drawPaw(ctx, 5 * scale, 6 * scale - footOff, scale);

        // Tail (Wagging wildly)
        // More complex wave for "rat-like" feel
        const tailWag = Math.sin(time * 10) * 0.4;
        this.drawTail(ctx, 0, 4 * scale, scale, tailWag, true);

        // Body
        ctx.fillStyle = RatUnitRenderer.FUR_COLOR;
        ctx.beginPath(); ctx.ellipse(0, 0, 8 * scale, 7 * scale, 0, 0, Math.PI * 2); ctx.fill();

        // Barrel (Strapped)
        ctx.save();
        ctx.translate(0, -3 * scale);
        const slosh = Math.sin(time * 8) * 0.1;
        ctx.rotate(slosh);
        this.drawBarrel(ctx, scale, false);
        ctx.restore();

        // Ears
        ctx.fillStyle = RatUnitRenderer.SKIN_COLOR;
        ctx.beginPath(); ctx.arc(-6 * scale, -2 * scale, 2.5 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6 * scale, -2 * scale, 2.5 * scale, 0, Math.PI * 2); ctx.fill();
    }

    // === SIDE ===
    private drawSide(ctx: CanvasRenderingContext2D, scale: number, walkCycle: number, isMoving: boolean, time: number) {
        const frontLegA = Math.sin(walkCycle) * 4 * scale;
        const backLegA = Math.sin(walkCycle + Math.PI / 2) * 4 * scale;

        // Back Legs
        this.drawPaw(ctx, -7 * scale + backLegA, 6 * scale, scale);

        // Tail (Trailing with wave)
        // Uses sine wave logic inside drawTail for side view
        this.drawTail(ctx, -9 * scale, 1 * scale, scale, 0, false, time);

        // Body (Hunched)
        ctx.fillStyle = RatUnitRenderer.FUR_COLOR;
        ctx.beginPath();
        ctx.ellipse(0, 1 * scale, 10 * scale, 6 * scale, 0, 0, Math.PI * 2); // Fatter
        ctx.fill();

        // Barrel (Heavy Load)
        ctx.save();
        ctx.translate(-1 * scale, -6 * scale);
        ctx.rotate(-0.2 + Math.sin(time * 10) * 0.05); // Heavy wobble
        this.drawBarrel(ctx, scale, false);
        ctx.restore();

        // Front Legs
        this.drawPaw(ctx, 7 * scale + frontLegA, 6 * scale, scale);

        // Head
        ctx.save();
        ctx.translate(10 * scale, 2 * scale); // Low head
        this.drawHeadSide(ctx, scale);
        ctx.restore();
    }

    // --- PARTS ---

    private drawHeadFront(ctx: CanvasRenderingContext2D, scale: number) {
        // Face
        ctx.fillStyle = RatUnitRenderer.FUR_LIGHT;
        ctx.beginPath();
        ctx.moveTo(-4 * scale, -2 * scale);
        ctx.lineTo(4 * scale, -2 * scale);
        ctx.lineTo(0, 6 * scale);
        ctx.fill();

        // Nose
        ctx.fillStyle = RatUnitRenderer.SKIN_COLOR;
        ctx.beginPath(); ctx.arc(0, 6 * scale, 1.5 * scale, 0, Math.PI * 2); ctx.fill();

        // Ears (Ragged)
        ctx.fillStyle = RatUnitRenderer.SKIN_COLOR;
        ctx.beginPath(); ctx.arc(-6 * scale, -3 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6 * scale, -3 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill();

        // Glowing Toxic Eyes
        ctx.fillStyle = RatUnitRenderer.POISON_GLOW;
        ctx.shadowBlur = 8;
        ctx.shadowColor = RatUnitRenderer.POISON_GLOW;
        ctx.beginPath(); ctx.arc(-2.5 * scale, -0.5 * scale, 1.2 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(2.5 * scale, -0.5 * scale, 1.2 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    private drawHeadSide(ctx: CanvasRenderingContext2D, scale: number) {
        ctx.fillStyle = RatUnitRenderer.FUR_LIGHT;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Long Snout
        ctx.fillStyle = RatUnitRenderer.FUR_LIGHT; // Same color to blend
        ctx.beginPath(); ctx.ellipse(3 * scale, 1 * scale, 3 * scale, 2 * scale, 0, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = RatUnitRenderer.SKIN_COLOR;
        ctx.beginPath(); ctx.arc(6 * scale, 1.5 * scale, 1.5 * scale, 0, Math.PI * 2); ctx.fill(); // Nose

        ctx.beginPath(); ctx.arc(-2 * scale, -3 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill(); // Ear

        // Eye
        ctx.fillStyle = RatUnitRenderer.POISON_GLOW;
        ctx.shadowBlur = 8;
        ctx.shadowColor = RatUnitRenderer.POISON_GLOW;
        ctx.beginPath(); ctx.arc(2 * scale, -1 * scale, 1.3 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    private drawPaw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
        // Более заметные лапки
        ctx.fillStyle = '#d7ccc8'; // Lighter than SKIN_COLOR for visibility
        ctx.strokeStyle = RatUnitRenderer.SKIN_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Larger claws with visible toes
        ctx.moveTo(x - 3 * scale, y + 3 * scale);
        ctx.lineTo(x - 1 * scale, y - 1 * scale);
        ctx.lineTo(x, y + 1 * scale);
        ctx.lineTo(x + 1 * scale, y - 1 * scale);
        ctx.lineTo(x + 3 * scale, y + 3 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    private drawTail(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, angleObs: number, isBack: boolean, time: number = 0) {
        // Более толстый и заметный хвост
        ctx.strokeStyle = '#d7ccc8'; // Lighter for visibility
        ctx.lineWidth = 3.5 * scale; // Thicker
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);

        if (isBack) {
            // Wagging tail from back view - more pronounced
            ctx.quadraticCurveTo(
                x + Math.sin(angleObs) * 12 * scale,
                y + 6 * scale,
                x + Math.sin(angleObs) * 18 * scale,
                y - 3 * scale
            );
        } else {
            // Side view trailing Sine Wave - more visible
            const wave = Math.sin(time * 15) * 4 * scale;
            ctx.quadraticCurveTo(
                x - 6 * scale,
                y + wave,
                x - 15 * scale,
                y + 3 * scale
            );
        }
        ctx.stroke();

        // Tip of tail
        ctx.fillStyle = RatUnitRenderer.SKIN_COLOR;
        const tipX = isBack ? (x + Math.sin(angleObs) * 18 * scale) : (x - 15 * scale);
        const tipY = isBack ? (y - 3 * scale) : (y + 3 * scale);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawBarrel(ctx: CanvasRenderingContext2D, scale: number, glow: boolean) {
        const w = 10 * scale; // Bulky
        const h = 8 * scale;

        // Wood Body
        ctx.fillStyle = RatUnitRenderer.BARREL_WOOD;
        ctx.beginPath();
        ctx.rect(-w / 2, -h / 2, w, h);
        ctx.fill();

        // Metal Bands
        ctx.fillStyle = RatUnitRenderer.BARREL_RIM;
        ctx.fillRect(-w / 2, -h / 2 + 1 * scale, w, 1 * scale);
        ctx.fillRect(-w / 2, h / 2 - 2 * scale, w, 1 * scale);

        // Leak / Liquid
        if (glow) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = RatUnitRenderer.POISON_GLOW;
        }
        ctx.fillStyle = RatUnitRenderer.POISON_LIQUID;
        ctx.beginPath(); ctx.arc(0, 0, 2.5 * scale, 0, Math.PI * 2); ctx.fill(); // Core
        ctx.shadowBlur = 0;

        // Drip
        if (Math.random() < 0.1) {
            // Instant drip visual (simulated)
            ctx.fillStyle = RatUnitRenderer.POISON_LIQUID;
            ctx.beginPath(); ctx.arc(w / 2, h / 2, 1.5 * scale, 0, Math.PI * 2); ctx.fill();
        }

        // Fuse Spark
        const spark = (Date.now() % 100) > 50; // Fast flicker
        if (spark) {
            ctx.fillStyle = '#fff176';
            ctx.beginPath();
            ctx.arc(2 * scale, -h / 2 - 2 * scale, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff3d00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(2 * scale, -h / 2); ctx.lineTo(2 * scale, -h / 2 - 2 * scale); ctx.stroke();
        }
    }
}
