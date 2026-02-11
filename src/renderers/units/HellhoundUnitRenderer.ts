import { CachedUnitRenderer } from './CachedUnitRenderer';
import { UnitRenderer } from './UnitRenderer';
import { CONFIG } from '../../Config';
import type { Enemy } from '../../Enemy';
import { Assets } from '../../Assets';
import { AssetCache } from '../../utils/AssetCache';

/**
 * HellhoundUnitRenderer v2.0 — Complete Visual Redesign
 * 
 * Key changes from v1:
 * - Lower, predatory stance (head below shoulders)
 * - Prominent shoulder blades and visible ribs
 * - Enhanced magma effects with spine glow
 * - Fangs and inner mouth fire
 * - Larger embers with trails
 */
export class HellhoundUnitRenderer extends CachedUnitRenderer {
    // 🔥 Demonic Palette — Enhanced
    private static readonly OBSIDIAN = '#0a0303';         // Deepest black-red
    private static readonly OBSIDIAN_LIGHT = '#1f0f0f';   // Slightly lighter
    private static readonly OBSIDIAN_MUSCLE = '#2a1515';  // Muscle tone
    private static readonly MAGMA_CORE = '#ff3d00';       // Bright lava
    private static readonly MAGMA_HOT = '#ffab00';        // White-hot
    private static readonly MAGMA_CRUST = '#bf360c';      // Cooling lava
    private static readonly EYE_FIRE = '#ffff00';         // Intense yellow
    private static readonly EYE_INNER = '#ffffff';        // White-hot center
    private static readonly CLAW_BONE = '#4e342e';        // Charred bone
    private static readonly FANG_WHITE = '#fff8e1';       // Ivory fangs
    private static readonly TONGUE_RED = '#c62828';       // Dark red tongue

    constructor() {
        super();
        this.walkCycleMultiplier = 0.2;
    }

    // BAKING SUPPORT
    drawFrame(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number): void {
        const cycle = t * Math.PI * 2;
        const scale = 1.0;
        const beastScale = scale * 1.25;
        const isMoving = true;
        const time = t * 10;
        this.drawSide(ctx, beastScale, cycle, isMoving, time);
    }

    // drawBody is inherited from CachedUnitRenderer


    // =====================================================================
    // SIDE VIEW — Predatory Hunting Stance
    // =====================================================================
    private drawSide(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, t: number) {
        const tilt = isMoving ? Math.sin(cycle) * 0.03 : 0;
        const vertical = isMoving ? Math.abs(Math.sin(cycle)) * 1.5 * s : 0;
        const breathe = Math.sin(t * 2) * 0.3 * s;

        ctx.translate(0, -vertical);
        ctx.rotate(tilt);

        // 1. FAR LEGS — Behind body
        const legPhase = Math.PI * 0.3;
        this.drawLegSide(ctx, 6 * s, 5 * s, cycle, legPhase, s, true);      // Front far
        this.drawLegSide(ctx, -7 * s, 4 * s, cycle, Math.PI + legPhase, s, true); // Back far

        // 2. EMBER TRAIL — Behind creature
        if (isMoving) this.drawEmberTrail(ctx, -8 * s, 2 * s, s, t);

        // 3. BODY — Low, muscular, with prominent shoulders
        this.drawBodySide(ctx, s, t, breathe);

        // 4. SPINE GLOW — Magma running along back
        this.drawSpineGlow(ctx, s, t);

        // 5. NEAR LEGS — In front
        this.drawLegSide(ctx, 6 * s, 5 * s, cycle, 0, s, false);           // Front near
        this.drawLegSide(ctx, -7 * s, 4 * s, cycle, Math.PI, s, false);    // Back near

        // 6. HEAD — Lower than shoulders (hunting pose)
        ctx.save();
        ctx.translate(10 * s, 2 * s); // Head FORWARD and DOWN
        ctx.rotate(-0.15 - tilt * 0.5); // Slight downward angle
        this.drawHeadSide(ctx, s, isMoving, t);
        ctx.restore();

        // 7. TAIL — Raised, with fire tip
        this.drawTailSide(ctx, -9 * s, -3 * s, cycle, s, t);
    }

