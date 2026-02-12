import { CachedUnitRenderer } from './CachedUnitRenderer';
import { UnitRenderer } from './UnitRenderer';
import type { Enemy } from '../../Enemy';
import { Assets } from '../../Assets';

/**
 * FleshUnitRenderer v2.0 — "Flesh Colossus" / "Meat Piñata"
 * 
 * AAA-Quality Visual: Grotesque abomination of stitched flesh, embedded victims,
 * pulsating organs, tentacle appendages, dripping gore, heavy shambling animation.
 */
export class FleshUnitRenderer extends CachedUnitRenderer {
    // 🩸 FLESH PALETTE — Layered tones for depth
    private static readonly FLESH_DEEPEST = '#3a1818';

    protected walkCycleMultiplier: number = 0.2; // Slower, heavy movement
    protected override orientationMode = 'DIR3' as const;
    private static readonly FLESH_DARK = '#4a2020';
    private static readonly FLESH_MID = '#6d3030';
    private static readonly FLESH_LIGHT = '#8d4545';
    private static readonly FLESH_PALE = '#a06060';
    private static readonly FLESH_HIGHLIGHT = '#c08080';

    // 🦴 BONE & STITCH
    private static readonly STITCH_DARK = '#0a0a0a';
    private static readonly STITCH_THREAD = '#2a2020';
    private static readonly BONE_PALE = '#e8e0d8';
    private static readonly BONE_MID = '#d7ccc8';
    private static readonly BONE_DARK = '#a1887f';

    // 🩸 GORE
    private static readonly BLOOD_BRIGHT = '#cc0000';
    private static readonly BLOOD_DARK = '#5c1010';
    private static readonly BLOOD_DRIP = '#8b0000';
    private static readonly GORE_PINK = '#cc6666';
    private static readonly ORGAN_RED = '#991111';
    private static readonly ORGAN_PURPLE = '#6a1b4d';

    // 👁 EYES & GLOW
    private static readonly EYE_WHITE = '#f5f5dc';
    private static readonly EYE_PUPIL = '#1a1a1a';
    private static readonly EYE_BLOODSHOT = '#ff6666';
    private static readonly GLOW_SICKLY = '#88ff88';

    constructor() {
        super();
        this.walkCycleMultiplier = 0.06; // Very slow shamble
    }

    // BAKING SUPPORT
    public getBakeFacings(): ('SIDE' | 'UP' | 'DOWN')[] {
        return ['SIDE', 'UP', 'DOWN'];
    }

    public drawFrameDirectional(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number, facing: 'SIDE' | 'UP' | 'DOWN') {
        const cycle = t * Math.PI * 2;
        const scale = 1.0;
        const colossusScale = scale * 1.1;
        const isMoving = true;
        const time = t * 10;
        const hp = 1.0; // Bake healthy

        if (facing === 'UP') return this.drawBack(ctx, colossusScale, cycle, isMoving, time, hp);
        if (facing === 'DOWN') return this.drawFront(ctx, colossusScale, cycle, isMoving, time, hp);
        return this.drawSide(ctx, colossusScale, cycle, isMoving, time, hp);
    }

    drawFrame(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number): void {
        this.drawFrameDirectional(ctx, enemy, t, 'SIDE');
    }

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const hpPercent = enemy.currentHealth / enemy.maxHealth;

        // 1. If Damaged (HP < 50%), force procedural rendering to show gore/wounds
        if (hpPercent <= 0.5) {
            const time = Date.now() * 0.001;
            const walkCycle = time * (enemy.baseSpeed * this.walkCycleMultiplier);
            const isMoving = !enemy.finished && enemy.currentHealth > 0;

            this.drawProceduralFull(ctx, enemy, scale, rotation, walkCycle, isMoving, hpPercent);
            return;
        }

