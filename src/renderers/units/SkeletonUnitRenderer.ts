import { UnitRenderer } from './UnitRenderer';
import type { Enemy } from '../../Enemy';

export class SkeletonUnitRenderer implements UnitRenderer {
    // Palette
    private static readonly BONE_LIGHT = '#e0d0b0';
    private static readonly BONE_DARK = '#a89070';
    private static readonly BONE_OUTLINE = '#5d4037';
    private static readonly RED_GLOW = '#d32f2f';
    private static readonly ARMOR_DARK = '#2d2d2d';
    private static readonly ARMOR_LIGHT = '#546e7a';

    // Config
    private static readonly HEAD_RADIUS = 5.5;

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.001; // Use seconds
        // baseSpeed is ~90 px/sec. 90 * 0.15 = 13.5 rad/sec (~2 steps/sec)
        const walkCycle = time * (enemy.baseSpeed * 0.15);
        const isMoving = !enemy.finished && enemy.currentHealth > 0;

        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';

        // Rotation Logic
        const r = rotation;
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();

        if (facing === 'SIDE') {
            // Flip for Left Facing
            if (Math.abs(rotation) > Math.PI / 2) {
                ctx.scale(-1, 1);
            }
            this.drawSide(ctx, scale, walkCycle, isMoving);
        } else if (facing === 'UP') {
            this.drawBack(ctx, scale, walkCycle, isMoving);
        } else {
            this.drawFront(ctx, scale, walkCycle, isMoving);
        }