    private drawBodySide(ctx: CanvasRenderingContext2D, s: number, t: number, breathe: number) {
        // Main body — angular, predatory
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();

        // Start from chest (right side)
        ctx.moveTo(8 * s, 2 * s);           // Neck base

        // SHOULDER BLADE — prominent hump
        ctx.bezierCurveTo(5 * s, -6 * s, 2 * s, -7 * s, -1 * s, -5 * s); // Rise to shoulder

        // BACK — slight dip then rise to haunches
        ctx.bezierCurveTo(-4 * s, -3 * s, -6 * s, -4 * s, -8 * s, -5 * s); // Haunches

        // REAR — curves down
        ctx.bezierCurveTo(-10 * s, -4 * s, -10 * s, 2 * s, -8 * s, 5 * s); // Rear leg joint

        // BELLY — sucked in (visible ribs)
        ctx.bezierCurveTo(-4 * s, 6 * s + breathe, 2 * s, 5 * s + breathe, 6 * s, 4 * s);

        // CHEST — powerful
        ctx.bezierCurveTo(9 * s, 3 * s, 10 * s, 1 * s, 8 * s, 2 * s);
        ctx.fill();

        // Shoulder blade highlight
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN_MUSCLE;
        ctx.beginPath();
        ctx.ellipse(0, -4 * s, 3 * s, 2 * s, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Visible ribs
        ctx.strokeStyle = HellhoundUnitRenderer.OBSIDIAN_LIGHT;
        ctx.lineWidth = 0.8 * s;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(-2 * s + i * 3 * s, 2 * s, 3 * s, 0.5, Math.PI - 0.5);
            ctx.stroke();
        }

        // Magma cracks on body
        this.drawMagmaCracksSide(ctx, s, t);
    }

