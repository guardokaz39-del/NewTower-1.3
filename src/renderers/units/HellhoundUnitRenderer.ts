import { UnitRenderer } from './UnitRenderer';
import { CONFIG } from '../../Config';
import type { Enemy } from '../../Enemy';

export class HellhoundUnitRenderer implements UnitRenderer {
    // 🔥 Demonic Palette
    private static readonly OBSIDIAN = '#150505';     // Black rock skin
    private static readonly OBSIDIAN_LIGHT = '#2d1b1b';
    private static readonly MAGMA_CORE = '#ff3d00';   // Bright lava
    private static readonly MAGMA_CRUST = '#bf360c';  // Cooling lava
    private static readonly EYE_FIRE = '#ffff00';     // Intense yellow
    private static readonly CLAW_BONE = '#b0bec5';    // Ash grey claws
    private static readonly MANE_COLOR = '#ff1744';   // Fire/Energy Mane

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.001;
        const runCycle = time * (enemy.baseSpeed * 0.3);
        const isMoving = !enemy.finished && enemy.currentHealth > 0;

        const beastScale = scale * 1.1;

        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';
        const r = rotation;
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();

        if (enemy.hitFlashTimer > 0) ctx.filter = 'brightness(500%) sepia(100%) hue-rotate(-50deg)';

        if (facing === 'SIDE') {
            // Standard: Draw facing RIGHT.
            // If rotation indicates Left (< -PI/2 or > PI/2), flip.
            if (Math.abs(rotation) > Math.PI / 2) {
                ctx.scale(-1, 1);
            }
            this.drawSide(ctx, beastScale, runCycle, isMoving, time);
        } else if (facing === 'UP') {
            this.drawBack(ctx, beastScale, runCycle, isMoving, time);
        } else {
            this.drawFront(ctx, beastScale, runCycle, isMoving, time);
        }

