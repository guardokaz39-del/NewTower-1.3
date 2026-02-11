import { UnitRenderer } from './UnitRenderer';
import { CONFIG } from '../../Config';
import type { Enemy } from '../../Enemy';
import { Assets } from '../../Assets';

export class GoblinUnitRenderer implements UnitRenderer {
    // 🎨 Palette (Gritty & Detailed)
    private static readonly SKIN_BASE = '#689f38';  // Olive Green
    private static readonly SKIN_DARK = '#33691e';  // Shadow
    private static readonly CLOTH_RAGS = '#5d4037'; // Dark Leather/Rags
    private static readonly SACK_COLOR = '#8d6e63'; // Loot Sack
    private static readonly METAL_RUST = '#8d6e63'; // Rusty Dagger
    private static readonly METAL_EDGE = '#cfd8dc'; // Sharpened Edge
    private static readonly EYE_COLOR = '#ffeb3b';  // Yellow Eyes

    // BAKING SUPPORT
    drawFrame(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number): void {
        const cycle = t * Math.PI * 2;
        const scale = 1.0;
        const isMoving = true;
        this.drawSide(ctx, scale, cycle, isMoving);
    }

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.001;
        const walkCycle = time * (enemy.baseSpeed * 0.25);

        // 1. Try Cached Sprite
        const t = (walkCycle % (Math.PI * 2)) / (Math.PI * 2);
        const frameIdx = Math.floor(t * 32) % 32;
        const frameKey = `unit_${enemy.typeId}_walk_${frameIdx}`;

        const sprite = Assets.get(frameKey);
        if (sprite) {
            ctx.save();
            ctx.rotate(rotation);
            const size = 96 * scale;
            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);

