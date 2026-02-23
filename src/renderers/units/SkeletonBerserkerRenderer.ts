import { BaseSkeletonRenderer, SkeletonPose } from './BaseSkeletonRenderer';
import { SpriteFacing } from './CachedUnitRenderer';
import { Enemy } from '../../Enemy';
import { Assets } from '../../Assets';

export class SkeletonBerserkerRenderer extends BaseSkeletonRenderer {
    protected override boneMain = '#d4cba7'; // Grimy bone color
    protected override eyeGlow = '#d32f2f'; // Enraged red eyes

    private static readonly PELT_COLORS = ['#3e2723', '#4e342e', '#5d4037'];
    private static readonly AXE_HANDLE = '#3e2723';
    private static readonly AXE_BLADE = '#78909c';
    private static readonly WARPAINT_COLOR = '#b71c1c';

    // Optional slightly bulkier look
    public override drawFrameDirectional(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number, facing: SpriteFacing): void {
        ctx.save();
        // Scale to make him slightly wider/bulkier without affecting height disproportionately
        ctx.scale(1.1, 1.05);
        super.drawFrameDirectional(ctx, enemy, t, facing);
        ctx.restore();
    }

    protected drawBodyArmor(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        const s = pose.scale;

        ctx.save();
        ctx.translate(pose.anchors.torso.x, pose.anchors.torso.y);

        // Bear pelt / animal skins draped over shoulders and back
        ctx.fillStyle = SkeletonBerserkerRenderer.PELT_COLORS[0];
        ctx.beginPath();

        if (pose.facing === 'SIDE') {
            // Pelt draped over the back and shoulder
            ctx.moveTo(0, -6 * s);
            ctx.quadraticCurveTo(-6 * s, -4 * s, -5 * s, 6 * s); // Hangs down the back
            ctx.quadraticCurveTo(-1 * s, 8 * s, 1 * s, 4 * s);
            ctx.quadraticCurveTo(3 * s, 0, 0, -6 * s);
            ctx.fill();

            // Fur texture breaks
            ctx.strokeStyle = SkeletonBerserkerRenderer.PELT_COLORS[1];
            ctx.lineWidth = 1 * s;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-4 * s, (-2 + i * 3) * s);
                ctx.lineTo(-6 * s, (-1 + i * 3) * s);
                ctx.stroke();
            }
        } else if (pose.facing === 'UP') {
            // Full back covered in pelt
            ctx.moveTo(-7 * s, -6 * s);
            ctx.quadraticCurveTo(0, -8 * s, 7 * s, -6 * s);
            ctx.lineTo(8 * s, 4 * s);
            // Jagged bottom edge
            ctx.lineTo(4 * s, 7 * s);
            ctx.lineTo(0, 5 * s);
            ctx.lineTo(-4 * s, 7 * s);
            ctx.lineTo(-8 * s, 4 * s);
            ctx.closePath();
            ctx.fill();

            // Spine ridge fur
            ctx.fillStyle = SkeletonBerserkerRenderer.PELT_COLORS[1];
            ctx.beginPath();
            ctx.ellipse(0, 0, 3 * s, 6 * s, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // DOWN (Front)
            // Pelt visible on shoulders, secured by a strap
            ctx.moveTo(-7 * s, -6 * s);
            ctx.quadraticCurveTo(0, -8 * s, 7 * s, -6 * s);
            ctx.lineTo(6 * s, -2 * s);
            ctx.lineTo(4 * s, 2 * s);
            // Hanging down sides
            ctx.quadraticCurveTo(0, -2 * s, -4 * s, 2 * s);
            ctx.lineTo(-6 * s, -2 * s);
            ctx.closePath();
            ctx.fill();

            // Leather cross-belt to hold it
            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 2 * s;
            ctx.beginPath();
            ctx.moveTo(-4 * s, -2 * s);
            ctx.lineTo(4 * s, 5 * s);
            ctx.moveTo(4 * s, -2 * s);
            ctx.lineTo(-4 * s, 5 * s);
            ctx.stroke();
        }

        ctx.restore();
    }

    protected drawHeadDecoration(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        const s = pose.scale;

        ctx.save();
        ctx.translate(pose.anchors.head.x, pose.anchors.head.y);
        ctx.rotate(pose.anchors.head.angle);

        // 1. MUST DRAW SKULL FIRST
        this.drawSkull(ctx, s, pose.facing);

        // 2. Warpaint on skull
        ctx.strokeStyle = SkeletonBerserkerRenderer.WARPAINT_COLOR;
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        if (pose.facing === 'DOWN') {
            // Vertical blood stripes over the eyes
            ctx.moveTo(-2 * s, -3 * s); ctx.lineTo(-2 * s, 2 * s);
            ctx.moveTo(2 * s, -3 * s); ctx.lineTo(2 * s, 2 * s);
            // V shape on forehead
            ctx.moveTo(0, -1 * s); ctx.lineTo(-1 * s, -3 * s);
            ctx.moveTo(0, -1 * s); ctx.lineTo(1 * s, -3 * s);
        } else if (pose.facing === 'SIDE') {
            ctx.moveTo(1 * s, -3 * s); ctx.lineTo(3 * s, 2 * s);
            ctx.moveTo(-1 * s, -3 * s); ctx.lineTo(2 * s, 1 * s);
        } else if (pose.facing === 'UP') {
            // Warpaint on back of skull
            ctx.moveTo(-2 * s, -3 * s); ctx.lineTo(2 * s, -1 * s);
            ctx.moveTo(-2 * s, -1 * s); ctx.lineTo(2 * s, -3 * s);
        }
        ctx.stroke();

        // 3. Animal skull/hood worn as a helmet
        ctx.fillStyle = SkeletonBerserkerRenderer.PELT_COLORS[0];
        ctx.beginPath();
        if (pose.facing === 'SIDE') {
            ctx.arc(-1 * s, -3 * s, 6 * s, Math.PI, 0);
            ctx.lineTo(2 * s, -2 * s);
            ctx.lineTo(-4 * s, 0);
            ctx.fill();

            // Little bear ear
            ctx.beginPath();
            ctx.arc(-2 * s, -7 * s, 1.5 * s, 0, Math.PI * 2);
            ctx.fill();
        } else if (pose.facing === 'UP') {
            ctx.arc(0, -3 * s, 6.5 * s, Math.PI, 0); // Covers top
            ctx.fill();
            // Ears
            ctx.beginPath(); ctx.arc(-3 * s, -7 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3 * s, -7 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
        } else {
            // DOWN - Hood over the top
            ctx.arc(0, -4 * s, 6.5 * s, Math.PI, 0);
            ctx.fill();
            // Ears
            ctx.beginPath(); ctx.arc(-3 * s, -8 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3 * s, -8 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }

    protected drawLeftHandItem(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        // Nothing in left hand (Two-handed axe is drawn in right hand, 
        // but we'll adapt its visual position to look held by both if needed)
    }

    protected drawRightHandItem(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        // Massive Two-Handed Axe
        ctx.save();
        ctx.translate(pose.anchors.rightHand.x, pose.anchors.rightHand.y);
        const s = pose.scale;

        if (pose.facing === 'SIDE') {
            // Dragging or carrying the axe
            ctx.rotate(0.3); // Heavy tilt

            // Handle
            ctx.fillStyle = SkeletonBerserkerRenderer.AXE_HANDLE;
            ctx.fillRect(-1.5 * s, -15 * s, 3 * s, 32 * s); // Thinner, realistic long handle
            // Base pommel
            ctx.fillStyle = '#111';
            ctx.fillRect(-2.5 * s, 15 * s, 5 * s, 3 * s);

            // Double blade - Sharp Battle Axe Crescent shape
            ctx.fillStyle = SkeletonBerserkerRenderer.AXE_BLADE;
            ctx.beginPath();
            // Right Blade
            ctx.moveTo(1.5 * s, -12 * s);
            ctx.quadraticCurveTo(8 * s, -16 * s, 10 * s, -10 * s); // Top edge tapering to tip
            ctx.quadraticCurveTo(12 * s, -6 * s, 8 * s, -1 * s);  // Outer cutting edge
            ctx.quadraticCurveTo(5 * s, -4 * s, 1.5 * s, -5 * s); // Bottom edge hooking back to shaft
            // Left Blade
            ctx.moveTo(-1.5 * s, -12 * s);
            ctx.quadraticCurveTo(-8 * s, -16 * s, -10 * s, -10 * s);
            ctx.quadraticCurveTo(-12 * s, -6 * s, -8 * s, -1 * s);
            ctx.quadraticCurveTo(-5 * s, -4 * s, -1.5 * s, -5 * s);
            ctx.fill();

            // Edge Highlights
            ctx.strokeStyle = '#cfd8dc';
            ctx.lineWidth = 1 * s;
            ctx.beginPath();
            ctx.moveTo(10 * s, -10 * s); ctx.quadraticCurveTo(12 * s, -6 * s, 8 * s, -1 * s);
            ctx.moveTo(-10 * s, -10 * s); ctx.quadraticCurveTo(-12 * s, -6 * s, -8 * s, -1 * s);
            ctx.stroke();

        } else if (pose.facing === 'UP') {
            // Resting on back / carried
            ctx.rotate(Math.PI / 4 || 0.78);

            ctx.fillStyle = SkeletonBerserkerRenderer.AXE_HANDLE;
            ctx.fillRect(-1.5 * s, -18 * s, 3 * s, 32 * s);

            // Same realistic crescent profile
            ctx.fillStyle = SkeletonBerserkerRenderer.AXE_BLADE;
            ctx.beginPath();
            // Right Blade
            ctx.moveTo(1.5 * s, -15 * s);
            ctx.quadraticCurveTo(8 * s, -19 * s, 10 * s, -13 * s);
            ctx.quadraticCurveTo(12 * s, -9 * s, 8 * s, -4 * s);
            ctx.quadraticCurveTo(5 * s, -7 * s, 1.5 * s, -8 * s);
            // Left Blade
            ctx.moveTo(-1.5 * s, -15 * s);
            ctx.quadraticCurveTo(-8 * s, -19 * s, -10 * s, -13 * s);
            ctx.quadraticCurveTo(-12 * s, -9 * s, -8 * s, -4 * s);
            ctx.quadraticCurveTo(-5 * s, -7 * s, -1.5 * s, -8 * s);
            ctx.fill();
        } else {
            // DOWN - Pointing outwards/downwards, highly foreshortened
            ctx.rotate(1.57); // 90 degrees
            ctx.fillStyle = SkeletonBerserkerRenderer.AXE_HANDLE;
            ctx.fillRect(-1.5 * s, -4 * s, 3 * s, 25 * s);

            // Edge-on view of curved blades
            ctx.fillStyle = SkeletonBerserkerRenderer.AXE_BLADE;
            ctx.beginPath();
            // Right half
            ctx.moveTo(1 * s, 12 * s);
            ctx.quadraticCurveTo(11 * s, 13 * s, 11 * s, 17 * s); // Curved tip
            ctx.lineTo(8 * s, 18 * s); // Tapering
            ctx.lineTo(1 * s, 15 * s);
            // Left half
            ctx.moveTo(-1 * s, 12 * s);
            ctx.quadraticCurveTo(-11 * s, 13 * s, -11 * s, 17 * s);
            ctx.lineTo(-8 * s, 18 * s);
            ctx.lineTo(-1 * s, 15 * s);
            ctx.fill();

            ctx.strokeStyle = '#cfd8dc'; // Edge highlight closest to camera
            ctx.lineWidth = 1 * s;
            ctx.beginPath();
            ctx.moveTo(-11 * s, 17 * s); ctx.lineTo(-8 * s, 18 * s);
            ctx.lineTo(8 * s, 18 * s); ctx.lineTo(11 * s, 17 * s);
            ctx.stroke();
        }

        ctx.restore();
    }

    // OVERLAY: Add Enrage Glow when HP < 50%
    protected drawOverlay(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        const enemyAny = (this as any).__currentEnemy; // Small hack to access enemy if needed in overlay
        // However, we don't pass enemy to drawOverlay. 
        // We will do Enrage glow in drawEmissive instead!
    }

    public drawEmissive(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        // Enrage Aura check
        const hpPercent = enemy.currentHealth / enemy.maxHealth;
        if (hpPercent < 0.5) {
            ctx.save();
            const time = performance.now() * 0.005; // Use performance.now() for smoother and consistent time
            const pulse = 0.6 + Math.sin(time) * 0.4; // 0.2 to 1.0

            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.4 * pulse;

            // Red aura around the enemy (using pre-baked asset for performance instead of createRadialGradient)
            const glowAsset = Assets.get('fx_glow_red');
            if (glowAsset) {
                const r = 35 * scale; // Increase slightly for better visual effect matching the original gradient
                ctx.drawImage(glowAsset, -r, -10 * scale - r, r * 2, r * 2);
            }

            ctx.restore();
        }
    }
}