        // 2. Otherwise use Cached version
        super.drawBody(ctx, enemy, scale, rotation);
    }

    /**
     * Full procedural rendering with directional support (Used for Damaged state or fallback)
     */
    private drawProceduralFull(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number, walkCycle: number, isMoving: boolean, hpPercent: number) {
        const colossusScale = scale * 1.1;
        const time = Date.now() * 0.001; // Need absolute time for breathing/pulsing

        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';
        const r = rotation;
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();

        // Manual hit flash since we bypassed super.drawBody
        if (enemy.hitFlashTimer > 0) {
            ctx.globalAlpha = 0.7;
        }

        if (facing === 'SIDE') {
            if (Math.abs(rotation) > Math.PI / 2) {
                ctx.scale(-1, 1);
            }
            this.drawSide(ctx, colossusScale, walkCycle, isMoving, time, hpPercent);
        } else if (facing === 'UP') {
            this.drawBack(ctx, colossusScale, walkCycle, isMoving, time, hpPercent);
        } else {
            this.drawFront(ctx, colossusScale, walkCycle, isMoving, time, hpPercent);
        }

        ctx.restore();
    }


    // =====================================================================
    // SIDE VIEW — Shambling Horror
    // =====================================================================
    private drawSide(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, t: number, hp: number) {
        // Animation variables
        const sway = isMoving ? Math.sin(cycle) * 0.06 : Math.sin(t * 0.5) * 0.02;
        const bounce = isMoving ? Math.abs(Math.sin(cycle * 0.5)) * 3 * s : 0;
        const breathe = Math.sin(t * 1.5) * 0.08;
        const pulse = 1 + breathe;
        const heavePulse = 1 + Math.sin(t * 2.5) * 0.04;

        ctx.translate(0, -bounce);
        ctx.rotate(sway);

        // Slime trail removed - was static and unnatural

        // 2. BACK TENTACLES (behind body)
        this.drawTentacles(ctx, -6 * s, 2 * s, s, t, true);

        // 3. FAR LEG — connected to body at waist
        this.drawLegSide(ctx, -3 * s, 6 * s, cycle, Math.PI, s * 0.85, true);

        // 4. MAIN BODY MASS
        this.drawMainBodySide(ctx, s, t, pulse, heavePulse);

        // 5. FAT ROLLS & SKIN FOLDS
        this.drawFatRolls(ctx, s, t);

        // 6. EMBEDDED BONES & WEAPONS
        this.drawEmbeddedDebris(ctx, s, t);

        // 7. INTERNAL ORGANS (visible through wounds)
        this.drawVisibleOrgans(ctx, s, t, hp);

        // 8. STITCHES — crude surgical seams
        this.drawStitchesSide(ctx, s, t);

        // 9. NEAR LEG — connected at waist level
        this.drawLegSide(ctx, 4 * s, 6 * s, cycle, 0, s, false);

        // 10. FRONT TENTACLE/ARM
        this.drawTentacles(ctx, 8 * s, -2 * s, s, t, false);

        // 11. EMBEDDED FACES (victims)
        this.drawEmbeddedFaces(ctx, s, t);

        // 12. HEAD — Small, grotesque
        ctx.save();
        ctx.translate(9 * s, -10 * s);
        ctx.rotate(Math.sin(t * 0.8) * 0.1);
        this.drawHeadSide(ctx, s * 0.6, t);
        ctx.restore();

        // 13. DRIPPING GORE
        this.drawDrippingGore(ctx, s, t, isMoving);

        // 14. DAMAGE EFFECTS (low HP = more gore)
        if (hp < 0.5) {
            this.drawDamageEffects(ctx, s, t, hp);
        }
    }

    private drawMainBodySide(ctx: CanvasRenderingContext2D, s: number, t: number, pulse: number, heavePulse: number) {
        // ============================================
        // MUSCULAR UPPER BODY (Shoulders + Torso)
        // ============================================

        // Strong shoulder/back muscles
        const shoulderGrad = ctx.createLinearGradient(-8 * s, -12 * s, 8 * s, -4 * s);
        shoulderGrad.addColorStop(0, FleshUnitRenderer.FLESH_DARK);
        shoulderGrad.addColorStop(0.5, FleshUnitRenderer.FLESH_MID);
        shoulderGrad.addColorStop(1, FleshUnitRenderer.FLESH_DARK);

        ctx.fillStyle = shoulderGrad;
        ctx.beginPath();

        // Neck base
        ctx.moveTo(8 * s, -6 * s);

        // BROAD SHOULDERS — angular, powerful
        ctx.lineTo(6 * s, -10 * s);
        ctx.bezierCurveTo(4 * s, -14 * s, -2 * s, -14 * s, -6 * s, -12 * s);

        // TRAPEZIUS hump (muscle)
        ctx.bezierCurveTo(-10 * s, -11 * s, -11 * s, -8 * s, -10 * s, -4 * s);

        // LATS (side muscles) — angular cut
        ctx.lineTo(-9 * s, 0);
        ctx.lineTo(-7 * s, 2 * s);

        // Waist (narrower than shoulders)
        ctx.lineTo(-5 * s, 3 * s);

        // Connect to chest
        ctx.lineTo(4 * s, 0);
        ctx.lineTo(8 * s, -2 * s);
        ctx.closePath();
        ctx.fill();

        // Shoulder muscle definition
        ctx.fillStyle = FleshUnitRenderer.FLESH_LIGHT;
        ctx.beginPath();
        ctx.ellipse(-2 * s, -10 * s, 5 * s, 3 * s, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Deltoid highlight
        ctx.fillStyle = FleshUnitRenderer.FLESH_HIGHLIGHT;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(-1 * s, -11 * s, 2.5 * s, 1.5 * s, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // ============================================
        // BLOATED BELLY (Where enemies are hidden)
        // ============================================

        const bellyPulse = 1 + Math.sin(t * 1.5) * 0.08; // Slow, heavy breathing
        const bellyKick = Math.sin(t * 3 + 1) * 0.05; // Something moving inside

        // Belly gradient — stretched, veiny
        const bellyGrad = ctx.createRadialGradient(0, 5 * s, 1 * s, 0, 5 * s, 10 * s * bellyPulse);
        bellyGrad.addColorStop(0, FleshUnitRenderer.FLESH_PALE);
        bellyGrad.addColorStop(0.6, FleshUnitRenderer.FLESH_LIGHT);
        bellyGrad.addColorStop(1, FleshUnitRenderer.FLESH_MID);

        ctx.fillStyle = bellyGrad;
        ctx.beginPath();

        // Belly attached at waist
        ctx.moveTo(-5 * s, 3 * s);

        // Massive protruding belly
        ctx.bezierCurveTo(
            -8 * s * bellyPulse, 6 * s,
            -10 * s * (bellyPulse + bellyKick), 10 * s,
            -4 * s, 12 * s
        );

        // Bottom of belly (saggy, heavy)
        ctx.bezierCurveTo(
            0, 14 * s * bellyPulse,
            6 * s, 13 * s,
            8 * s, 10 * s * (bellyPulse + bellyKick)
        );

        // Back to waist
        ctx.bezierCurveTo(
            6 * s, 5 * s,
            5 * s, 2 * s,
            4 * s, 0
        );

        ctx.closePath();
        ctx.fill();

        // BELLY STRETCH MARKS — skin under tension
        ctx.strokeStyle = FleshUnitRenderer.FLESH_DARK;
        ctx.lineWidth = 0.6 * s;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 4; i++) {
            const angle = -0.5 + i * 0.3;
            ctx.beginPath();
            ctx.moveTo(-2 * s + i * 2 * s, 4 * s);
            ctx.quadraticCurveTo(
                -4 * s + i * 2 * s + Math.sin(t + i) * s * bellyKick,
                8 * s,
                -3 * s + i * 2 * s,
                11 * s
            );
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // SOMETHING MOVING INSIDE — visible bump
        const bumpX = Math.sin(t * 2) * 3 * s;
        const bumpY = 7 * s + Math.cos(t * 2.5) * 2 * s;
        ctx.fillStyle = FleshUnitRenderer.FLESH_HIGHLIGHT;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.ellipse(bumpX, bumpY, 2.5 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Belly veins (stressed skin)
        this.drawBellyVeins(ctx, s, t, bellyPulse);

        // Surface veins on upper body
        this.drawVeins(ctx, s, t);
    }

    private drawBellyVeins(ctx: CanvasRenderingContext2D, s: number, t: number, pulse: number) {
        const veinPulse = 0.6 + Math.sin(t * 4) * 0.4;

        ctx.strokeStyle = FleshUnitRenderer.BLOOD_DARK;
        ctx.lineWidth = 1 * s;
        ctx.globalAlpha = veinPulse * 0.5;

        // Prominent veins radiating from belly center
        ctx.beginPath();
        ctx.moveTo(-5 * s, 5 * s);
        ctx.quadraticCurveTo(-7 * s, 8 * s, -6 * s, 11 * s);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(2 * s, 5 * s);
        ctx.quadraticCurveTo(5 * s, 8 * s, 6 * s, 11 * s);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-1 * s, 6 * s);
        ctx.quadraticCurveTo(-2 * s, 10 * s, 0, 13 * s);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
    }

    private drawVeins(ctx: CanvasRenderingContext2D, s: number, t: number) {
        const veinPulse = 0.7 + Math.sin(t * 3) * 0.3;

        ctx.strokeStyle = FleshUnitRenderer.BLOOD_DARK;
        ctx.lineWidth = 0.8 * s;
        ctx.globalAlpha = veinPulse * 0.5;

        // Branching veins
        ctx.beginPath();
        ctx.moveTo(-4 * s, -6 * s);
        ctx.quadraticCurveTo(-2 * s, -3 * s, 0, 0);
        ctx.quadraticCurveTo(3 * s, 2 * s, 5 * s, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(2 * s, -10 * s);
        ctx.quadraticCurveTo(4 * s, -6 * s, 3 * s, -2 * s);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-8 * s, -2 * s);
        ctx.quadraticCurveTo(-5 * s, 2 * s, -2 * s, 4 * s);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
    }

    private drawFatRolls(ctx: CanvasRenderingContext2D, s: number, t: number) {
        const wobble = Math.sin(t * 2) * 0.5 * s;

        // Multiple overlapping fat folds
        ctx.fillStyle = FleshUnitRenderer.FLESH_DARK;

        // Lower belly roll
        ctx.beginPath();
        ctx.ellipse(2 * s, 6 * s + wobble, 6 * s, 2 * s, 0.1, 0, Math.PI);
        ctx.fill();

        // Side roll
        ctx.beginPath();
        ctx.ellipse(-8 * s, 0, 3 * s, 4 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Upper fold crease
        ctx.strokeStyle = FleshUnitRenderer.FLESH_DEEPEST;
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(-6 * s, -4 * s);
        ctx.quadraticCurveTo(-2 * s, -2 * s + wobble, 4 * s, -3 * s);
        ctx.stroke();
    }

    private drawEmbeddedDebris(ctx: CanvasRenderingContext2D, s: number, t: number) {
        // Bone shard 1 — protruding from shoulder
        ctx.save();
        ctx.translate(-4 * s, -10 * s);
        ctx.rotate(-0.5);

        ctx.fillStyle = FleshUnitRenderer.BONE_PALE;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(1.5 * s, -1 * s);
        ctx.lineTo(1 * s, -8 * s);
        ctx.lineTo(-0.5 * s, -7 * s);
        ctx.lineTo(-1 * s, 0);
        ctx.fill();

        // Bone joint
        ctx.fillStyle = FleshUnitRenderer.BONE_DARK;
        ctx.beginPath();
        ctx.ellipse(0.3 * s, -7.5 * s, 1.5 * s, 1 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Rusted blade embedded
        ctx.save();
        ctx.translate(4 * s, -4 * s);
        ctx.rotate(0.6);

        // Blade
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(2 * s, 0);
        ctx.lineTo(1 * s, 10 * s);
        ctx.lineTo(-0.5 * s, 9 * s);
        ctx.fill();

        // Blood around entry
        ctx.fillStyle = FleshUnitRenderer.BLOOD_DARK;
        ctx.beginPath();
        ctx.ellipse(0.5 * s, 1 * s, 2 * s, 1.5 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Chain links
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.ellipse(-9 * s, -6 * s, 1.5 * s, 2 * s, 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(-10 * s, -4 * s, 1.5 * s, 2 * s, -0.3, 0, Math.PI * 2);
        ctx.stroke();
    }

    private drawVisibleOrgans(ctx: CanvasRenderingContext2D, s: number, t: number, hp: number) {
        const organPulse = 1 + Math.sin(t * 4) * 0.15;
        const visibility = hp < 0.7 ? 0.8 : 0.5; // More visible when damaged

        ctx.globalAlpha = visibility;

        // Wound opening
        ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
        ctx.beginPath();
        ctx.ellipse(-2 * s, 1 * s, 3 * s, 2 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Intestine coils
        ctx.fillStyle = FleshUnitRenderer.GORE_PINK;
        ctx.beginPath();
        ctx.arc(-2 * s, 1.5 * s, 1.5 * s * organPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-0.5 * s, 0.5 * s, 1 * s * organPulse, 0, Math.PI * 2);
        ctx.fill();

        // Pulsating organ (heart-like)
        const heartBeat = 1 + Math.sin(t * 6) * 0.2;
        ctx.fillStyle = FleshUnitRenderer.ORGAN_RED;

        // Fake Glow
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(0, -2 * s, 2.5 * s * heartBeat, 2.0 * s * heartBeat, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.ellipse(0, -2 * s, 2 * s * heartBeat, 1.5 * s * heartBeat, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1.0;
    }

    private drawStitchesSide(ctx: CanvasRenderingContext2D, s: number, t: number) {
        ctx.strokeStyle = FleshUnitRenderer.STITCH_DARK;
        ctx.lineWidth = 1.8 * s;

        // Main horizontal stitch
        ctx.setLineDash([3 * s, 2 * s]);
        ctx.beginPath();
        ctx.moveTo(-8 * s, -4 * s);
        ctx.quadraticCurveTo(0, -2 * s, 7 * s, -5 * s);
        ctx.stroke();

        // Diagonal stitch across body
        ctx.beginPath();
        ctx.moveTo(3 * s, -12 * s);
        ctx.quadraticCurveTo(-2 * s, -4 * s, -4 * s, 4 * s);
        ctx.stroke();

        // Cross-stitch detail
        ctx.setLineDash([]);
        ctx.lineWidth = 1 * s;

        // Individual stitch marks (X pattern)
        const stitchPoints = [
            { x: -6, y: -4 }, { x: -2, y: -3 }, { x: 2, y: -4 }, { x: 5, y: -5 }
        ];

        stitchPoints.forEach(p => {
            ctx.beginPath();
            ctx.moveTo((p.x - 0.8) * s, (p.y - 0.8) * s);
            ctx.lineTo((p.x + 0.8) * s, (p.y + 0.8) * s);
            ctx.moveTo((p.x + 0.8) * s, (p.y - 0.8) * s);
            ctx.lineTo((p.x - 0.8) * s, (p.y + 0.8) * s);
            ctx.stroke();
        });

        // Stitch thread ends
        ctx.strokeStyle = FleshUnitRenderer.STITCH_THREAD;
        ctx.lineWidth = 0.6 * s;
        ctx.beginPath();
        ctx.moveTo(-8 * s, -4 * s);
        ctx.lineTo(-9 * s, -3 * s);
        ctx.moveTo(7 * s, -5 * s);
        ctx.lineTo(8 * s, -4 * s);
        ctx.stroke();
    }

    private drawEmbeddedFaces(ctx: CanvasRenderingContext2D, s: number, t: number) {
        // Screaming face embedded in flesh
        ctx.save();
        ctx.translate(-5 * s, 3 * s);
        ctx.rotate(0.4);

        // Face outline (partially absorbed)
        ctx.fillStyle = FleshUnitRenderer.FLESH_PALE;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stitched shut eyes
        ctx.strokeStyle = FleshUnitRenderer.STITCH_DARK;
        ctx.lineWidth = 0.6 * s;
        ctx.beginPath();
        ctx.moveTo(-1.5 * s, -1 * s);
        ctx.lineTo(-0.5 * s, -0.8 * s);
        ctx.moveTo(0.5 * s, -0.8 * s);
        ctx.lineTo(1.5 * s, -1 * s);
        ctx.stroke();

        // Screaming mouth (opening and closing)
        const mouthOpen = Math.sin(t * 2) * 0.3 + 0.5;
        ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
        ctx.beginPath();
        ctx.ellipse(0, 1.5 * s, 1 * s, mouthOpen * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Second face (barely visible, absorbed)
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = FleshUnitRenderer.FLESH_MID;
        ctx.beginPath();
        ctx.ellipse(6 * s, 4 * s, 1.8 * s, 2 * s, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    private drawTentacles(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, back: boolean) {
        const wave1 = Math.sin(t * 2 + x * 0.1);
        const wave2 = Math.sin(t * 2.5 + y * 0.1);

        ctx.save();
        ctx.translate(x, y);

        const alpha = back ? 0.7 : 1.0;
        ctx.globalAlpha = alpha;

        // Create gradient for tentacle
        const tentGrad = ctx.createLinearGradient(0, 0, 0, 8 * s);
        tentGrad.addColorStop(0, FleshUnitRenderer.FLESH_MID);
        tentGrad.addColorStop(1, FleshUnitRenderer.FLESH_DARK);

        ctx.fillStyle = tentGrad;
        ctx.strokeStyle = FleshUnitRenderer.FLESH_DARK;
        ctx.lineWidth = 0.8 * s;

        // Wavy tentacle shape
        ctx.beginPath();
        ctx.moveTo(-1.5 * s, 0);
        ctx.quadraticCurveTo(
            wave1 * 3 * s, 3 * s,
            wave2 * 2 * s, 7 * s
        );
        ctx.quadraticCurveTo(
            wave1 * 2 * s + 1 * s, 3 * s,
            1.5 * s, 0
        );
        ctx.fill();
        ctx.stroke();

        // Suction cups
        if (!back) {
            ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
            for (let i = 0; i < 3; i++) {
                const cupY = 2 * s + i * 2 * s;
                const cupX = wave1 * (1 + i * 0.3) * s;
                ctx.beginPath();
                ctx.ellipse(cupX, cupY, 0.5 * s, 0.3 * s, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1.0;
        ctx.restore();
    }

    private drawSlimeTrail(ctx: CanvasRenderingContext2D, s: number, t: number) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = FleshUnitRenderer.GORE_PINK;

        // Multiple slime puddles behind
        for (let i = 0; i < 3; i++) {
            const offset = -15 * s - i * 8 * s;
            const size = (3 - i) * 1.5 * s;
            ctx.beginPath();
            ctx.ellipse(offset, 10 * s, size, size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;
    }

    private drawDrippingGore(ctx: CanvasRenderingContext2D, s: number, t: number, isMoving: boolean) {
        // Blood drips
        const dripPhase = (t * 2) % 1;

        ctx.fillStyle = FleshUnitRenderer.BLOOD_DRIP;
        ctx.globalAlpha = 0.8;

        // Drip 1 — from belly
        const drip1Y = 8 * s + dripPhase * 10 * s;
        const drip1Alpha = 1 - dripPhase;
        ctx.globalAlpha = drip1Alpha * 0.8;
        ctx.beginPath();
        ctx.ellipse(2 * s, drip1Y, 0.8 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Drip 2 — from wound (offset phase)
        const drip2Phase = ((t * 1.7) + 0.5) % 1;
        const drip2Y = 5 * s + drip2Phase * 12 * s;
        ctx.globalAlpha = (1 - drip2Phase) * 0.7;
        ctx.beginPath();
        ctx.ellipse(-3 * s, drip2Y, 0.6 * s, 1.2 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Constant ooze at bottom
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = FleshUnitRenderer.GORE_PINK;
        ctx.beginPath();
        ctx.ellipse(0, 11 * s, 5 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1.0;
    }

    private drawDamageEffects(ctx: CanvasRenderingContext2D, s: number, t: number, hp: number) {
        // More wounds visible at low HP
        const woundCount = hp < 0.3 ? 3 : 2;

        ctx.fillStyle = FleshUnitRenderer.BLOOD_DARK;

        for (let i = 0; i < woundCount; i++) {
            const wx = (-4 + i * 4) * s;
            const wy = (-8 + i * 5) * s;

            // Dark wound cavity
            ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
            ctx.beginPath();
            ctx.ellipse(wx, wy, 1.5 * s, 2 * s, i * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Blood oozing
            ctx.fillStyle = FleshUnitRenderer.BLOOD_DARK;
            ctx.beginPath();
            ctx.ellipse(wx, wy + 2 * s, 1 * s, 1.5 * s, 0, 0, Math.PI);
            ctx.fill();
        }
    }

    private drawHeadSide(ctx: CanvasRenderingContext2D, s: number, t: number) {
        // Misshapen lump of a head
        ctx.fillStyle = FleshUnitRenderer.FLESH_MID;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5 * s, 4 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Tumor/growth
        ctx.fillStyle = FleshUnitRenderer.FLESH_LIGHT;
        ctx.beginPath();
        ctx.ellipse(-2 * s, -2 * s, 2 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // MULTIPLE EYES — asymmetric
        // Main eye (bloodshot, staring)
        const eyePulse = 1 + Math.sin(t * 6) * 0.1;
        ctx.fillStyle = FleshUnitRenderer.EYE_WHITE;
        ctx.beginPath();
        ctx.ellipse(2 * s, 0, 1.8 * s * eyePulse, 1.4 * s * eyePulse, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Bloodshot veins in eye
        ctx.strokeStyle = FleshUnitRenderer.EYE_BLOODSHOT;
        ctx.lineWidth = 0.3 * s;
        ctx.beginPath();
        ctx.moveTo(0.5 * s, 0);
        ctx.lineTo(1.5 * s, -0.3 * s);
        ctx.moveTo(0.5 * s, 0.3 * s);
        ctx.lineTo(1.3 * s, 0.5 * s);
        ctx.stroke();

        // Pupil (tiny, pinpoint)
        ctx.fillStyle = FleshUnitRenderer.EYE_PUPIL;
        ctx.beginPath();
        ctx.arc(2.2 * s, 0, 0.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Second eye (smaller, half-closed)
        ctx.fillStyle = FleshUnitRenderer.EYE_WHITE;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(0, 1.5 * s, 1 * s, 0.6 * s, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = FleshUnitRenderer.EYE_PUPIL;
        ctx.beginPath();
        ctx.arc(0.3 * s, 1.5 * s, 0.3 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Third eye (closed/stitched shut)
        ctx.strokeStyle = FleshUnitRenderer.STITCH_DARK;
        ctx.lineWidth = 0.8 * s;
        ctx.beginPath();
        ctx.moveTo(-2 * s, 0.5 * s);
        ctx.lineTo(-0.5 * s, 0.8 * s);
        ctx.stroke();

        // Mouth — drooling maw, no lips
        ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
        ctx.beginPath();
        ctx.ellipse(3 * s, 2 * s, 1.5 * s, 1 * s, 0.3, 0, Math.PI);
        ctx.fill();

        // Drool
        ctx.strokeStyle = FleshUnitRenderer.GORE_PINK;
        ctx.lineWidth = 0.5 * s;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(3 * s, 3 * s);
        ctx.quadraticCurveTo(3.5 * s, 5 * s, 3 * s, 7 * s);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    // =====================================================================
    // FRONT VIEW — Full detail matching Side view (14 elements)
    // =====================================================================
    private drawFront(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, t: number, hp: number) {
        // Animation variables (same as Side)
        const sway = isMoving ? Math.sin(cycle) * 0.04 : Math.sin(t * 0.5) * 0.02;
        const bounce = isMoving ? Math.abs(Math.sin(cycle * 0.5)) * 2 * s : 0;
        const breathe = Math.sin(t * 1.5) * 0.06;
        const pulse = 1 + breathe;
        const heavePulse = 1 + Math.sin(t * 2.5) * 0.03;

        ctx.translate(0, -bounce);
        ctx.rotate(sway);

        // 1. BACK TENTACLES (behind body, near shoulders)
        this.drawTentacles(ctx, -9 * s, -3 * s, s * 0.7, t, true);
        this.drawTentacles(ctx, 9 * s, -3 * s, s * 0.7, t, true);

        // 2. FAR LEGS (behind)
        this.drawLegFront(ctx, -4 * s, 5 * s, cycle, Math.PI, s * 0.8, true);
        this.drawLegFront(ctx, 4 * s, 5 * s, cycle, 0, s * 0.75, true);

        // 3. MAIN BODY — Muscular upper body
        this.drawMainBodyFront(ctx, s, t, pulse, heavePulse);

        // 4. FAT ROLLS (on sides)
        this.drawFatRollsFront(ctx, s, t);

        // 5. EMBEDDED DEBRIS (bones, chains, weapons)
        this.drawEmbeddedDebrisFront(ctx, s, t);

        // 6. VISIBLE ORGANS (wound on belly)
        this.drawVisibleOrgansFront(ctx, s, t, hp);

        // 7. STITCHES (vertical and horizontal)
        this.drawStitchesFront(ctx, s, t);

        // 8. NEAR ARMS / TENTACLES (in front)
        this.drawTentacles(ctx, -11 * s, 0, s * 0.8, t, false);
        this.drawTentacles(ctx, 11 * s, 0, s * 0.8, t, false);

        // 9. EMBEDDED FACES
        this.drawEmbeddedFacesFront(ctx, s, t);

        // 10. HEAD — Small, grotesque, animated
        ctx.save();
        ctx.translate(0, -9 * s);
        ctx.rotate(Math.sin(t * 0.8) * 0.08);
        this.drawHeadFront(ctx, s * 0.55, t);
        ctx.restore();

        // 11. DRIPPING GORE
        this.drawDrippingGore(ctx, s, t, isMoving);

        // 12. DAMAGE EFFECTS (low HP)
        if (hp < 0.5) {
            this.drawDamageEffectsFront(ctx, s, t, hp);
        }
    }

    // =====================================================================
    // FRONT VIEW HELPER METHODS
    // =====================================================================

    private drawMainBodyFront(ctx: CanvasRenderingContext2D, s: number, t: number, pulse: number, heavePulse: number) {
        // UPPER BODY — Massive, rounded shoulders
        const bodyGrad = ctx.createRadialGradient(0, -3 * s, 2 * s, 0, 0, 12 * s);
        bodyGrad.addColorStop(0, FleshUnitRenderer.FLESH_LIGHT);
        bodyGrad.addColorStop(0.5, FleshUnitRenderer.FLESH_MID);
        bodyGrad.addColorStop(1, FleshUnitRenderer.FLESH_DARK);

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();

        // Neck
        ctx.moveTo(0, -9 * s);

        // LEFT SHOULDER
        ctx.bezierCurveTo(-3 * s, -10 * s, -8 * s * pulse, -8 * s, -9 * s, -4 * s);

        // LEFT SIDE
        ctx.bezierCurveTo(-10 * s * heavePulse, -1 * s, -8 * s, 2 * s, -5 * s, 4 * s);

        // WAIST
        ctx.lineTo(5 * s, 4 * s);

        // RIGHT SIDE
        ctx.bezierCurveTo(8 * s, 2 * s, 10 * s * heavePulse, -1 * s, 9 * s, -4 * s);

        // RIGHT SHOULDER
        ctx.bezierCurveTo(8 * s * pulse, -8 * s, 3 * s, -10 * s, 0, -9 * s);

        ctx.fill();

        // Shoulder highlights
        ctx.fillStyle = FleshUnitRenderer.FLESH_LIGHT;
        ctx.beginPath();
        ctx.ellipse(-6 * s, -5 * s, 3 * s * pulse, 2 * s, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(6 * s, -5 * s, 3 * s * pulse, 2 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // BLOATED BELLY
        const bellyPulse = 1 + Math.sin(t * 1.5) * 0.07;
        const bellyKick = Math.sin(t * 3) * 0.04;

        const bellyGrad = ctx.createRadialGradient(0, 7 * s, 1 * s, 0, 7 * s, 8 * s * bellyPulse);
        bellyGrad.addColorStop(0, FleshUnitRenderer.FLESH_PALE);
        bellyGrad.addColorStop(0.5, FleshUnitRenderer.FLESH_LIGHT);
        bellyGrad.addColorStop(1, FleshUnitRenderer.FLESH_MID);

        ctx.fillStyle = bellyGrad;
        ctx.beginPath();
        ctx.moveTo(-5 * s, 4 * s);
        ctx.bezierCurveTo(
            -9 * s * bellyPulse, 7 * s,
            -8 * s * (bellyPulse + bellyKick), 11 * s,
            0, 12 * s * bellyPulse
        );
        ctx.bezierCurveTo(
            8 * s * (bellyPulse + bellyKick), 11 * s,
            9 * s * bellyPulse, 7 * s,
            5 * s, 4 * s
        );
        ctx.fill();

        // Belly veins
        this.drawBellyVeinsFront(ctx, s, t, bellyPulse);

        // Something moving inside
        const bumpX = Math.sin(t * 2) * 3 * s;
        const bumpY = 8 * s + Math.cos(t * 2.5) * 1.5 * s;
        ctx.fillStyle = FleshUnitRenderer.FLESH_HIGHLIGHT;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.ellipse(bumpX, bumpY, 2.5 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    private drawBellyVeinsFront(ctx: CanvasRenderingContext2D, s: number, t: number, pulse: number) {
        const veinPulse = 0.5 + Math.sin(t * 4) * 0.4;

        ctx.strokeStyle = FleshUnitRenderer.BLOOD_DARK;
        ctx.lineWidth = 0.8 * s;
        ctx.globalAlpha = veinPulse * 0.5;

        // Left vein
        ctx.beginPath();
        ctx.moveTo(-4 * s, 5 * s);
        ctx.quadraticCurveTo(-6 * s, 8 * s, -5 * s, 11 * s);
        ctx.stroke();

        // Right vein
        ctx.beginPath();
        ctx.moveTo(4 * s, 5 * s);
        ctx.quadraticCurveTo(6 * s, 8 * s, 5 * s, 11 * s);
        ctx.stroke();

        // Center vein
        ctx.beginPath();
        ctx.moveTo(0, 5 * s);
        ctx.quadraticCurveTo(-1 * s, 8 * s, 0, 11 * s);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
    }

    private drawFatRollsFront(ctx: CanvasRenderingContext2D, s: number, t: number) {
        const wobble = Math.sin(t * 2) * 0.5 * s;

        // Side fat rolls
        ctx.fillStyle = FleshUnitRenderer.FLESH_DARK;
        ctx.beginPath();
        ctx.ellipse(-7 * s, 1 * s + wobble, 2 * s, 3 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(7 * s, 1 * s + wobble, 2 * s, 3 * s, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Lower belly fold
        ctx.strokeStyle = FleshUnitRenderer.FLESH_DEEPEST;
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(-4 * s, 4 * s);
        ctx.quadraticCurveTo(0, 5 * s + wobble, 4 * s, 4 * s);
        ctx.stroke();
    }

    private drawEmbeddedDebrisFront(ctx: CanvasRenderingContext2D, s: number, t: number) {
        // LEFT SHOULDER — Bone shard
        ctx.save();
        ctx.translate(-7 * s, -6 * s);
        ctx.rotate(-0.4);
        ctx.fillStyle = FleshUnitRenderer.BONE_PALE;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(1.2 * s, -0.5 * s);
        ctx.lineTo(0.8 * s, -6 * s);
        ctx.lineTo(-0.5 * s, -5 * s);
        ctx.fill();
        ctx.fillStyle = FleshUnitRenderer.BONE_DARK;
        ctx.beginPath();
        ctx.ellipse(0.3 * s, -5.5 * s, 1 * s, 0.7 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // RIGHT SIDE — Chain links
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.ellipse(8 * s, -2 * s, 1.2 * s, 1.8 * s, 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(9 * s, 0, 1.2 * s, 1.8 * s, -0.3, 0, Math.PI * 2);
        ctx.stroke();

        // CENTER — Rusted blade
        ctx.save();
        ctx.translate(3 * s, -2 * s);
        ctx.rotate(0.5);
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(1.5 * s, 0);
        ctx.lineTo(0.8 * s, 7 * s);
        ctx.lineTo(-0.3 * s, 6 * s);
        ctx.fill();
        // Blood around entry
        ctx.fillStyle = FleshUnitRenderer.BLOOD_DARK;
        ctx.beginPath();
        ctx.ellipse(0.5 * s, 0.5 * s, 1.5 * s, 1 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    private drawVisibleOrgansFront(ctx: CanvasRenderingContext2D, s: number, t: number, hp: number) {
        const organPulse = 1 + Math.sin(t * 4) * 0.15;
        const visibility = hp < 0.7 ? 0.8 : 0.5;

        ctx.globalAlpha = visibility;

        // Wound opening on belly
        ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
        ctx.beginPath();
        ctx.ellipse(-2 * s, 8 * s, 2.5 * s, 1.5 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Intestine coils
        ctx.fillStyle = FleshUnitRenderer.GORE_PINK;
        ctx.beginPath();
        ctx.arc(-2 * s, 8 * s, 1.2 * s * organPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-0.5 * s, 7.5 * s, 0.8 * s * organPulse, 0, Math.PI * 2);
        ctx.fill();

        // Pulsating organ (heart-like)
        const heartBeat = 1 + Math.sin(t * 6) * 0.2;
        ctx.fillStyle = FleshUnitRenderer.ORGAN_RED;
        ctx.shadowBlur = 6;
        ctx.shadowColor = FleshUnitRenderer.BLOOD_BRIGHT;
        ctx.beginPath();
        ctx.ellipse(2 * s, 6 * s, 1.5 * s * heartBeat, 1 * s * heartBeat, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1.0;
    }

    private drawStitchesFront(ctx: CanvasRenderingContext2D, s: number, t: number) {
        ctx.strokeStyle = FleshUnitRenderer.STITCH_DARK;
        ctx.lineWidth = 1.6 * s;

        // Main vertical stitch
        ctx.setLineDash([3 * s, 2 * s]);
        ctx.beginPath();
        ctx.moveTo(0, -8 * s);
        ctx.lineTo(0, 10 * s);
        ctx.stroke();

        // Horizontal stitch across belly
        ctx.beginPath();
        ctx.moveTo(-6 * s, 6 * s);
        ctx.quadraticCurveTo(0, 5 * s, 6 * s, 6 * s);
        ctx.stroke();
        ctx.setLineDash([]);

        // X-stitch marks
        ctx.lineWidth = 0.8 * s;
        const stitchPoints = [
            { x: 0, y: -6 }, { x: 0, y: -2 }, { x: 0, y: 2 }, { x: 0, y: 6 }
        ];
        stitchPoints.forEach(p => {
            ctx.beginPath();
            ctx.moveTo((p.x - 1) * s, (p.y - 1) * s);
            ctx.lineTo((p.x + 1) * s, (p.y + 1) * s);
            ctx.moveTo((p.x + 1) * s, (p.y - 1) * s);
            ctx.lineTo((p.x - 1) * s, (p.y + 1) * s);
            ctx.stroke();
        });
    }

    private drawEmbeddedFacesFront(ctx: CanvasRenderingContext2D, s: number, t: number) {
        // LEFT SIDE — Screaming face
        ctx.save();
        ctx.translate(-4 * s, 5 * s);
        ctx.rotate(0.3);

        ctx.fillStyle = FleshUnitRenderer.FLESH_PALE;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stitched eyes
        ctx.strokeStyle = FleshUnitRenderer.STITCH_DARK;
        ctx.lineWidth = 0.5 * s;
        ctx.beginPath();
        ctx.moveTo(-1 * s, -0.8 * s);
        ctx.lineTo(-0.3 * s, -0.6 * s);
        ctx.moveTo(0.3 * s, -0.6 * s);
        ctx.lineTo(1 * s, -0.8 * s);
        ctx.stroke();

        // Screaming mouth
        const mouthOpen = Math.sin(t * 2.5) * 0.3 + 0.5;
        ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
        ctx.beginPath();
        ctx.ellipse(0, 1 * s, 0.8 * s, mouthOpen * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // RIGHT SIDE — Half-absorbed face
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = FleshUnitRenderer.FLESH_MID;
        ctx.beginPath();
        ctx.ellipse(5 * s, 6 * s, 1.5 * s, 2 * s, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    private drawDamageEffectsFront(ctx: CanvasRenderingContext2D, s: number, t: number, hp: number) {
        const woundCount = hp < 0.3 ? 3 : 2;

        for (let i = 0; i < woundCount; i++) {
            const wx = (-3 + i * 3) * s;
            const wy = (-5 + i * 4) * s;

            ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
            ctx.beginPath();
            ctx.ellipse(wx, wy, 1.2 * s, 1.8 * s, i * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = FleshUnitRenderer.BLOOD_DARK;
            ctx.beginPath();
            ctx.ellipse(wx, wy + 1.5 * s, 0.8 * s, 1.2 * s, 0, 0, Math.PI);
            ctx.fill();
        }
    }

    private drawBellyMawFront(ctx: CanvasRenderingContext2D, s: number, t: number) {
        const mawPulse = Math.sin(t * 2) * 0.3 + 0.7;

        // Dark interior
        ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, 4 * s * mawPulse, 3 * s * mawPulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // Teeth around opening
        ctx.fillStyle = FleshUnitRenderer.BONE_PALE;
        const teethCount = 8;
        for (let i = 0; i < teethCount; i++) {
            const angle = (i / teethCount) * Math.PI * 2;
            const tx = Math.cos(angle) * 3.5 * s * mawPulse;
            const ty = 4 * s + Math.sin(angle) * 2.5 * s * mawPulse;

            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(angle + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(-0.5 * s, 0);
            ctx.lineTo(0, -2 * s);
            ctx.lineTo(0.5 * s, 0);
            ctx.fill();
            ctx.restore();
        }

        // Inner glow
        ctx.fillStyle = FleshUnitRenderer.ORGAN_RED;
        ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3;
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, 2 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    private drawEmbeddedFaceFront(ctx: CanvasRenderingContext2D, s: number, t: number) {
        // Face struggling beneath surface
        ctx.fillStyle = FleshUnitRenderer.FLESH_PALE;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Closed eyes
        ctx.strokeStyle = FleshUnitRenderer.STITCH_DARK;
        ctx.lineWidth = 0.7 * s;
        ctx.beginPath();
        ctx.arc(-1 * s, -0.5 * s, 0.8 * s, Math.PI, 0);
        ctx.arc(1 * s, -0.5 * s, 0.8 * s, Math.PI, 0);
        ctx.stroke();

        // Open mouth screaming
        const scream = Math.sin(t * 3) * 0.2 + 0.6;
        ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
        ctx.beginPath();
        ctx.ellipse(0, 1.5 * s, 1.2 * s * scream, 0.8 * s * scream, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawHeadFront(ctx: CanvasRenderingContext2D, s: number, t: number) {
        // Lumpy, asymmetric head
        ctx.fillStyle = FleshUnitRenderer.FLESH_MID;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Growth on side
        ctx.fillStyle = FleshUnitRenderer.FLESH_LIGHT;
        ctx.beginPath();
        ctx.ellipse(3 * s, -2 * s, 2 * s, 1.5 * s, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Eyes — asymmetric
        // Left eye (big, staring)
        const eyePulse = 1 + Math.sin(t * 6) * 0.1;
        ctx.fillStyle = FleshUnitRenderer.EYE_WHITE;
        ctx.beginPath();
        ctx.ellipse(-2 * s, -1 * s, 1.5 * s * eyePulse, 1.2 * s * eyePulse, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = FleshUnitRenderer.EYE_PUPIL;
        ctx.beginPath();
        ctx.arc(-2 * s, -1 * s, 0.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Right eye (smaller, different position)
        ctx.fillStyle = FleshUnitRenderer.EYE_WHITE;
        ctx.beginPath();
        ctx.ellipse(1.5 * s, 0, 1 * s, 0.8 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = FleshUnitRenderer.EYE_PUPIL;
        ctx.beginPath();
        ctx.arc(1.6 * s, 0, 0.35 * s, 0, Math.PI * 2);
        ctx.fill();

        // Third eye (stitched)
        ctx.strokeStyle = FleshUnitRenderer.STITCH_DARK;
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(-0.5 * s, 1.5 * s);
        ctx.lineTo(0.5 * s, 2 * s);
        ctx.stroke();

        // Mouth (drooling)
        ctx.fillStyle = FleshUnitRenderer.FLESH_DEEPEST;
        ctx.beginPath();
        ctx.ellipse(0, 3.5 * s, 2 * s, 1 * s, 0, 0, Math.PI);
        ctx.fill();
    }

    // =====================================================================
    // BACK VIEW
    // =====================================================================
    private drawBack(ctx: CanvasRenderingContext2D, s: number, cycle: number, isMoving: boolean, t: number, hp: number) {
        const bounce = isMoving ? Math.abs(Math.sin(cycle * 0.5)) * 3 * s : 0;
        const pulse = 1 + Math.sin(t * 1.5) * 0.05;

        ctx.translate(0, -bounce);

        // Legs connected at waist level

        // Tentacles from back
        this.drawTentacles(ctx, -8 * s, -5 * s, s, t, false);
        this.drawTentacles(ctx, 8 * s, -5 * s, s, t, false);

        // Legs — connected at waist
        this.drawLegFront(ctx, -5 * s, 8 * s, cycle, 0, s, false);
        this.drawLegFront(ctx, 5 * s, 8 * s, cycle, Math.PI, s, false);

        // Main body
        const backGrad = ctx.createRadialGradient(0, 0, 2 * s, 0, 0, 14 * s);
        backGrad.addColorStop(0, FleshUnitRenderer.FLESH_MID);
        backGrad.addColorStop(1, FleshUnitRenderer.FLESH_DEEPEST);

        ctx.fillStyle = backGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12 * s * pulse, 10 * s * pulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // Spine bumps
        for (let i = 0; i < 5; i++) {
            const yPos = -8 * s + i * 3.5 * s;
            const bumpPulse = 1 + Math.sin(t * 3 + i) * 0.15;

            ctx.fillStyle = FleshUnitRenderer.FLESH_LIGHT;
            ctx.beginPath();
            ctx.ellipse(0, yPos, 2.5 * s * bumpPulse, 1.5 * s, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Cross stitches on back
        ctx.strokeStyle = FleshUnitRenderer.STITCH_DARK;
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(-6 * s, -4 * s);
        ctx.lineTo(6 * s, 4 * s);
        ctx.moveTo(6 * s, -4 * s);
        ctx.lineTo(-6 * s, 4 * s);
        ctx.stroke();

        // Embedded chains
        ctx.strokeStyle = '#607d8b';
        ctx.lineWidth = 1.8 * s;
        ctx.beginPath();
        ctx.ellipse(-8 * s, 2 * s, 1.5 * s, 2.5 * s, 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(-9 * s, 4.5 * s, 1.5 * s, 2.5 * s, -0.3, 0, Math.PI * 2);
        ctx.stroke();

        // Back of head
        ctx.fillStyle = FleshUnitRenderer.FLESH_DARK;
        ctx.beginPath();
        ctx.ellipse(0, -10 * s, 4 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        this.drawDrippingGore(ctx, s, t, isMoving);
    }

    // =====================================================================
    // SHARED COMPONENTS
    // =====================================================================

    private drawLegSide(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, phase: number, s: number, far: boolean) {
        const swing = Math.sin(cycle + phase) * 0.2;
        const squash = 1 + Math.abs(Math.sin(cycle + phase)) * 0.1;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(swing);

        // Thick, stumpy leg
        const legGrad = ctx.createLinearGradient(0, 0, 0, 7 * s);
        legGrad.addColorStop(0, far ? FleshUnitRenderer.FLESH_DARK : FleshUnitRenderer.FLESH_MID);
        legGrad.addColorStop(1, FleshUnitRenderer.FLESH_DEEPEST);

        ctx.fillStyle = legGrad;
        ctx.beginPath();
        ctx.moveTo(-3 * s, 0);
        ctx.bezierCurveTo(-3.5 * s * squash, 3 * s, -3 * s, 5 * s, -2 * s, 7 * s);
        ctx.lineTo(2 * s, 7 * s);
        ctx.bezierCurveTo(3 * s, 5 * s, 3.5 * s * squash, 3 * s, 3 * s, 0);
        ctx.fill();

        // Foot/hoof
        ctx.fillStyle = FleshUnitRenderer.FLESH_DARK;
        ctx.beginPath();
        ctx.ellipse(0, 7.5 * s, 3 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fat roll on thigh
        if (!far) {
            ctx.fillStyle = FleshUnitRenderer.FLESH_LIGHT;
            ctx.beginPath();
            ctx.ellipse(0, 1 * s, 3.5 * s * squash, 1.5 * s, 0, 0, Math.PI);
            ctx.fill();
        }

        ctx.restore();
    }

    private drawLegFront(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, phase: number, s: number, far: boolean) {
        const lift = Math.max(0, Math.sin(cycle + phase)) * 3 * s;
        const squash = 1 + Math.cos(cycle + phase) * 0.1;

        ctx.save();
        ctx.translate(x, y - lift);

        const legColor = far ? FleshUnitRenderer.FLESH_DARK : FleshUnitRenderer.FLESH_MID;
        ctx.fillStyle = legColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3 * s * squash, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Foot
        ctx.translate(0, 6 * s);
        ctx.fillStyle = FleshUnitRenderer.FLESH_DARK;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.5 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawEmissive(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        // Optional: Add sickly glow from belly maw or eyes
    }
}
