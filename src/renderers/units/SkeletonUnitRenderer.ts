import { BaseSkeletonRenderer, SkeletonPose } from './BaseSkeletonRenderer';

/**
 * Standard Sword and Shield Skeleton.
 * Implements the layered hooks provided by BaseSkeletonRenderer.
 */
export class SkeletonUnitRenderer extends BaseSkeletonRenderer {
    // Palette
    private static readonly ARMOR_DARK = '#2d2d2d'; // Original dark
    private static readonly ARMOR_LIGHT = '#546e7a'; // Original plate metallic
    private static readonly SHIELD_WOOD = '#5d4037'; // Original wood
    private static readonly SHIELD_RIM = '#8d6e63'; // Original rim

    // Eye glow and head radius are inherited from BaseSkeletonRenderer

    // We don't need to override getBakeFacings, as BaseSkeletonRenderer provides ['SIDE', 'UP', 'DOWN']
    // We don't need to override drawFrameDirectional either, the base handles Z-ordering

    // ============================================================================
    // LAYERED RENDERING HOOKS
    // ============================================================================

    protected override drawHeadDecoration(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        ctx.save();
        ctx.translate(pose.anchors.head.x, pose.anchors.head.y);
        ctx.rotate(pose.anchors.head.angle);

        const s = pose.scale;

        // Draw Skull base (shared from BaseSkeletonRenderer)
        this.drawSkull(ctx, s, pose.facing);

        ctx.restore();
    }

    protected override drawBodyArmor(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {

        ctx.save();
        ctx.translate(pose.anchors.torso.x, pose.anchors.torso.y);
        const s = pose.scale;

        ctx.fillStyle = SkeletonUnitRenderer.ARMOR_DARK;
        ctx.beginPath();

        if (pose.facing === 'SIDE') {
            // Chestplate side view
            ctx.ellipse(0, -1 * s, 4 * s, 6 * s, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Chestplate front/back
            ctx.moveTo(-7 * s, -7 * s);
            ctx.lineTo(7 * s, -7 * s);
            ctx.lineTo(5 * s, 5 * s);
            ctx.lineTo(-5 * s, 5 * s);
            ctx.fill();

            // Plate details
            ctx.strokeStyle = SkeletonUnitRenderer.ARMOR_LIGHT;
            ctx.lineWidth = 2 * s;
            ctx.beginPath();
            if (pose.facing === 'DOWN') {
                ctx.moveTo(-4 * s, -2 * s); ctx.lineTo(4 * s, -2 * s);
                ctx.moveTo(-3 * s, 1 * s); ctx.lineTo(3 * s, 1 * s);
            } else {
                ctx.moveTo(0, -6 * s); ctx.lineTo(0, 4 * s);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    protected override drawLeftHandItem(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        // Shield
        ctx.save();
        ctx.translate(pose.anchors.leftHand.x, pose.anchors.leftHand.y);
        const s = pose.scale;

        if (pose.facing === 'SIDE') {
            // Shield Side (edge profile)
            ctx.translate(0, 3 * s);
            ctx.fillStyle = SkeletonUnitRenderer.SHIELD_WOOD;
            ctx.beginPath();
            ctx.ellipse(0, 0, 1.5 * s, 6 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = SkeletonUnitRenderer.SHIELD_RIM;
            ctx.lineWidth = 1 * s;
            ctx.stroke();
        } else if (pose.facing === 'DOWN') {
            // Shield Front
            ctx.translate(0, 3 * s);
            ctx.fillStyle = SkeletonUnitRenderer.SHIELD_WOOD;
            ctx.beginPath(); ctx.arc(0, 0, 6 * s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = SkeletonUnitRenderer.SHIELD_RIM;
            ctx.lineWidth = 2 * s;
            ctx.stroke();
        } else {
            // Shield Back
            ctx.translate(0, 3 * s);
            ctx.fillStyle = '#3e2723';
            ctx.beginPath(); ctx.arc(0, 0, 6 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.fillRect(-2 * s, -1 * s, 4 * s, 2 * s); // Strap
        }

        ctx.restore();
    }

    protected override drawRightHandItem(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        // Sword
        ctx.save();
        ctx.translate(pose.anchors.rightHand.x, pose.anchors.rightHand.y);
        const s = pose.scale;

        if (pose.facing === 'SIDE') {
            ctx.rotate(0.5); // Angle forward
            ctx.fillStyle = '#cfd8dc';
            ctx.fillRect(0, -1 * s, 14 * s, 2 * s); // Blade
            ctx.fillStyle = SkeletonUnitRenderer.ARMOR_LIGHT;
            ctx.fillRect(0, -3 * s, 2 * s, 6 * s); // Guard
        } else {
            // Front/Back
            ctx.rotate(Math.PI / 2); // Pointing down
            ctx.fillStyle = '#cfd8dc';
            ctx.beginPath();
            ctx.moveTo(-1 * s, 0); ctx.lineTo(1 * s, 0);
            ctx.lineTo(0, 14 * s);
            ctx.fill();
            ctx.fillStyle = SkeletonUnitRenderer.ARMOR_LIGHT;
            ctx.fillRect(-3 * s, -1 * s, 6 * s, 1 * s);
        }

        ctx.restore();
    }
}