            // Hit Flash (Source-Atop cheap method)
            if (enemy.hitFlashTimer > 0) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillRect(-size / 2, -size / 2, size, size);
            }

            ctx.restore();
            return;
        }

        // 2. Fallback
        const isMoving = !enemy.finished && enemy.currentHealth > 0;

        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';
        const r = rotation;

        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();

        // NO ctx.filter here. We handle flash inside specific draws or via overlay? 
        // Actually, drawBody calls internal methods.
        // Let's apply a global flash overlay manually if needed, but 'source-atop' only works on what's drawn.
        // For procedural, we might just tint or use globalAlpha.
        // Given complexity, let's skip expensive flash or use basic globalAlpha pulse.
        // Or apply 'lighter' composite for hit.
        if (enemy.hitFlashTimer > 0) {
            ctx.globalAlpha = 0.7; // Simple visual feedback without expensive filter
        }

        if (facing === 'SIDE') {
            if (Math.abs(rotation) > Math.PI / 2) ctx.scale(-1, 1);
            this.drawSide(ctx, scale, walkCycle, isMoving);
        } else if (facing === 'UP') {
            this.drawBack(ctx, scale, walkCycle, isMoving);
        } else {
            this.drawFront(ctx, scale, walkCycle, isMoving);
        }

        ctx.restore();
    }

    // === FRONT VIEW ===
    private drawFront(ctx: CanvasRenderingContext2D, scale: number, walkCycle: number, isMoving: boolean) {
        // Sneaking Bob (Deep)
        const bounce = isMoving ? Math.abs(Math.sin(walkCycle)) * 2 * scale : 0;

        // Feet (Wide Stance, Knees out)
        const kneeOut = 3 * scale;
        const leftLift = isMoving ? Math.max(0, Math.sin(walkCycle)) * 5 * scale : 0;
        const rightLift = isMoving ? Math.max(0, Math.sin(walkCycle + Math.PI)) * 5 * scale : 0;

        ctx.translate(0, -bounce);

        // Legs (Thin & Spindly)
        this.drawLeg(ctx, -5 * scale, 10 * scale - leftLift, scale, -0.2);
        this.drawLeg(ctx, 5 * scale, 10 * scale - rightLift, scale, 0.2);

        // Loincloth / Rags
        ctx.fillStyle = GoblinUnitRenderer.CLOTH_RAGS;
        ctx.beginPath();
        ctx.moveTo(-5 * scale, 4 * scale);
        ctx.lineTo(5 * scale, 4 * scale);
        ctx.lineTo(3 * scale, 10 * scale); // Ragged bottom
        ctx.lineTo(0, 8 * scale);
        ctx.lineTo(-3 * scale, 10 * scale);
        ctx.fill();

        // Torso (Lean & Hunched)
        ctx.fillStyle = GoblinUnitRenderer.SKIN_BASE;
        ctx.beginPath();
        // Narrow chest, wider belly (potbelly?)
        ctx.ellipse(0, 0, 4.5 * scale, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ribs detail
        ctx.strokeStyle = GoblinUnitRenderer.SKIN_DARK;
        ctx.lineWidth = 1 * scale;
        ctx.beginPath(); ctx.moveTo(-2 * scale, -2 * scale); ctx.lineTo(2 * scale, -2 * scale); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3 * scale, 0); ctx.lineTo(3 * scale, 0); ctx.stroke();

        // Arms (Long, dangling)
        const armSway = isMoving ? Math.sin(walkCycle) * 0.4 : 0;
        // Left Arm (Sack Strap?)
        this.drawArm(ctx, -6 * scale, 2 * scale + armSway * 4 * scale, scale, 0.2);
        // Right Arm (Dagger)
        this.drawArm(ctx, 6 * scale, 2 * scale - armSway * 4 * scale, scale, -0.2, true);

        // Head (Low on neck)
        ctx.translate(0, -5 * scale);
        this.drawHeadFront(ctx, scale);
    }

    // === BACK VIEW ===
    private drawBack(ctx: CanvasRenderingContext2D, scale: number, walkCycle: number, isMoving: boolean) {
        const bounce = isMoving ? Math.abs(Math.sin(walkCycle)) * 2 * scale : 0;
        ctx.translate(0, -bounce);

        const leftLift = isMoving ? Math.max(0, Math.sin(walkCycle)) * 5 * scale : 0;
        const rightLift = isMoving ? Math.max(0, Math.sin(walkCycle + Math.PI)) * 5 * scale : 0;

        this.drawLeg(ctx, -5 * scale, 10 * scale - leftLift, scale, -0.2);
        this.drawLeg(ctx, 5 * scale, 10 * scale - rightLift, scale, 0.2);

        // Torso Back
        ctx.fillStyle = GoblinUnitRenderer.SKIN_BASE;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.5 * scale, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Giant Loot Sack (Defining Feature)
        ctx.save();
        const sackBounce = isMoving ? Math.sin(walkCycle * 2) * 1 * scale : 0;
        ctx.translate(0, -2 * scale + sackBounce);
        ctx.rotate(0.1); // Slightly askew

        ctx.fillStyle = GoblinUnitRenderer.SACK_COLOR;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7 * scale, 8 * scale, 0, 0, Math.PI * 2); // Huge sack
        ctx.fill();
        // Patch
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(-3 * scale, 2 * scale, 3 * scale, 3 * scale);
        // Tie at top
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(-2 * scale, -8 * scale, 4 * scale, 2 * scale);
        ctx.restore();

        // Arms visible at sides
        const armSway = isMoving ? Math.sin(walkCycle) * 0.4 : 0;
        this.drawArm(ctx, -7 * scale, 2 * scale - armSway * 4 * scale, scale, 0.3);
        this.drawArm(ctx, 7 * scale, 2 * scale + armSway * 4 * scale, scale, -0.3, true); // Weapon visible?

        // Head Back
        ctx.translate(0, -6 * scale); // Head is in front of sack? No, sack covers back. Head sits on top.
        this.drawHeadBack(ctx, scale);
    }

    // === SIDE VIEW ===
    private drawSide(ctx: CanvasRenderingContext2D, scale: number, walkCycle: number, isMoving: boolean) {
        const bounce = isMoving ? Math.abs(Math.sin(walkCycle)) * 2 * scale : 0;
        ctx.translate(0, -bounce);

        // Sneaky Stride (Stay low)
        const stride = 6 * scale;
        const legX = isMoving ? Math.sin(walkCycle) * stride : 0;
        const liftFar = isMoving && legX > 0 ? Math.sin(walkCycle) * 4 * scale : 0;
        const liftNear = isMoving && legX < 0 ? -Math.sin(walkCycle) * 4 * scale : 0;

        // Crouch legs
        this.drawLeg(ctx, legX, 8 * scale - liftFar, scale, 0);  // Far
        this.drawLeg(ctx, -legX, 8 * scale - liftNear, scale, 0); // Near

        // Body (Hunched Forward Curve)
        ctx.save();
        ctx.rotate(0.4); // Deep lean forward (Sneaking)

        // Sack on back
        ctx.fillStyle = GoblinUnitRenderer.SACK_COLOR;
        ctx.beginPath();
        ctx.ellipse(-4 * scale, -2 * scale, 5 * scale, 7 * scale, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Torso
        ctx.fillStyle = GoblinUnitRenderer.SKIN_BASE;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 * scale, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Arms (Reaching)
        const armSway = isMoving ? Math.cos(walkCycle) * 0.5 : 0;
        this.drawArm(ctx, 4 * scale, 4 * scale + armSway * 5 * scale, scale, -0.4, true);

        // Head (Crane forward)
        ctx.translate(6 * scale, -4 * scale); // Way forward
        this.drawHeadSide(ctx, scale);
    }

    // --- PARTS ---

    private drawLeg(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, ang: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);

        // Thigh
        ctx.fillStyle = GoblinUnitRenderer.SKIN_DARK;
        ctx.beginPath();
        ctx.ellipse(0, -2 * scale, 2 * scale, 4 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shin/Foot (Big foot)
        ctx.fillStyle = GoblinUnitRenderer.SKIN_BASE;
        ctx.beginPath();
        ctx.ellipse(0, 3 * scale, 1.5 * scale, 3 * scale, 0.2, 0, Math.PI * 2); // Skinny shin
        ctx.fill();

        // Foot
        ctx.fillStyle = GoblinUnitRenderer.SKIN_DARK;
        ctx.beginPath();
        ctx.ellipse(1 * scale, 5 * scale, 3 * scale, 1.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private drawArm(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, ang: number, hasWeapon: boolean = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);

        // Long lanky arm
        ctx.fillStyle = GoblinUnitRenderer.SKIN_BASE;
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.5 * scale, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (hasWeapon) {
            ctx.translate(0, 6 * scale); // Hand pos
            // Dagger
            ctx.rotate(0.5); // Point forward
            // Hilt
            ctx.fillStyle = '#4e342e';
            ctx.fillRect(-1 * scale, -1 * scale, 2 * scale, 3 * scale);
            // Guard
            ctx.fillStyle = GoblinUnitRenderer.METAL_RUST;
            ctx.fillRect(-2 * scale, 2 * scale, 4 * scale, 1 * scale);
            // Blade (Jagged)
            ctx.fillStyle = GoblinUnitRenderer.METAL_EDGE;
            ctx.beginPath();
            ctx.moveTo(-1.5 * scale, 3 * scale);
            ctx.lineTo(1.5 * scale, 3 * scale);
            ctx.lineTo(0, 9 * scale); // Long blade
            ctx.fill();
            // Rust spots
            ctx.fillStyle = GoblinUnitRenderer.METAL_RUST;
            ctx.beginPath(); ctx.arc(0, 5 * scale, 1 * scale, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }

    private drawHeadFront(ctx: CanvasRenderingContext2D, scale: number) {
        // Skull
        ctx.fillStyle = GoblinUnitRenderer.SKIN_BASE;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 * scale, 5 * scale, 0, 0, Math.PI * 2); // Tall head
        ctx.fill();

        // Huge Ears (Notched)
        ctx.fillStyle = GoblinUnitRenderer.SKIN_DARK;
        const drawEar = (mirror: number) => {
            ctx.beginPath();
            ctx.moveTo(mirror * 3 * scale, 0);
            ctx.bezierCurveTo(mirror * 10 * scale, -5 * scale, mirror * 12 * scale, 0, mirror * 4 * scale, 4 * scale);
            ctx.fill();
            // Notch
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath(); ctx.arc(mirror * 9 * scale, 0, 1 * scale, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        };
        drawEar(1);
        drawEar(-1);

        // Nose (Long & Crooked)
        ctx.fillStyle = '#558b2f';
        ctx.beginPath();
        ctx.moveTo(0, -1 * scale);
        ctx.lineTo(1.5 * scale, 3 * scale); // Pointy tip
        ctx.lineTo(-1 * scale, 2 * scale);
        ctx.fill();

        // Eyes (Yellow & Mean)
        ctx.fillStyle = GoblinUnitRenderer.EYE_COLOR;
        ctx.beginPath(); ctx.ellipse(-2 * scale, -1 * scale, 1.2 * scale, 0.8 * scale, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(2 * scale, -1 * scale, 1.2 * scale, 0.8 * scale, -0.2, 0, Math.PI * 2); ctx.fill();

        // Pupils
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-2 * scale, -1 * scale, 0.3 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(2 * scale, -1 * scale, 0.3 * scale, 0, Math.PI * 2); ctx.fill();

        // Tooth (Snaggletooth)
        ctx.fillStyle = '#fff9c4';
        ctx.beginPath();
        ctx.moveTo(-1 * scale, 3 * scale); ctx.lineTo(-0.5 * scale, 5 * scale); ctx.lineTo(0, 3 * scale);
        ctx.fill();
    }

    private drawHeadSide(ctx: CanvasRenderingContext2D, scale: number) {
        // Ear (Back)
        ctx.fillStyle = GoblinUnitRenderer.SKIN_DARK;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-6 * scale, -2 * scale); ctx.lineTo(-1 * scale, 3 * scale);
        ctx.fill();

        // Skull
        ctx.fillStyle = GoblinUnitRenderer.SKIN_BASE;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.5 * scale, 5 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Nose Profile
        ctx.fillStyle = '#558b2f';
        ctx.beginPath();
        ctx.moveTo(3 * scale, 0);
        ctx.bezierCurveTo(7 * scale, 1 * scale, 6 * scale, 4 * scale, 3 * scale, 3 * scale);
        ctx.fill();

        // Eye
        ctx.fillStyle = GoblinUnitRenderer.EYE_COLOR;
        ctx.beginPath(); ctx.arc(2 * scale, -1 * scale, 1 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(2.5 * scale, -1 * scale, 0.3 * scale, 0, Math.PI * 2); ctx.fill();
    }

    private drawHeadBack(ctx: CanvasRenderingContext2D, scale: number) {
        // Ears
        ctx.fillStyle = GoblinUnitRenderer.SKIN_DARK;
        ctx.beginPath();
        ctx.moveTo(-3 * scale, 0); ctx.lineTo(-10 * scale, -4 * scale); ctx.lineTo(-4 * scale, 4 * scale); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3 * scale, 0); ctx.lineTo(10 * scale, -4 * scale); ctx.lineTo(4 * scale, 4 * scale); ctx.fill();

        // Head
        ctx.fillStyle = '#33691e'; // Darker back hair/skin
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 * scale, 5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hair wisps?
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath(); ctx.moveTo(0, -5 * scale); ctx.lineTo(-1 * scale, -7 * scale); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -5 * scale); ctx.lineTo(2 * scale, -6 * scale); ctx.stroke();
    }
}
