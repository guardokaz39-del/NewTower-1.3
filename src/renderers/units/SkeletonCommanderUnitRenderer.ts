import { UnitRenderer } from './UnitRenderer';
import { CONFIG } from '../../Config';
import { Assets } from '../../Assets';
import type { Enemy } from '../../Enemy';

export class SkeletonCommanderUnitRenderer implements UnitRenderer {
    // 🎨 AAA PALETTE: Deep, Rich, Metallic
    private static readonly PALETTE = {
        BONE: '#cfd8dc',
        BONE_SHADOW: '#90a4ae',
        ARMOR_BASE: '#212121',     // Obsidian
        ARMOR_DARK: '#1a1a1a',      // Dark Obsidian
        ARMOR_HIGHLIGHT: '#424242', // Specular
        ARMOR_SHADOW: '#000000',    // Ambient Occlusion
        GOLD_LIGHT: '#ffecb3',      // Polished Gold
        GOLD_BASE: '#ffc107',       // Gold
        GOLD_DARK: '#ff6f00',       // Old Gold
        CAPE_BASE: '#b71c1c',       // Royal Crimson
        CAPE_DARK: '#7f0000',       // Fold shadow
        CAPE_HIGHLIGHT: '#e53935',  // Cloth sheen
        SWORD_STEEL: '#eceff1',
        SWORD_DARK: '#37474f',
        MAGIC_GLOW: '#ff3d00'       // Burning Ember Eyes/Runes
    };

    // BAKING SUPPORT
    public getBakeFacings(): ('SIDE' | 'UP' | 'DOWN')[] {
        return ['SIDE', 'UP', 'DOWN'];
    }

    public drawFrameDirectional(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number, facing: 'SIDE' | 'UP' | 'DOWN') {
        const cycle = t * Math.PI * 2;
        const scale = 1.0;
        const s = scale * 1.35;
        const isMoving = true;

        // "Breathing" idle animation approximation for bake
        const breath = Math.sin(t * 10 * 2) * 0.03;
        const time = t * 10;

        // 1. Dynamic Aura (Ground Layer) - Baked or Procedural? 
        // Baking aura into the sprite might be okay if it handles transparency well.
        this.drawAura(ctx, s, time);

        if (facing === 'DOWN') {
            this.drawCapeBack(ctx, s, time, isMoving, facing);
            this.drawFront(ctx, s, cycle, isMoving, breath);
        } else if (facing === 'UP') {
            this.drawBack(ctx, s, cycle, isMoving, breath);
            this.drawCapeBack(ctx, s, time, isMoving, facing);
        } else {
            this.drawCapeBack(ctx, s, time, isMoving, facing);
            this.drawSide(ctx, s, cycle, isMoving, breath);
        }
    }

    drawFrame(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number): void {
        this.drawFrameDirectional(ctx, enemy, t, 'SIDE');
    }

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.001;
        const walkCycle = time * (enemy.baseSpeed * 0.15);

        // 1. Try Cached Sprite
        const t = (walkCycle % (Math.PI * 2)) / (Math.PI * 2);
        const frameIdx = Math.floor(t * 32) % 32;

        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';
        const r = rotation;
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        const facingLeft = Math.cos(rotation) < 0;

        const frameKey = `unit_${enemy.typeId}_${facing.toLowerCase()}_walk_${frameIdx}`;
        const sprite = Assets.get(frameKey);

        if (sprite) {
            ctx.save();
            const size = 96 * scale * 1.5; // Commander is big

            if (facing === 'SIDE') {
                if (facingLeft) ctx.scale(-1, 1);
            }

            // Center sprite
            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);