        ctx.restore();
    }

    // === SIDE VIEW (Facing RIGHT) ===
    private drawSide(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, t: number) {
        // Reduced tilt for smoother run
        const tilt = isMoving ? Math.sin(cycle) * 0.05 : 0; // Was 0.1
        const vertical = isMoving ? Math.abs(Math.sin(cycle)) * 1 * s : 0; // Reduced bounce

        ctx.translate(0, -vertical);
        ctx.rotate(tilt);

        // 1. Far Legs (Left side of dog, technically)
        const legPhase = Math.PI * 0.2;
        // Front Far
        this.drawLegSide(ctx, 4 * s, 3 * s, cycle, 0 + legPhase, s);
        // Back Far
        this.drawLegSide(ctx, -5 * s, 3 * s, cycle, Math.PI + legPhase, s);

        // 2. Body (Chest Right, Butt Left)
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        // Chest at +X, Butt at -X
        ctx.moveTo(6 * s, -3 * s); // Neck base top
        ctx.bezierCurveTo(8 * s, 0, 4 * s, 5 * s, 2 * s, 1 * s); // Chest / Front Leg joint
        ctx.lineTo(-2 * s, 2 * s); // Belly
        ctx.lineTo(-7 * s, 3 * s); // Butt bottom
        ctx.lineTo(-8 * s, -2 * s); // Tail base
        ctx.bezierCurveTo(-5 * s, -5 * s, 0, -5 * s, 6 * s, -3 * s); // Spine
        ctx.fill();

        // Magma Cracks
        this.drawMagmaCracksSide(ctx, s, t);

        // 3. Mane (Flames) -> Towards Head (Right)
        this.drawManeSide(ctx, 5 * s, -4 * s, s, t);

        // 4. Near Legs
        // Front Near
        this.drawLegSide(ctx, 4 * s, 3 * s, cycle, 0, s);
        // Back Near
        this.drawLegSide(ctx, -5 * s, 3 * s, cycle, Math.PI, s);

        // 5. Head (At Right)
        ctx.save();
        ctx.translate(7 * s, -2 * s);
        ctx.rotate(-tilt * 0.8); // Stabilize head
        this.drawHeadSide(ctx, s, isMoving);
        ctx.restore();

        // 6. Tail (At Left)
        this.drawTail(ctx, -8 * s, -1 * s, cycle, s);

        // 7. Particles (Emit backwards - Left)
        if (isMoving) this.drawEmbers(ctx, -4 * s, 2 * s, s, t, true);
    }

    // === FRONT VIEW ===
    private drawFront(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, t: number) {
        const vertical = isMoving ? Math.abs(Math.sin(cycle)) * 1.5 * s : 0;
        ctx.translate(0, -vertical);

        // Back Legs (Wide stance)
        this.drawLegFront(ctx, -5 * s, 3 * s, cycle, Math.PI, s, true);
        this.drawLegFront(ctx, 5 * s, 3 * s, cycle, 0, s, true);

        // Body (Chest) - More defined
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        // Triangular Chest
        ctx.moveTo(-5 * s, -3 * s);
        ctx.lineTo(5 * s, -3 * s);
        ctx.lineTo(3 * s, 4 * s);
        ctx.lineTo(-3 * s, 4 * s);
        ctx.fill();

        // Magma Core (Burning Heart)
        ctx.fillStyle = HellhoundUnitRenderer.MAGMA_CORE;
        ctx.beginPath();
        ctx.moveTo(-1 * s, -1 * s); ctx.lineTo(1 * s, -1 * s); ctx.lineTo(0, 3 * s);
        ctx.fill();

        // Front Legs (Shoulders) - Straighter
        this.drawLegFront(ctx, -3 * s, 5 * s, cycle, 0, s, false);
        this.drawLegFront(ctx, 3 * s, 5 * s, cycle, Math.PI, s, false);

        // Mane
        this.drawManeFront(ctx, 0, -5 * s, s, t);

        // Head
        ctx.translate(0, -3 * s); // Higher head
        this.drawHeadFront(ctx, s);

        if (isMoving) this.drawEmbers(ctx, 0, 0, s, t, false);
    }

    // === BACK VIEW ===
    private drawBack(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, t: number) {
        const vertical = isMoving ? Math.abs(Math.sin(cycle)) * 1.5 * s : 0;
        ctx.translate(0, -vertical);

        // Front Legs (Visible between back legs)
        this.drawLegFront(ctx, -2 * s, 3 * s, cycle, 0, s, true);
        this.drawLegFront(ctx, 2 * s, 3 * s, cycle, Math.PI, s, true);

        // Hips (Rounder)
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.arc(0, 0, 5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Magma Spine
        ctx.fillStyle = HellhoundUnitRenderer.MAGMA_CRUST;
        ctx.beginPath(); ctx.rect(-1 * s, -5 * s, 2 * s, 5 * s); ctx.fill();

        // Back Legs (Hunches)
        this.drawLegFront(ctx, -4 * s, 6 * s, cycle, Math.PI, s, false);
        this.drawLegFront(ctx, 4 * s, 6 * s, cycle, 0, s, false);

        // Tail
        this.drawTail(ctx, 0, -2 * s, cycle, s);

        // Head/Ears (Behind)
        ctx.translate(0, -4 * s);
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN_LIGHT;
        // Ear silhouette
        ctx.beginPath(); ctx.moveTo(-3 * s, -2 * s); ctx.lineTo(-5 * s, -5 * s); ctx.lineTo(-2 * s, -3 * s); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3 * s, -2 * s); ctx.lineTo(5 * s, -5 * s); ctx.lineTo(2 * s, -3 * s); ctx.fill();

        if (isMoving) this.drawEmbers(ctx, 0, 0, s, t, false);
    }

    // --- COMPONENTS ---

    private drawHeadSide(ctx: CanvasRenderingContext2D, s: number, mouthOpen: boolean) {
        // Correction: Facing RIGHT
        // Skull
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.ellipse(0, -1 * s, 3.5 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        const jawOpen = mouthOpen ? 0.5 : 0;

        // Snout (Forward = +X)
        // Upper Jaw
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.moveTo(1 * s, -2 * s); // Brow
        ctx.lineTo(6 * s, -1 * s - jawOpen * s); // Nose Tip
        ctx.lineTo(6 * s, 1 * s - jawOpen * s); // Teeth Line
        ctx.lineTo(2 * s, 2 * s); // Jaw hinge
        ctx.fill();

        // Lower Jaw
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN_LIGHT;
        ctx.beginPath();
        ctx.moveTo(2 * s, 2 * s);
        ctx.lineTo(5 * s, 2 * s + jawOpen * 2 * s); // Jaw Tip
        ctx.lineTo(1 * s, 3 * s); // Throat
        ctx.fill();

        // Eye (Forward)
        ctx.fillStyle = HellhoundUnitRenderer.EYE_FIRE;
        ctx.shadowBlur = 5; ctx.shadowColor = '#ffeb3b';
        ctx.beginPath(); ctx.arc(1.5 * s, -1.5 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Ear (Back = -X)
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.moveTo(-1 * s, -2 * s);
        ctx.lineTo(-4 * s, -5 * s); // Point back
        ctx.lineTo(-3 * s, -1 * s);
        ctx.fill();
    }

    private drawHeadFront(ctx: CanvasRenderingContext2D, s: number) {
        // Hexagonal Skull
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.moveTo(-3 * s, -4 * s);
        ctx.lineTo(3 * s, -4 * s);
        ctx.lineTo(4 * s, 0);
        ctx.lineTo(2 * s, 4 * s); // Chin
        ctx.lineTo(-2 * s, 4 * s);
        ctx.lineTo(-4 * s, 0);
        ctx.fill();

        // Glowing Eyes
        ctx.fillStyle = HellhoundUnitRenderer.EYE_FIRE;
        ctx.shadowBlur = 8; ctx.shadowColor = '#ffeb3b';
        ctx.beginPath();
        ctx.moveTo(-1 * s, -1 * s); ctx.lineTo(-3 * s, -2 * s); ctx.lineTo(-3 * s, -0.5 * s); ctx.fill(); // Angular Left
        ctx.beginPath();
        ctx.moveTo(1 * s, -1 * s); ctx.lineTo(3 * s, -2 * s); ctx.lineTo(3 * s, -0.5 * s); ctx.fill(); // Angular Right
        ctx.shadowBlur = 0;

        // Snout
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.rect(-1.5 * s, 1 * s, 3 * s, 2 * s);
        ctx.fill();

        // Ears
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath(); ctx.moveTo(-3 * s, -4 * s); ctx.lineTo(-5 * s, -7 * s); ctx.lineTo(-2 * s, -5 * s); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3 * s, -4 * s); ctx.lineTo(5 * s, -7 * s); ctx.lineTo(2 * s, -5 * s); ctx.fill();
    }

    private drawLegSide(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, phase: number, s: number) {
        const angle = Math.cos(cycle + phase) * 0.6;
        const kneeBend = Math.max(0, Math.sin(cycle + phase)) * 1.5;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Thigh
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5 * s, 4 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Calf
        ctx.translate(0, 3 * s);
        ctx.rotate(kneeBend - 0.3);
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN_LIGHT;
        ctx.beginPath();
        // Tapered Leg
        ctx.moveTo(-1 * s, 0); ctx.lineTo(1 * s, 0); ctx.lineTo(0.5 * s, 5 * s); ctx.lineTo(-0.5 * s, 5 * s);
        ctx.fill();

        // Paw
        ctx.translate(0, 5 * s);
        ctx.rotate(-kneeBend + 0.3);
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath(); ctx.ellipse(1 * s, 0, 1.5 * s, 1 * s, 0, 0, Math.PI * 2); ctx.fill(); // Feet point forward (+X)

        ctx.restore();
    }

    private drawLegFront(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, phase: number, s: number, back: boolean) {
        const lift = Math.max(0, Math.sin(cycle + phase)) * 3 * s;
        ctx.save();
        ctx.translate(x, y - lift);

        ctx.fillStyle = back ? HellhoundUnitRenderer.OBSIDIAN_LIGHT : HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.8 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, 4 * s);
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath(); ctx.arc(0, 0, 1.8 * s, 0, Math.PI * 2); ctx.fill();
        // Claws
        ctx.fillStyle = HellhoundUnitRenderer.CLAW_BONE;
        ctx.beginPath(); ctx.rect(-1 * s, 1 * s, 0.5 * s, 1 * s); ctx.rect(0.5 * s, 1 * s, 0.5 * s, 1 * s); ctx.fill();

        ctx.restore();
    }

    private drawTail(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, s: number) {
        const whip = Math.sin(cycle * 2) * 0.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(whip + 2.5); // Extend Back-Left

        ctx.strokeStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.lineWidth = 1.5 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(3 * s, 0, 6 * s, -2 * s);
        ctx.stroke();

        ctx.fillStyle = HellhoundUnitRenderer.MAGMA_CORE;
        ctx.beginPath(); ctx.arc(6 * s, -2 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    private drawMagmaCracksSide(ctx: CanvasRenderingContext2D, s: number, t: number) {
        const alpha = 0.5 + Math.sin(t * 5) * 0.5;
        ctx.strokeStyle = HellhoundUnitRenderer.MAGMA_CORE;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.2 * s;

        ctx.beginPath();
        // Shoulder
        ctx.moveTo(4 * s, -1 * s); ctx.lineTo(2 * s, 1 * s);
        // Flank
        ctx.moveTo(-2 * s, 0); ctx.lineTo(-4 * s, 2 * s);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
    }

    private drawManeSide(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
        ctx.translate(x, y);
        const flicker = Math.sin(t * 15);
        const grad = ctx.createRadialGradient(0, 0, 1 * s, 0, 0, 5 * s);
        grad.addColorStop(0, HellhoundUnitRenderer.MAGMA_CORE);
        grad.addColorStop(1, 'rgba(255, 87, 34, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const angle = 2.5 + i * 0.8 + flicker * 0.1; // Point Backwards
            const len = 5 * s + Math.random() * 2 * s;
            const px = Math.cos(angle) * len;
            const py = Math.sin(angle) * len;
            ctx.lineTo(px, py);
            ctx.lineTo(0, 0);
        }
        ctx.fill();
        ctx.translate(-x, -y);
    }

    private drawManeFront(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
        ctx.fillStyle = HellhoundUnitRenderer.MAGMA_CRUST;
        const flicker = Math.sin(t * 12) * 0.5 * s;
        ctx.beginPath();
        // Spiky collar
        ctx.moveTo(-6 * s, -2 * s);
        ctx.lineTo(0, -6 * s - flicker);
        ctx.lineTo(6 * s, -2 * s);
        ctx.lineTo(0, 1 * s);
        ctx.fill();
    }

    private drawEmbers(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, side: boolean) {
        if (Math.random() > 0.6) return;
        // Trail backwards
        const px = x + (Math.random() - 0.5) * 6 * s - 4 * s;
        const py = y + (Math.random() - 0.5) * 4 * s;

        ctx.fillStyle = HellhoundUnitRenderer.EYE_FIRE;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(px, py, 0.6 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    drawEmissive(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        // Handled in main draw
    }
}