    private drawHeadSide(ctx: CanvasRenderingContext2D, s: number, mouthOpen: boolean, t: number) {
        const jawAngle = mouthOpen ? Math.sin(t * 8) * 0.15 + 0.2 : 0.1;

        // Skull — more angular, elongated
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.moveTo(-3 * s, -4 * s);          // Back of skull
        ctx.lineTo(0, -5 * s);                // Top of skull
        ctx.lineTo(6 * s, -3 * s);            // Brow
        ctx.lineTo(8 * s, 0);                 // Snout tip
        ctx.lineTo(6 * s, 2 * s);             // Upper jaw
        ctx.lineTo(0, 3 * s);                 // Jaw hinge
        ctx.lineTo(-4 * s, 1 * s);            // Throat
        ctx.closePath();
        ctx.fill();

        // Lower jaw — animated
        ctx.save();
        ctx.translate(0, 2 * s);
        ctx.rotate(jawAngle);
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN_LIGHT;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(6 * s, 1 * s);
        ctx.lineTo(0, 2 * s);
        ctx.closePath();
        ctx.fill();

        // FANGS — Lower
        ctx.fillStyle = HellhoundUnitRenderer.FANG_WHITE;
        ctx.beginPath();
        ctx.moveTo(2 * s, 0); ctx.lineTo(2.5 * s, -2 * s); ctx.lineTo(3 * s, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4 * s, 0.5 * s); ctx.lineTo(4.5 * s, -1.5 * s); ctx.lineTo(5 * s, 0.5 * s);
        ctx.fill();

        // Tongue — flickers when running
        if (mouthOpen && jawAngle > 0.15) {
            ctx.fillStyle = HellhoundUnitRenderer.TONGUE_RED;
            ctx.beginPath();
            ctx.ellipse(3 * s, 1.5 * s, 2 * s, 0.8 * s, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Upper fangs
        ctx.fillStyle = HellhoundUnitRenderer.FANG_WHITE;
        ctx.beginPath();
        ctx.moveTo(5 * s, 1 * s); ctx.lineTo(5.3 * s, 3.5 * s); ctx.lineTo(5.8 * s, 1 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6.5 * s, 0.5 * s); ctx.lineTo(6.8 * s, 2.5 * s); ctx.lineTo(7.2 * s, 0.5 * s);
        ctx.fill();

        // Inner mouth glow
        const glowIntensity = 0.4 + Math.sin(t * 6) * 0.2;
        ctx.fillStyle = `rgba(255, 100, 0, ${glowIntensity})`;
        ctx.beginPath();
        ctx.ellipse(3 * s, 1.5 * s, 3 * s, 1.5 * s, 0, 0, Math.PI);
        ctx.fill();

        // EYE — Intense glow (Optimized: No shadowBlur)
        const eyePulse = 0.9 + Math.sin(t * 10) * 0.1;

        // Glow
        const glow = AssetCache.getGlow('rgba(255, 255, 0, 0.5)', 32);
        const glowSize = 6 * s * eyePulse;
        ctx.drawImage(glow, 3 * s - glowSize / 2, -2 * s - glowSize / 2, glowSize, glowSize);

        ctx.fillStyle = HellhoundUnitRenderer.EYE_INNER;
        ctx.beginPath();
        ctx.ellipse(3 * s, -2 * s, 1.2 * s * eyePulse, 0.9 * s * eyePulse, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Pupil slit
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(3 * s, -2 * s, 0.3 * s, 0.7 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Ear — torn, battle-scarred
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.moveTo(-2 * s, -3 * s);
        ctx.lineTo(-5 * s, -7 * s);
        ctx.lineTo(-4 * s, -6 * s); // Torn notch
        ctx.lineTo(-6 * s, -8 * s);
        ctx.lineTo(-3 * s, -4 * s);
        ctx.fill();
    }

    // =====================================================================
    // FRONT VIEW — Aggressive Stance
    // =====================================================================
    private drawFront(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, t: number) {
        const vertical = isMoving ? Math.abs(Math.sin(cycle)) * 2 * s : 0;
        const breathe = Math.sin(t * 2) * 0.5 * s;
        ctx.translate(0, -vertical);

        // Back legs (visible between front)
        this.drawLegFront(ctx, -6 * s, 5 * s, cycle, Math.PI, s, true);
        this.drawLegFront(ctx, 6 * s, 5 * s, cycle, 0, s, true);

        // BODY — V-shaped chest, power stance
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        // Wide shoulders
        ctx.moveTo(-8 * s, -6 * s);
        ctx.lineTo(8 * s, -6 * s);
        // V-chest narrowing 
        ctx.lineTo(4 * s, 6 * s + breathe);
        ctx.lineTo(-4 * s, 6 * s + breathe);
        ctx.closePath();
        ctx.fill();

        // Chest magma core (Optimized: No shadowBlur)
        const corePulse = 1 + Math.sin(t * 4) * 0.2;

        ctx.save();
        ctx.translate(0, 1 * s);
        const glow = AssetCache.getGlow('rgba(255, 171, 0, 0.6)', 64);
        const gSize = 25 * s * corePulse;
        ctx.drawImage(glow, -gSize / 2, -gSize / 2, gSize, gSize);
        ctx.restore();

        ctx.fillStyle = HellhoundUnitRenderer.MAGMA_CORE;
        ctx.beginPath();
        // Inverted triangle — hellfire heart
        ctx.moveTo(-2 * s * corePulse, -2 * s);
        ctx.lineTo(2 * s * corePulse, -2 * s);
        ctx.lineTo(0, 4 * s * corePulse);
        ctx.closePath();
        ctx.fill();

        // Magma cracks from core (Optimized: Thick stroke + alpha)
        ctx.strokeStyle = HellhoundUnitRenderer.MAGMA_CORE;
        ctx.lineWidth = 1.5 * s;

        // Fake Glow
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 61, 0, 0.4)';
        ctx.lineWidth = 3.5 * s;
        ctx.beginPath();
        ctx.moveTo(-2 * s, -1 * s); ctx.lineTo(-5 * s, -4 * s);
        ctx.moveTo(2 * s, -1 * s); ctx.lineTo(5 * s, -4 * s);
        ctx.moveTo(0, 3 * s); ctx.lineTo(0, 6 * s);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(-2 * s, -1 * s); ctx.lineTo(-5 * s, -4 * s);
        ctx.moveTo(2 * s, -1 * s); ctx.lineTo(5 * s, -4 * s);
        ctx.moveTo(0, 3 * s); ctx.lineTo(0, 6 * s);
        ctx.stroke();

        // Front legs (wide aggressive stance)
        this.drawLegFront(ctx, -5 * s, 7 * s, cycle, 0, s, false);
        this.drawLegFront(ctx, 5 * s, 7 * s, cycle, Math.PI, s, false);

        // Mane flames
        this.drawManeFront(ctx, 0, -8 * s, s, t);

        // HEAD
        ctx.save();
        ctx.translate(0, -6 * s);
        this.drawHeadFront(ctx, s, t, isMoving);
        ctx.restore();

        // Embers
        if (isMoving) this.drawEmberTrail(ctx, 0, 8 * s, s, t);
    }

    private drawHeadFront(ctx: CanvasRenderingContext2D, s: number, t: number, snarling: boolean) {
        // Angular skull
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.moveTo(-5 * s, -5 * s);  // Left temple
        ctx.lineTo(5 * s, -5 * s);   // Right temple
        ctx.lineTo(6 * s, 0);        // Right cheek
        ctx.lineTo(3 * s, 5 * s);    // Right jaw
        ctx.lineTo(-3 * s, 5 * s);   // Left jaw
        ctx.lineTo(-6 * s, 0);       // Left cheek
        ctx.closePath();
        ctx.fill();

        // EYES — Burning (Optimized)
        const eyePulse = 0.9 + Math.sin(t * 12) * 0.1;
        const drawEye = (xOff: number) => {
            // Glow
            const glow = AssetCache.getGlow('rgba(255, 255, 0, 0.6)', 32);
            const gSize = 8 * s;
            ctx.drawImage(glow, xOff - gSize / 2, -1 * s - gSize / 2, gSize, gSize);

            // Shape
            ctx.fillStyle = HellhoundUnitRenderer.EYE_FIRE;
            ctx.beginPath();
            ctx.moveTo(xOff - 2.5 * s, -1 * s);
            ctx.lineTo(xOff + 1.5 * s, -2.5 * s);
            ctx.lineTo(xOff + 1.5 * s, 0.5 * s);
            ctx.closePath();
            ctx.fill();

            // White hot center
            ctx.fillStyle = HellhoundUnitRenderer.EYE_INNER;
            ctx.beginPath();
            ctx.arc(xOff, -1 * s, 0.6 * s * eyePulse, 0, Math.PI * 2);
            ctx.fill();
        };
        drawEye(-2.5 * s);
        drawEye(2.5 * s);

        // Snout
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN_LIGHT;
        ctx.beginPath();
        ctx.rect(-2 * s, 1 * s, 4 * s, 3 * s);
        ctx.fill();

        // Nostrils — glowing
        ctx.fillStyle = HellhoundUnitRenderer.MAGMA_CRUST;
        ctx.beginPath();
        ctx.ellipse(-1 * s, 2 * s, 0.5 * s, 0.3 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(1 * s, 2 * s, 0.5 * s, 0.3 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // FANGS
        ctx.fillStyle = HellhoundUnitRenderer.FANG_WHITE;
        // Upper fangs
        ctx.beginPath();
        ctx.moveTo(-2 * s, 4 * s); ctx.lineTo(-1.7 * s, 7 * s); ctx.lineTo(-1.4 * s, 4 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2 * s, 4 * s); ctx.lineTo(1.7 * s, 7 * s); ctx.lineTo(1.4 * s, 4 * s);
        ctx.fill();

        // Lower fangs (smaller)
        ctx.beginPath();
        ctx.moveTo(-1 * s, 5 * s); ctx.lineTo(-0.8 * s, 3 * s); ctx.lineTo(-0.6 * s, 5 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(1 * s, 5 * s); ctx.lineTo(0.8 * s, 3 * s); ctx.lineTo(0.6 * s, 5 * s);
        ctx.fill();

        // Inner mouth glow
        if (snarling) {
            const glowPulse = 0.5 + Math.sin(t * 8) * 0.3;
            const grad = ctx.createRadialGradient(0, 4 * s, 0, 0, 4 * s, 3 * s);
            grad.addColorStop(0, `rgba(255, 150, 0, ${glowPulse})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.rect(-2 * s, 3 * s, 4 * s, 3 * s);
            ctx.fill();
        }

        // Ears
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.moveTo(-4 * s, -5 * s); ctx.lineTo(-7 * s, -10 * s); ctx.lineTo(-3 * s, -6 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4 * s, -5 * s); ctx.lineTo(7 * s, -10 * s); ctx.lineTo(3 * s, -6 * s);
        ctx.fill();
    }

    // =====================================================================
    // BACK VIEW — Retreating/Chasing
    // =====================================================================
    private drawBack(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, t: number) {
        const vertical = isMoving ? Math.abs(Math.sin(cycle)) * 2 * s : 0;
        ctx.translate(0, -vertical);

        // Front legs visible through gap
        this.drawLegFront(ctx, -3 * s, 4 * s, cycle, 0, s, true);
        this.drawLegFront(ctx, 3 * s, 4 * s, cycle, Math.PI, s, true);

        // Haunches/Hips — powerful
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // SPINE with magma between vertebrae
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN_MUSCLE;
        ctx.beginPath();
        ctx.rect(-1.5 * s, -7 * s, 3 * s, 7 * s);
        ctx.fill();

        // Vertebrae bumps
        for (let i = 0; i < 4; i++) {
            const yPos = -6 * s + i * 2 * s;
            // Bone
            ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN_LIGHT;
            ctx.beginPath();
            ctx.ellipse(0, yPos, 2 * s, 0.8 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            // Magma glow between (Optimized)
            if (i < 3) {
                const glowInt = 0.6 + Math.sin(t * 5 + i) * 0.4;
                ctx.fillStyle = `rgba(255, 61, 0, ${glowInt})`;

                // Fake Glow
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.ellipse(0, yPos + 1 * s, 1.5 * s, 0.6 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;

                ctx.beginPath();
                ctx.ellipse(0, yPos + 1 * s, 1 * s, 0.4 * s, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Back legs — muscular haunches
        this.drawLegFront(ctx, -5 * s, 6 * s, cycle, Math.PI, s, false);
        this.drawLegFront(ctx, 5 * s, 6 * s, cycle, 0, s, false);

        // Tail — raised dominantly
        this.drawTailBack(ctx, 0, -5 * s, cycle, s, t);

        // Back of head/ears silhouette
        ctx.translate(0, -7 * s);
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN_LIGHT;
        // Ear silhouettes
        ctx.beginPath();
        ctx.moveTo(-3 * s, -2 * s); ctx.lineTo(-6 * s, -7 * s); ctx.lineTo(-2 * s, -3 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3 * s, -2 * s); ctx.lineTo(6 * s, -7 * s); ctx.lineTo(2 * s, -3 * s);
        ctx.fill();

        // Top of skull
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, 7 * s);
        if (isMoving) this.drawEmberTrail(ctx, 0, 8 * s, s, t);
    }

    // =====================================================================
    // COMPONENTS
    // =====================================================================

    private drawLegSide(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, phase: number, s: number, far: boolean) {
        const angle = Math.cos(cycle + phase) * 0.45; // Reduced swing
        const kneeBend = Math.max(0, Math.sin(cycle + phase)) * 1.0; // Gentler knee

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Thigh — more muscular
        ctx.fillStyle = far ? HellhoundUnitRenderer.OBSIDIAN_LIGHT : HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3 * s, 5 * s, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Calf
        ctx.translate(0, 4 * s);
        ctx.rotate(kneeBend - 0.4);
        ctx.fillStyle = far ? HellhoundUnitRenderer.OBSIDIAN_MUSCLE : HellhoundUnitRenderer.OBSIDIAN_LIGHT;
        ctx.beginPath();
        ctx.moveTo(-1.2 * s, 0);
        ctx.lineTo(1.2 * s, 0);
        ctx.lineTo(0.6 * s, 6 * s);
        ctx.lineTo(-0.6 * s, 6 * s);
        ctx.fill();

        // Paw with claws
        ctx.translate(0, 6 * s);
        ctx.rotate(-kneeBend + 0.4);
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2 * s, 1.2 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Claws
        if (!far) {
            ctx.fillStyle = HellhoundUnitRenderer.CLAW_BONE;
            ctx.beginPath();
            ctx.moveTo(1 * s, 0); ctx.lineTo(2.5 * s, 0.5 * s); ctx.lineTo(1 * s, 0.5 * s);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, 0.5 * s); ctx.lineTo(0.5 * s, 1.5 * s); ctx.lineTo(-0.5 * s, 1.5 * s);
            ctx.fill();
        }

        ctx.restore();
    }

    private drawLegFront(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, phase: number, s: number, back: boolean) {
        const lift = Math.max(0, Math.sin(cycle + phase)) * 4 * s;
        ctx.save();
        ctx.translate(x, y - lift);

        ctx.fillStyle = back ? HellhoundUnitRenderer.OBSIDIAN_LIGHT : HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.2 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, 5 * s);
        ctx.fillStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.beginPath();
        ctx.arc(0, 0, 2.2 * s, 0, Math.PI * 2);
        ctx.fill();

        // Claws
        if (!back) {
            ctx.fillStyle = HellhoundUnitRenderer.CLAW_BONE;
            ctx.beginPath();
            ctx.rect(-1.5 * s, 1.5 * s, 0.8 * s, 1.5 * s);
            ctx.rect(0.7 * s, 1.5 * s, 0.8 * s, 1.5 * s);
            ctx.fill();
        }

        ctx.restore();
    }

    private drawTailSide(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, s: number, t: number) {
        const whip = Math.sin(cycle * 2.5) * 0.4;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(whip - 0.8); // Raised tail

        // Tail body
        ctx.strokeStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.lineWidth = 2 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-4 * s, -3 * s, -7 * s, -5 * s);
        ctx.stroke();

        // Fire tip (Optimized: No shadowBlur)
        const firePulse = 1 + Math.sin(t * 10) * 0.3;

        const glow = AssetCache.getGlow('rgba(255, 61, 0, 0.5)', 32);
        const gSize = 12 * s * firePulse;
        ctx.drawImage(glow, -7 * s - gSize / 2, -5 * s - gSize / 2, gSize, gSize);

        ctx.fillStyle = HellhoundUnitRenderer.MAGMA_CORE;
        ctx.beginPath();
        ctx.arc(-7 * s, -5 * s, 2 * s * firePulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private drawTailBack(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, s: number, t: number) {
        const sway = Math.sin(cycle * 2) * 0.3;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(sway);

        // Tail going up
        ctx.strokeStyle = HellhoundUnitRenderer.OBSIDIAN;
        ctx.lineWidth = 2.5 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(0, -5 * s, 0, -8 * s);
        ctx.stroke();

        // Fire tip (Optimized)
        const firePulse = 1 + Math.sin(t * 10) * 0.3;

        const glow = AssetCache.getGlow('rgba(255, 61, 0, 0.5)', 32);
        const gSize = 15 * s * firePulse;
        ctx.drawImage(glow, -gSize / 2, -8 * s - gSize / 2, gSize, gSize);

        ctx.fillStyle = HellhoundUnitRenderer.MAGMA_CORE;
        ctx.beginPath();
        ctx.arc(0, -8 * s, 2.5 * s * firePulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private drawSpineGlow(ctx: CanvasRenderingContext2D, s: number, t: number) {
        const pulseBase = 0.5 + Math.sin(t * 4) * 0.3;

        ctx.strokeStyle = HellhoundUnitRenderer.MAGMA_CORE;
        ctx.lineWidth = 2 * s;

        // Fake Glow (stroke)
        ctx.globalAlpha = pulseBase * 0.5;
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.moveTo(5 * s, -5 * s);
        ctx.bezierCurveTo(2 * s, -6 * s, -3 * s, -4 * s, -7 * s, -4 * s);
        ctx.stroke();

        ctx.globalAlpha = pulseBase;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(5 * s, -5 * s);
        ctx.bezierCurveTo(2 * s, -6 * s, -3 * s, -4 * s, -7 * s, -4 * s);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
    }

    private drawMagmaCracksSide(ctx: CanvasRenderingContext2D, s: number, t: number) {
        const alpha = 0.6 + Math.sin(t * 6) * 0.4;
        ctx.strokeStyle = HellhoundUnitRenderer.MAGMA_CORE;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.8 * s;

        // Fake Glow (Double stroke)
        ctx.save();
        ctx.lineWidth = 4 * s;
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.moveTo(4 * s, -4 * s); ctx.lineTo(2 * s, 0);
        ctx.moveTo(-1 * s, -2 * s); ctx.lineTo(-3 * s, 2 * s);
        ctx.moveTo(-5 * s, -3 * s); ctx.lineTo(-6 * s, 0);
        ctx.moveTo(-7 * s, -2 * s); ctx.lineTo(-8 * s, 1 * s);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        // Shoulder crack
        ctx.moveTo(4 * s, -4 * s); ctx.lineTo(2 * s, 0);
        // Flank cracks
        ctx.moveTo(-1 * s, -2 * s); ctx.lineTo(-3 * s, 2 * s);
        ctx.moveTo(-5 * s, -3 * s); ctx.lineTo(-6 * s, 0);
        // Haunch
        ctx.moveTo(-7 * s, -2 * s); ctx.lineTo(-8 * s, 1 * s);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
    }

    private drawManeFront(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
        ctx.save();
        ctx.translate(x, y);

        // Multiple flame tendrils
        const flames = 7;
        for (let i = 0; i < flames; i++) {
            const ang = -Math.PI * 0.4 + (i / (flames - 1)) * Math.PI * 0.8;
            const flicker = Math.sin(t * 15 + i * 2) * 0.2;
            const len = 6 * s + Math.sin(t * 10 + i * 3) * 2 * s;

            const grad = ctx.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len);
            grad.addColorStop(0, HellhoundUnitRenderer.MAGMA_HOT);
            grad.addColorStop(0.4, HellhoundUnitRenderer.MAGMA_CORE);
            grad.addColorStop(1, 'rgba(191, 54, 12, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang - 0.15 + flicker) * len, Math.sin(ang - 0.15 + flicker) * len);
            ctx.lineTo(Math.cos(ang + 0.15 + flicker) * (len * 0.6), Math.sin(ang + 0.15 + flicker) * (len * 0.6));
            ctx.fill();
        }

        ctx.restore();
    }

    private drawEmberTrail(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
        // DETERMINISTIC EMBERS (No Math.random inside frame draw)
        // We use sine waves based on time and index to simulate randomness
        const count = 4;
        for (let i = 0; i < count; i++) {
            // Emulate "if (Math.random() > 0.7) continue" deterministically
            // Use a complex sine wave to decide visibility
            const visibilityFactor = Math.sin(t * 5 + i * 132.1);
            if (visibilityFactor > 0.4) continue; // Skip roughly 30-40% of time

            const offset = Math.sin(t * 3 + i * 4) * 4 * s;
            const px = x + offset;
            const py = y + Math.cos(t * 4 + i * 2) * 2 * s;

            const size = (0.8 + Math.abs(Math.sin(t * 2 + i))) * s;
            const alpha = 0.6 + Math.sin(t * 7 + i) * 0.4;

            ctx.fillStyle = (i % 2 === 0) ? HellhoundUnitRenderer.MAGMA_CORE : HellhoundUnitRenderer.MAGMA_HOT;

            // Optimized: No shadowBlur
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    drawEmissive(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        // Emissive handled in main draw for consistency
    }
}