            // Hit Flash logic
            if (enemy.hitFlashTimer > 0) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillRect(-size / 2, -size / 2, size, size);
            }
            ctx.restore();
            return;
        }

        // 2. Fallback Procedural
        const isMoving = !enemy.finished && enemy.currentHealth > 0;
        const breath = Math.sin(time * 2) * 0.03;
        const s = scale * 1.35;

        ctx.save();

        if (enemy.hitFlashTimer > 0) {
            ctx.globalAlpha = 0.6;
        }

        this.drawAura(ctx, s, time);

        if (facing === 'DOWN') {
            this.drawCapeBack(ctx, s, time, isMoving, facing);
            this.drawFront(ctx, s, walkCycle, isMoving, breath);
        }
        else if (facing === 'SIDE') {
            if (facingLeft) ctx.scale(-1, 1);
            this.drawCapeBack(ctx, s, time, isMoving, facing);
            this.drawSide(ctx, s, walkCycle, isMoving, breath);
        }
        else { // UP
            this.drawBack(ctx, s, walkCycle, isMoving, breath);
            this.drawCapeBack(ctx, s, time, isMoving, facing);
        }

        ctx.restore();
    }

    private drawAura(ctx: CanvasRenderingContext2D, s: number, t: number) {
        const auraImg = Assets.get('fx_boss_aura');
        if (auraImg) {
            ctx.save();
            ctx.scale(1, 0.5);
            const pulse = Math.sin(t * 3) * 0.2 + 0.8;
            const size = 32 * s * pulse;
            ctx.drawImage(auraImg, -size, -size, size * 2, size * 2);
            ctx.restore();
        } else {
            ctx.save();
            ctx.scale(1, 0.5); // Perspective squash
            const r = 18 * s;
            const pulse = Math.sin(t * 3) * 0.2 + 0.8;
            const grad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
            grad.addColorStop(0, 'rgba(255, 111, 0, 0.0)');
            grad.addColorStop(0.7, `rgba(255, 111, 0, ${0.3 * pulse})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    // === SOPHISTICATED CLOTH PHYSICS ===
    private drawCapeBack(ctx: CanvasRenderingContext2D, s: number, t: number, isMoving: boolean, facing: string) {
        const p = SkeletonCommanderUnitRenderer.PALETTE;
        const cycle = t * (isMoving ? 5 : 2); // Flutter speed
        const wind = Math.cos(t * 1.5) * 4 * s;
        const moveSway = isMoving ? Math.sin(cycle) * 6 * s : 0;

        ctx.save();
        ctx.translate(0, -12 * s); // Neck attachment

        if (facing === 'SIDE') {
            ctx.translate(-4 * s, 2 * s); // Attach to shoulder
            ctx.rotate(0.2 + (isMoving ? Math.sin(cycle * 0.5) * 0.1 : 0));
            // Multi-segment cape for fluid look
            ctx.beginPath();
            ctx.moveTo(0, 0);

            // Bezier Control points for "S" curve
            const tipX = -10 * s + moveSway + wind;
            const tipY = 28 * s;

            // Top curve (billow out)
            ctx.bezierCurveTo(-14 * s, 8 * s, -8 * s + moveSway, 18 * s, tipX, tipY);
            // Return edge (straighter)
            ctx.lineTo(4 * s, 4 * s);

            // Gradient Fill
            const grad = ctx.createLinearGradient(0, 0, 0, 30 * s);
            grad.addColorStop(0, p.CAPE_BASE);
            grad.addColorStop(1, p.CAPE_DARK);
            ctx.fillStyle = grad;
            ctx.fill();

        } else {
            // BACK / DOWN logic
            // Start narrow at neck, widen at bottom
            const neckW = 8 * s;
            const hemW = 22 * s;
            const h = 26 * s;
            const sway = moveSway + wind;

            ctx.beginPath();
            ctx.moveTo(-neckW / 2, 0);
            ctx.lineTo(neckW / 2, 0);

            // Complex Hem with folds
            const hemY = h + Math.sin(cycle * 2) * 1 * s;
            const hemX = sway;

            // Left curve
            ctx.bezierCurveTo(neckW + 4 * s, h * 0.4, hemW + hemX, h * 0.8, (hemW / 2) + hemX, hemY);
            // Bottom jagged edge (folds)
            ctx.lineTo(hemX, hemY + 2 * s);
            ctx.lineTo(-(hemW / 2) + hemX, hemY);
            // Right curve
            ctx.bezierCurveTo(-(hemW + hemX), h * 0.8, -(neckW + 4 * s), h * 0.4, -neckW / 2, 0);

            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, p.CAPE_BASE);
            grad.addColorStop(0.5, p.CAPE_BASE);
            grad.addColorStop(1, p.CAPE_DARK);
            ctx.fillStyle = grad;
            ctx.fill();

            // Highlight fold
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hemX, hemY + 2 * s); ctx.lineTo(hemX + 2 * s, hemY + 2 * s); ctx.fill();
        }
        ctx.restore();
    }

    // === FRONT (AGGRESSIVE) ===
    private drawFront(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, breath: number, isBackLayer: boolean = false) {
        if (isBackLayer) return;

        const bounce = Math.abs(Math.sin(cycle)) * 1.5 * s;
        ctx.translate(0, -bounce);

        // -- LEGS (Dynamic Stance) --
        const ly = 12 * s;
        const legSep = 6 * s;
        this.drawLeg(ctx, -legSep, ly, s, 0);
        this.drawLeg(ctx, legSep, ly, s, 0);

        // -- TORSO (Heavy Plate) --
        ctx.save();
        ctx.scale(1 + breath, 1 + breath);

        // Waist
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.ARMOR_DARK;
        ctx.fillRect(-5 * s, 5 * s, 10 * s, 6 * s);
        this.drawGoldTrim(ctx, -5 * s, 5 * s, 10 * s, 2 * s);

        // Chest Plate 
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.ARMOR_BASE;
        ctx.beginPath();
        ctx.moveTo(-9 * s, -12 * s); ctx.lineTo(9 * s, -12 * s);
        ctx.lineTo(6 * s, 6 * s); ctx.lineTo(-6 * s, 6 * s);
        ctx.fill();

        // Chest Detail
        ctx.strokeStyle = SkeletonCommanderUnitRenderer.PALETTE.ARMOR_HIGHLIGHT;
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(-4 * s, -4 * s); ctx.lineTo(4 * s, -4 * s);
        ctx.moveTo(-3 * s, 0); ctx.lineTo(3 * s, 0);
        ctx.stroke();

        // Center Emblem
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.GOLD_BASE;
        ctx.beginPath(); ctx.arc(0, -5 * s, 2 * s, 0, Math.PI * 2); ctx.fill();

        // -- PAULDRONS --
        this.drawPauldron(ctx, -11 * s, -13 * s, s, 1);
        this.drawPauldron(ctx, 11 * s, -13 * s, s, -1);

        ctx.restore();

        // -- HEAD --
        ctx.translate(0, -14 * s + (breath * 5 * s));
        this.drawHelmet(ctx, s);
        ctx.translate(0, 14 * s - (breath * 5 * s));

        // -- ARMS & WEAPON --
        const sway = Math.sin(cycle * 0.5) * 0.1;

        ctx.save();
        ctx.translate(0, -2 * s);
        ctx.rotate(sway);

        ctx.translate(6 * s, 4 * s);

        // Draw Sword
        ctx.save();
        ctx.rotate(-2.2);
        this.drawGreatsword(ctx, 0, -8 * s, s);
        ctx.restore();

        // Right Arm 
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.ARMOR_HIGHLIGHT;
        ctx.lineWidth = 3 * s;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2 * s, -6 * s); ctx.stroke();

        // Left Arm 
        ctx.translate(-5 * s, 2 * s);
        ctx.restore();
    }

    // === SIDE (AGGRESSIVE) ===
    private drawSide(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, breath: number) {
        const bounce = Math.abs(Math.sin(cycle)) * 1.5 * s;
        ctx.translate(0, -bounce);

        // Legs
        const stride = 8 * s;
        const lx = isMoving ? Math.sin(cycle) * stride : -4 * s;
        const rx = isMoving ? -Math.sin(cycle) * stride : 4 * s;
        this.drawLeg(ctx, lx, 12 * s, s, 0);
        this.drawLeg(ctx, rx, 12 * s, s, 0);

        // Body Angle
        ctx.save();
        ctx.rotate(0.1);

        // Torso Side
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.ARMOR_BASE;
        ctx.beginPath();
        ctx.moveTo(-4 * s, -12 * s); ctx.lineTo(6 * s, -11 * s);
        ctx.lineTo(4 * s, 8 * s); ctx.lineTo(-4 * s, 7 * s);
        ctx.fill();

        // Pauldron
        this.drawPauldron(ctx, 0, -12 * s, s, 1);

        // Head
        ctx.translate(2 * s, -14 * s);
        this.drawHelmet(ctx, s);
        ctx.translate(-2 * s, 14 * s);

        // Arms & Weapon
        ctx.translate(4 * s, -2 * s);

        // Arm pointing forward
        const armAngle = -0.5 + Math.sin(cycle) * 0.1;
        ctx.rotate(armAngle);

        // Arm Plate
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.ARMOR_HIGHLIGHT;
        ctx.fillRect(-2 * s, 0, 4 * s, 10 * s);

        // Forearm/Hand
        ctx.translate(0, 10 * s);
        ctx.rotate(-1.0);

        // Gauntlet
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(0, 2 * s, 3 * s, 0, Math.PI * 2); ctx.fill();

        // Sword
        ctx.rotate(-0.5);
        this.drawGreatsword(ctx, 0, -6 * s, s);

        ctx.restore();
    }

    // === BACK ===
    private drawBack(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, breath: number) {
        // Legs
        const ly = 12 * s;
        this.drawLeg(ctx, -5 * s, ly, s, 0);
        this.drawLeg(ctx, 5 * s, ly, s, 0);

        // Helmet Back
        ctx.translate(0, -14 * s);
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.ARMOR_BASE;
        ctx.beginPath(); ctx.arc(0, 0, 6 * s, 0, Math.PI * 2); ctx.fill();
        // Crown Back
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.GOLD_DARK;
        ctx.beginPath();
        ctx.moveTo(-5 * s, 0); ctx.lineTo(-6 * s, -6 * s); ctx.lineTo(-3 * s, -3 * s);
        ctx.moveTo(5 * s, 0); ctx.lineTo(6 * s, -6 * s); ctx.lineTo(3 * s, -3 * s);
        ctx.fill();
    }

    // === COMPONENT LIBRARY ===

    private drawLeg(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, angle: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Thigh / Knee
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.ARMOR_HIGHLIGHT;
        ctx.beginPath();
        ctx.moveTo(-3 * s, -8 * s);
        ctx.lineTo(3 * s, -8 * s);
        ctx.lineTo(2 * s, 2 * s);
        ctx.lineTo(-2 * s, 2 * s);
        ctx.fill();

        // Knee Pad
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.GOLD_BASE;
        ctx.beginPath();
        ctx.moveTo(-3 * s, -4 * s); ctx.lineTo(0, -7 * s); ctx.lineTo(3 * s, -4 * s);
        ctx.lineTo(0, -1 * s);
        ctx.fill();

        // Boot
        ctx.fillStyle = '#0d0d0d';
        ctx.beginPath();
        ctx.ellipse(0, 2 * s, 3.5 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private drawPauldron(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(dir, 1);

        // 3-Tiered Pauldron
        const colors = [
            SkeletonCommanderUnitRenderer.PALETTE.ARMOR_DARK,
            SkeletonCommanderUnitRenderer.PALETTE.ARMOR_BASE,
            SkeletonCommanderUnitRenderer.PALETTE.ARMOR_HIGHLIGHT
        ];

        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            const off = i * 2 * s;
            ctx.arc(0, 0 + off, 6 * s - (i * 1 * s), Math.PI, 0);
            ctx.fill();
        }

        // Gold Trim
        ctx.strokeStyle = SkeletonCommanderUnitRenderer.PALETTE.GOLD_BASE;
        ctx.lineWidth = 2 * s;
        ctx.beginPath(); ctx.arc(0, 4 * s, 4 * s, Math.PI, 0); ctx.stroke();

        // Spike
        ctx.fillStyle = '#eee';
        ctx.beginPath(); ctx.moveTo(-1 * s, -4 * s); ctx.lineTo(0, -10 * s); ctx.lineTo(1 * s, -4 * s); ctx.fill();

        ctx.restore();
    }

    private drawHelmet(ctx: CanvasRenderingContext2D, s: number) {
        // Base
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(0, 0, 6 * s, 0, Math.PI * 2); ctx.fill();

        // Faceplate: T-Visor Design (Dark Knight)
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.ARMOR_HIGHLIGHT;
        ctx.beginPath();
        ctx.moveTo(-6 * s, -2 * s);
        ctx.quadraticCurveTo(0, 8 * s, 6 * s, -2 * s); // Jaw line
        ctx.lineTo(6 * s, -6 * s);
        ctx.quadraticCurveTo(0, -2 * s, -6 * s, -6 * s); // Brow
        ctx.fill();

        // Eye Slit (Glowing)
        const glowImg = Assets.get('fx_glow_red');
        if (glowImg) {
            ctx.drawImage(glowImg, -5 * s, -5 * s, 10 * s, 10 * s);
        } else {
            ctx.shadowBlur = 15;
            ctx.shadowColor = SkeletonCommanderUnitRenderer.PALETTE.MAGIC_GLOW;
        }

        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.MAGIC_GLOW;

        // Single horizontal slit or two eyes? 
        // Two aggressive angular eyes
        ctx.beginPath();
        // Left eye
        ctx.moveTo(-1 * s, 0); ctx.lineTo(-4 * s, -1 * s); ctx.lineTo(-3 * s, 1 * s); ctx.fill();
        // Right eye
        ctx.moveTo(1 * s, 0); ctx.lineTo(4 * s, -1 * s); ctx.lineTo(3 * s, 1 * s); ctx.fill();

        ctx.shadowBlur = 0;

        // Crown (Gold)
        this.drawGoldTrim(ctx, -6 * s, -6 * s, 12 * s, 2 * s); // Brow band
        // Spikes
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.GOLD_BASE;
        ctx.beginPath();
        ctx.moveTo(-5 * s, -6 * s); ctx.lineTo(-6 * s, -12 * s); ctx.lineTo(-3 * s, -6 * s);
        ctx.moveTo(5 * s, -6 * s); ctx.lineTo(6 * s, -12 * s); ctx.lineTo(3 * s, -6 * s);
        ctx.moveTo(0, -6 * s); ctx.lineTo(0, -14 * s); ctx.lineTo(2 * s, -6 * s); // Center tall
        ctx.fill();
    }

    private drawGreatsword(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
        ctx.save();
        ctx.translate(x, y);

        // Blade with Glow
        // Optimization: Use cached glow instead of shadowBlur
        const glowImg = Assets.get('fx_glow_red');
        if (glowImg) {
            ctx.save();
            ctx.scale(0.5, 2.0); // Stretch vertically for blade
            ctx.globalAlpha = 0.4;
            ctx.drawImage(glowImg, -8 * s, -2 * s, 16 * s, 16 * s);
            ctx.restore();
        } else {
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(255, 61, 0, 0.4)';
        }

        // Metallic Gradient for Blade
        const grad = ctx.createLinearGradient(-3 * s, 0, 3 * s, 0);
        grad.addColorStop(0, '#cfd8dc');
        grad.addColorStop(0.5, '#ffffff'); // Ridge highlighted
        grad.addColorStop(1, '#b0bec5');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-3 * s, 0);
        ctx.lineTo(3 * s, 0);
        ctx.lineTo(0, 24 * s); // Wicked long
        ctx.fill();
        ctx.shadowBlur = 0;

        // Rune Inscription (Pulsing)
        ctx.strokeStyle = SkeletonCommanderUnitRenderer.PALETTE.MAGIC_GLOW;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 2 * s); ctx.lineTo(0, 18 * s);
        ctx.stroke();

        // Crossguard (Bat wing style)
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.ARMOR_BASE;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-6 * s, -2 * s, -8 * s, 2 * s); // Wing tip
        ctx.lineTo(0, 4 * s);
        ctx.lineTo(8 * s, 2 * s);
        ctx.quadraticCurveTo(6 * s, -2 * s, 0, 0);
        ctx.fill();

        // Gem in guard
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.MAGIC_GLOW;
        ctx.beginPath(); ctx.arc(0, 1 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();

        // Hilt
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-1 * s, -8 * s, 2 * s, 8 * s);

        // Pommel
        ctx.fillStyle = SkeletonCommanderUnitRenderer.PALETTE.GOLD_BASE;
        ctx.beginPath(); ctx.arc(0, -9 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    private drawGoldTrim(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, SkeletonCommanderUnitRenderer.PALETTE.GOLD_LIGHT);
        grad.addColorStop(0.5, SkeletonCommanderUnitRenderer.PALETTE.GOLD_BASE);
        grad.addColorStop(1, SkeletonCommanderUnitRenderer.PALETTE.GOLD_DARK);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
    }
}