        ctx.restore();
    }

    // === FRONT VIEW (Walking Down) ===
    private drawFront(ctx: CanvasRenderingContext2D, scale: number, walkCycle: number, isMoving: boolean) {
        const bounce = isMoving ? Math.abs(Math.sin(walkCycle)) * 2 * scale : 0;

        // Feet
        const leftFootY = isMoving ? Math.sin(walkCycle) * 4 * scale + (8 * scale) : 8 * scale;
        const rightFootY = isMoving ? Math.sin(walkCycle + Math.PI) * 4 * scale + (8 * scale) : 8 * scale;
        this.drawFoot(ctx, -5 * scale, leftFootY, scale);
        this.drawFoot(ctx, 5 * scale, rightFootY, scale);

        ctx.translate(0, -bounce);

        // Torso/Armor (Layer 1 - Behind items)
        this.drawTorsoFront(ctx, scale);

        // Arms (Swaying)
        const armSway = isMoving ? Math.sin(walkCycle) * 0.2 : 0;

        // Left (Shield)
        ctx.save();
        ctx.translate(-11 * scale, 0 + armSway * 5 * scale);
        // Arm Bone
        this.drawBoneArm(ctx, scale, 0);
        // Shield facing camera
        ctx.translate(0, 6 * scale);
        this.drawShieldFront(ctx, scale);
        ctx.restore();

        // Right (Sword)
        ctx.save();
        ctx.translate(11 * scale, 0 - armSway * 5 * scale);
        this.drawBoneArm(ctx, scale, 0);
        ctx.translate(0, 6 * scale);
        this.drawSwordFront(ctx, scale);
        ctx.restore();

        // Head
        ctx.translate(0, -5 * scale); // Neck height
        this.drawSkullFront(ctx, scale);
    }

    // === BACK VIEW (Walking Up) ===
    private drawBack(ctx: CanvasRenderingContext2D, scale: number, walkCycle: number, isMoving: boolean) {
        const bounce = isMoving ? Math.abs(Math.sin(walkCycle)) * 2 * scale : 0;

        // Feet
        const leftFootY = isMoving ? Math.sin(walkCycle) * 4 * scale : 0;
        const rightFootY = isMoving ? Math.sin(walkCycle + Math.PI) * 4 * scale : 0;
        this.drawFoot(ctx, -5 * scale, leftFootY - 2 * scale, scale);
        this.drawFoot(ctx, 5 * scale, rightFootY - 2 * scale, scale);

        ctx.translate(0, -bounce);

        // Arms (Layer 0 - Before Body)
        const armSway = isMoving ? Math.sin(walkCycle) * 0.2 : 0;

        // Left Item (Shield - Back view)
        ctx.save();
        ctx.translate(-11 * scale, 0 - armSway * 5 * scale);
        this.drawBoneArm(ctx, scale, 0);
        ctx.translate(0, 6 * scale);
        this.drawShieldBack(ctx, scale);
        ctx.restore();

        // Right Item (Sword - Back view)
        ctx.save();
        ctx.translate(11 * scale, 0 + armSway * 5 * scale);
        this.drawBoneArm(ctx, scale, 0);
        ctx.translate(0, 6 * scale);
        this.drawSwordBack(ctx, scale);
        ctx.restore();

        // Torso Back 
        this.drawTorsoBack(ctx, scale);

        // Head
        ctx.translate(0, -5 * scale);
        this.drawSkullBack(ctx, scale);
    }

    // === SIDE VIEW (Walking Right) ===
    private drawSide(ctx: CanvasRenderingContext2D, scale: number, walkCycle: number, isMoving: boolean) {
        const bounce = isMoving ? Math.abs(Math.sin(walkCycle)) * 2 * scale : 0;

        // Feet (Scissor)
        const stride = 5 * scale;
        const leftFootX = isMoving ? Math.sin(walkCycle) * stride : 0;
        const rightFootX = isMoving ? -Math.sin(walkCycle) * stride : 0;
        this.drawFoot(ctx, leftFootX, 8 * scale, scale);
        this.drawFoot(ctx, rightFootX, 8 * scale, scale);

        ctx.translate(0, -bounce);

        // Back Arm (Shield) - Behind Torso
        const armSway = isMoving ? Math.cos(walkCycle) * 0.6 : 0;
        ctx.save();
        ctx.translate(-3 * scale, 0 - armSway * 5 * scale);
        ctx.rotate(-0.2); // Angle back
        this.drawBoneArm(ctx, scale, 0);
        ctx.translate(0, 6 * scale);
        // Shield Profile (Edge)
        this.drawShieldSide(ctx, scale);
        ctx.restore();

        // Torso Side
        this.drawTorsoSide(ctx, scale);

        // Front Arm (Sword) - In Front of Torso
        ctx.save();
        ctx.translate(3 * scale, 1 * scale + armSway * 5 * scale);
        ctx.rotate(0.2); // Angle forward
        this.drawBoneArm(ctx, scale, 0);
        ctx.translate(0, 6 * scale);
        this.drawSwordSide(ctx, scale);
        ctx.restore();

        // Head
        ctx.translate(1 * scale, -5 * scale); // Shift fwd slightly
        this.drawSkullSide(ctx, scale);
    }

    // --- BODY PARTS ---

    private drawTorsoFront(ctx: CanvasRenderingContext2D, scale: number) {
        // Ribcage / Armor Plate
        ctx.fillStyle = SkeletonUnitRenderer.ARMOR_DARK;
        ctx.beginPath();
        // Trapezoid shape
        ctx.moveTo(-7 * scale, -7 * scale); // Shoulders
        ctx.lineTo(7 * scale, -7 * scale);
        ctx.lineTo(5 * scale, 5 * scale); // Waist
        ctx.lineTo(-5 * scale, 5 * scale);
        ctx.fill();

        // Rib details
        ctx.strokeStyle = SkeletonUnitRenderer.BONE_LIGHT;
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(-4 * scale, -2 * scale); ctx.lineTo(4 * scale, -2 * scale);
        ctx.moveTo(-3 * scale, 1 * scale); ctx.lineTo(3 * scale, 1 * scale);
        ctx.stroke();
    }

    private drawTorsoBack(ctx: CanvasRenderingContext2D, scale: number) {
        // Spine / Armor Plate
        ctx.fillStyle = SkeletonUnitRenderer.ARMOR_DARK;
        ctx.beginPath();
        ctx.moveTo(-7 * scale, -7 * scale);
        ctx.lineTo(7 * scale, -7 * scale);
        ctx.lineTo(5 * scale, 5 * scale);
        ctx.lineTo(-5 * scale, 5 * scale);
        ctx.fill();

        // Spine details
        ctx.strokeStyle = SkeletonUnitRenderer.BONE_DARK;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.moveTo(0, -6 * scale);
        ctx.lineTo(0, 4 * scale);
        ctx.stroke();
    }

    private drawTorsoSide(ctx: CanvasRenderingContext2D, scale: number) {
        ctx.fillStyle = SkeletonUnitRenderer.ARMOR_DARK;
        ctx.beginPath();
        ctx.ellipse(0, -1 * scale, 4 * scale, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawBoneArm(ctx: CanvasRenderingContext2D, scale: number, angle: number) {
        ctx.strokeStyle = SkeletonUnitRenderer.BONE_LIGHT;
        ctx.lineWidth = 2.5 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 6 * scale);
        ctx.stroke();
    }

    private drawFoot(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = SkeletonUnitRenderer.BONE_DARK;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- HEADS ---

    private drawSkullFront(ctx: CanvasRenderingContext2D, scale: number) {
        const r = SkeletonUnitRenderer.HEAD_RADIUS * scale;
        // Cranium
        ctx.fillStyle = SkeletonUnitRenderer.BONE_LIGHT;
        ctx.beginPath();
        ctx.arc(0, -2 * scale, r, 0, Math.PI * 2);
        ctx.fill();
        // Jaw
        ctx.beginPath();
        ctx.rect(-2.5 * scale, 2 * scale, 5 * scale, 2.5 * scale);
        ctx.fill();

        // Eyes
        const eyeY = 0 * scale;
        const eyeX = 2 * scale;
        const eyeSize = 1.8 * scale;
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(-eyeX, eyeY, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2); ctx.fill();

        // Glow
        ctx.fillStyle = SkeletonUnitRenderer.RED_GLOW;
        const glowSize = 0.6 * scale;
        ctx.beginPath(); ctx.arc(-eyeX, eyeY, glowSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeX, eyeY, glowSize, 0, Math.PI * 2); ctx.fill();
    }

    private drawSkullBack(ctx: CanvasRenderingContext2D, scale: number) {
        const r = SkeletonUnitRenderer.HEAD_RADIUS * scale;
        ctx.fillStyle = SkeletonUnitRenderer.BONE_LIGHT;
        ctx.beginPath();
        ctx.arc(0, -2 * scale, r, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawSkullSide(ctx: CanvasRenderingContext2D, scale: number) {
        const r = SkeletonUnitRenderer.HEAD_RADIUS * scale;
        ctx.fillStyle = SkeletonUnitRenderer.BONE_LIGHT;
        ctx.beginPath();
        ctx.arc(-1 * scale, -2 * scale, r, 0, Math.PI * 2); // Shift back
        ctx.fill();

        // Snout
        ctx.beginPath();
        ctx.fillRect(1 * scale, 0, 3 * scale, 3 * scale);

        // Eye (One)
        const eyeX = 3 * scale;
        const eyeY = -0.5 * scale;
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.ellipse(eyeX, eyeY, 1.5 * scale, 2 * scale, 0, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = SkeletonUnitRenderer.RED_GLOW;
        ctx.beginPath(); ctx.arc(eyeX + 0.5 * scale, eyeY, 0.6 * scale, 0, Math.PI * 2); ctx.fill();
    }

    // --- ITEMS ---

    private drawSwordFront(ctx: CanvasRenderingContext2D, scale: number) {
        // Pointing down/forward
        ctx.fillStyle = '#cfd8dc';
        ctx.beginPath();
        ctx.moveTo(-1 * scale, 0); ctx.lineTo(1 * scale, 0);
        ctx.lineTo(0, 14 * scale);
        ctx.fill();
        // Hilt
        ctx.fillStyle = SkeletonUnitRenderer.ARMOR_LIGHT;
        ctx.fillRect(-3 * scale, -1 * scale, 6 * scale, 1 * scale);
    }

    private drawSwordSide(ctx: CanvasRenderingContext2D, scale: number) {
        // Held forward (horizontalish)
        ctx.save();
        ctx.rotate(-Math.PI / 4); // Angle up slightly
        ctx.fillStyle = '#cfd8dc';
        ctx.fillRect(0, -1 * scale, 14 * scale, 2 * scale); // Blade
        ctx.fillStyle = SkeletonUnitRenderer.ARMOR_LIGHT;
        ctx.fillRect(0, -3 * scale, 2 * scale, 6 * scale); // Guard
        ctx.restore();
    }

    private drawSwordBack(ctx: CanvasRenderingContext2D, scale: number) {
        // Same as front but maybe darker?
        this.drawSwordFront(ctx, scale);
    }

    private drawShieldFront(ctx: CanvasRenderingContext2D, scale: number) {
        ctx.fillStyle = '#5d4037';
        ctx.beginPath(); ctx.arc(0, 3 * scale, 6 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
    }

    private drawShieldSide(ctx: CanvasRenderingContext2D, scale: number) {
        // Thin profile
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.ellipse(0, 3 * scale, 1.5 * scale, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
    }

    private drawShieldBack(ctx: CanvasRenderingContext2D, scale: number) {
        // Back of shield (wood planks, straps)
        ctx.fillStyle = '#3e2723'; // Darker wood
        ctx.beginPath(); ctx.arc(0, 3 * scale, 6 * scale, 0, Math.PI * 2); ctx.fill();
        // Handle strap
        ctx.fillStyle = '#111';
        ctx.fillRect(-2 * scale, 2 * scale, 4 * scale, 2 * scale);
    }
}
