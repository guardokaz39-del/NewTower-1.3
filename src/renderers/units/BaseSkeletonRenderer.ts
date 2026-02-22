import { CachedUnitRenderer, SpriteFacing } from './CachedUnitRenderer';
import { Enemy } from '../../Enemy';

export interface SkeletonPose {
    facing: SpriteFacing;
    scale: number;
    cycle: number;     // 0..1 (progress of walk or idle)
    isMoving: boolean; // true = walk, false = idle

    // Joint positions for drawing procedural body
    joints: {
        pelvis: { x: number, y: number },
        neck: { x: number, y: number },
        shoulderL: { x: number, y: number },
        shoulderR: { x: number, y: number },
        elbowL: { x: number, y: number },
        elbowR: { x: number, y: number },
        wristL: { x: number, y: number },
        wristR: { x: number, y: number },
        hipL: { x: number, y: number },
        hipR: { x: number, y: number },
        kneeL: { x: number, y: number },
        kneeR: { x: number, y: number },
        ankleL: { x: number, y: number },
        ankleR: { x: number, y: number }
    };

    // Anchors for child classes to attach equipment
    anchors: {
        head: { x: number, y: number, angle: number },
        leftHand: { x: number, y: number, angle: number },
        rightHand: { x: number, y: number, angle: number },
        back: { x: number, y: number },
        torso: { x: number, y: number }
    };
}

/**
 * Base abstract robust class for all Skeleton variations.
 * Follows AAA Visual Design Guidelines for 2D multi-segment kinematic rendering.
 * Provides a Template Method API for subclasses.
 */
export abstract class BaseSkeletonRenderer extends CachedUnitRenderer {
    protected spriteSize: number = 96; // 1.5x of 64 to fit weapons
    protected orientationMode: 'DIR3' = 'DIR3'; // Force DIR3 baking
    protected walkCycleMultiplier: number = 0.12;

    // Constants    // Bone structure lengths
    protected static readonly THIGH_LEN = 6.5;
    protected static readonly CALF_LEN = 6.5;
    protected static readonly UPPER_ARM_LEN = 5.5;
    protected static readonly LOWER_ARM_LEN = 5.5;

    // Default colors for base bone drawing
    protected static readonly BONE_MAIN = '#e0d0b0'; // Restored original light bone tint
    protected static readonly BONE_SHADOW = '#4e342e'; // Strong dark brown for outline context to pop from road
    protected static readonly BONE_DARK = '#a89070'; // Original recessed bone

    public getBakeFacings(): ('SIDE' | 'UP' | 'DOWN')[] {
        return ['SIDE', 'UP', 'DOWN'];
    }

    // =========================================================
    // TEMPLATE METHOD HOOKS FOR SUBCLASSES (Z-Pass Execution)
    // =========================================================

    /** Pass 1: Objects below the body (e.g., cape back) */
    protected drawUnderlay(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void { }

    /** Pass 2: Objects on the back (e.g., quiver, backpack) */
    protected drawBackItem(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void { }

    /** Pass 3: Torso armor (e.g., chestplate) */
    protected drawBodyArmor(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void { }

    /** Pass 4: Head decoration (e.g., helmet, hood) */
    protected drawHeadDecoration(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void { }

    /** Pass 5: Left hand equipment (e.g., shield, bow) */
    protected drawLeftHandItem(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void { }

    /** Pass 6: Right hand equipment (e.g., sword, wand) */
    protected drawRightHandItem(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void { }

    /** Pass 7: Overlay effects (e.g., magic glow, particles) */
    protected drawOverlay(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void { }


    // =========================================================
    // CORE KINEMATICS AND RENDERING
    // =========================================================

    public override drawFrameDirectional(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number, facing: SpriteFacing): void {
        const enemyAny = enemy as any;
        const isMoving = enemyAny.isMoving !== undefined ? enemyAny.isMoving : true;

        ctx.save();

        // Compute Rig
        const pose = this.computePose(t, isMoving, facing);

        // Execute strictly ordered Z-Pass rendering
        this.drawUnderlay(ctx, pose);
        this.renderBodyBase(ctx, pose);
        this.drawBackItem(ctx, pose);
        this.drawBodyArmor(ctx, pose);
        this.drawHeadDecoration(ctx, pose);

        // Hand item depth sorting based on facing
        if (facing === 'UP') {
            // Right hand behind, Left hand behind
            this.drawRightHandItem(ctx, pose);
            this.drawLeftHandItem(ctx, pose);
        } else {
            // SIDE & DOWN: Normal
            this.drawLeftHandItem(ctx, pose);
            this.drawRightHandItem(ctx, pose);
        }

        this.drawOverlay(ctx, pose);

        ctx.restore();
    }

    // Use default drawFrame for SIDE as fallback
    public override drawFrame(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number): void {
        this.drawFrameDirectional(ctx, enemy, t, 'SIDE');
    }

    /**
     * Calculates the entire skeletal rig based on the current cycle and orientation.
     */
    private computePose(cycle: number, isMoving: boolean, facing: SpriteFacing): SkeletonPose {
        const s = 1; // Temporary scale multiplier (to be passed down)

        // Basic rhythmic parameters
        let bounce = 0;
        let sway = 0;
        let breath = 0;

        const pi2 = Math.PI * 2;

        if (isMoving) {
            bounce = Math.abs(Math.sin(cycle * pi2)) * 3;
            sway = Math.sin(cycle * pi2) * 2;
        } else {
            // Breathing animation only
            breath = Math.sin(cycle * pi2) * 1.5;
        }

        // Initialize empty pose
        const p: SkeletonPose = {
            facing,
            scale: s,
            cycle,
            isMoving,
            joints: {
                pelvis: { x: 0, y: -bounce + breath * 0.2 },
                neck: { x: 0, y: -20 * s - bounce - breath * 0.8 },
                shoulderL: { x: 0, y: 0 },
                shoulderR: { x: 0, y: 0 },
                elbowL: { x: 0, y: 0 },
                elbowR: { x: 0, y: 0 },
                wristL: { x: 0, y: 0 },
                wristR: { x: 0, y: 0 },
                hipL: { x: 0, y: 0 },
                hipR: { x: 0, y: 0 },
                kneeL: { x: 0, y: 0 },
                kneeR: { x: 0, y: 0 },
                ankleL: { x: 0, y: 0 },
                ankleR: { x: 0, y: 0 }
            },
            anchors: {
                head: { x: 0, y: 0, angle: 0 },
                leftHand: { x: 0, y: 0, angle: 0 },
                rightHand: { x: 0, y: 0, angle: 0 },
                back: { x: 0, y: 0 },
                torso: { x: 0, y: 0 }
            }
        };

        // --- Kinematics Math placeholder logic ---
        // (This will be expanded extensively with 2D IK and math)
        // Set up anchor targets based on facing and cycle
        this.applyProceduralIK(p);

        // Map anchors to computed joints
        p.anchors.head = { x: p.joints.neck.x + sway * 0.5, y: p.joints.neck.y - 3 * s, angle: sway * 0.05 };
        p.anchors.leftHand = { x: p.joints.wristL.x, y: p.joints.wristL.y, angle: 0 };
        p.anchors.rightHand = { x: p.joints.wristR.x, y: p.joints.wristR.y, angle: 0 };
        p.anchors.back = { x: p.joints.neck.x, y: (p.joints.neck.y + p.joints.pelvis.y) / 2 };
        p.anchors.torso = { x: p.joints.neck.x, y: p.joints.neck.y + 5 * s };

        return p;
    }

    /**
     * Internal implementation of 2D Inverse Kinematics for legs and arms.
     */
    private applyProceduralIK(p: SkeletonPose) {
        const s = p.scale;
        const bounce = (p.isMoving ? Math.abs(Math.sin(p.cycle * Math.PI * 2)) * 3 : 0);
        const sway = (p.isMoving ? Math.sin(p.cycle * Math.PI * 2) * 2 : 0);
        const breath = (!p.isMoving ? Math.sin(p.cycle * Math.PI * 2) * 1.5 : 0);

        // Core base positions (pelvis/neck)
        p.joints.pelvis = { x: 0, y: 3 * s - bounce + breath * 0.2 };
        p.joints.neck = { x: 0, y: -7 * s - bounce - breath * 0.8 };

        const pi = Math.PI;
        const cycleL = p.cycle * pi * 2;
        const cycleR = cycleL + pi;
        const feetY = 14 * s;

        // ============================================
        // 1. SIDE VIEW (True 2D IK)
        // ============================================
        if (p.facing === 'SIDE') {
            const strideRadius = 5 * s;
            const strideLift = 4 * s;

            p.joints.hipL = { x: p.joints.pelvis.x, y: p.joints.pelvis.y };
            p.joints.hipR = { x: p.joints.pelvis.x, y: p.joints.pelvis.y };

            if (p.isMoving) {
                p.joints.ankleL = {
                    x: Math.cos(cycleL) * strideRadius,
                    y: feetY + (Math.sin(cycleL) < 0 ? Math.sin(cycleL) * strideLift : 0)
                };
                p.joints.ankleR = {
                    x: Math.cos(cycleR) * strideRadius,
                    y: feetY + (Math.sin(cycleR) < 0 ? Math.sin(cycleR) * strideLift : 0)
                };
            } else {
                p.joints.ankleL = { x: -3 * s, y: feetY };
                p.joints.ankleR = { x: 3 * s, y: feetY };
            }

            // Knees bend forward
            p.joints.kneeL = this.solve2BoneIK(p.joints.hipL.x, p.joints.hipL.y, p.joints.ankleL.x, p.joints.ankleL.y, BaseSkeletonRenderer.THIGH_LEN * s, BaseSkeletonRenderer.CALF_LEN * s, true);
            p.joints.kneeR = this.solve2BoneIK(p.joints.hipR.x, p.joints.hipR.y, p.joints.ankleR.x, p.joints.ankleR.y, BaseSkeletonRenderer.THIGH_LEN * s, BaseSkeletonRenderer.CALF_LEN * s, false);

            p.joints.shoulderL = { x: p.joints.neck.x, y: p.joints.neck.y + 2 * s };
            p.joints.shoulderR = { x: p.joints.neck.x, y: p.joints.neck.y + 2 * s };

            const armSwing = 5 * s;
            if (p.isMoving) {
                p.joints.wristL = {
                    x: p.joints.shoulderL.x + Math.sin(cycleL) * armSwing,
                    y: p.joints.shoulderL.y + 7 * s + (-bounce + breath) * 0.5
                };
                p.joints.wristR = {
                    x: p.joints.shoulderR.x + Math.sin(cycleR) * armSwing,
                    y: p.joints.shoulderR.y + 7 * s + (-bounce + breath) * 0.5
                };
            } else {
                p.joints.wristL = { x: p.joints.shoulderL.x, y: p.joints.shoulderL.y + 7 * s };
                p.joints.wristR = { x: p.joints.shoulderR.x, y: p.joints.shoulderR.y + 7 * s };
            }

            // Elbows bend backward (false)
            p.joints.elbowL = this.solve2BoneIK(p.joints.shoulderL.x, p.joints.shoulderL.y, p.joints.wristL.x, p.joints.wristL.y, BaseSkeletonRenderer.UPPER_ARM_LEN * s, BaseSkeletonRenderer.LOWER_ARM_LEN * s, false);
            p.joints.elbowR = this.solve2BoneIK(p.joints.shoulderR.x, p.joints.shoulderR.y, p.joints.wristR.x, p.joints.wristR.y, BaseSkeletonRenderer.UPPER_ARM_LEN * s, BaseSkeletonRenderer.LOWER_ARM_LEN * s, false);

            // ============================================
            // 2. FRONT/BACK VIEW (Projected Pseudo-3D IK)
            // ============================================
        } else {
            const isUp = p.facing === 'UP';
            const walkDir = isUp ? -1 : 1;
            const strideDepth = 4 * s;
            const strideLift = 4 * s;

            p.joints.hipL = { x: p.joints.pelvis.x - 3 * s, y: p.joints.pelvis.y };
            p.joints.hipR = { x: p.joints.pelvis.x + 3 * s, y: p.joints.pelvis.y };

            if (p.isMoving) {
                // Moving forward relative to facing triggers lift
                const cosL = Math.cos(cycleL);
                const isSwingingForwardL = (cosL * walkDir) > 0;
                p.joints.ankleL = {
                    x: p.joints.hipL.x,
                    y: feetY + Math.sin(cycleL) * strideDepth * walkDir - (isSwingingForwardL ? Math.abs(cosL) * strideLift : 0)
                };

                const cosR = Math.cos(cycleR);
                const isSwingingForwardR = (cosR * walkDir) > 0;
                p.joints.ankleR = {
                    x: p.joints.hipR.x,
                    y: feetY + Math.sin(cycleR) * strideDepth * walkDir - (isSwingingForwardR ? Math.abs(cosR) * strideLift : 0)
                };
            } else {
                p.joints.ankleL = { x: p.joints.hipL.x, y: feetY };
                p.joints.ankleR = { x: p.joints.hipR.x, y: feetY };
            }

            // Projected Knees (foreshortening instead of crab walk)
            const distL = Math.abs(p.joints.ankleL.y - p.joints.hipL.y);
            const compL = Math.max(0, 12 * s - distL); // 12s is approx max leg length
            p.joints.kneeL = {
                x: p.joints.hipL.x - (1 * s + compL * 0.15), // Very slight outward bend based on compression
                y: p.joints.hipL.y + (p.joints.ankleL.y - p.joints.hipL.y) * 0.45
            };

            const distR = Math.abs(p.joints.ankleR.y - p.joints.hipR.y);
            const compR = Math.max(0, 12 * s - distR);
            p.joints.kneeR = {
                x: p.joints.hipR.x + (1 * s + compR * 0.15),
                y: p.joints.hipR.y + (p.joints.ankleR.y - p.joints.hipR.y) * 0.45
            };

            p.joints.shoulderL = { x: p.joints.neck.x - 5 * s + sway, y: p.joints.neck.y + 1 * s };
            p.joints.shoulderR = { x: p.joints.neck.x + 5 * s + sway, y: p.joints.neck.y + 1 * s };

            if (p.isMoving) {
                const armSwingY = 3.5 * s;
                // Opposing arm swing: left arm with right leg (cycleR)
                p.joints.wristL = {
                    x: p.joints.shoulderL.x - 1 * s + sway * -0.5,
                    y: p.joints.shoulderL.y + 7.5 * s + Math.sin(cycleR) * armSwingY * walkDir - Math.abs(Math.sin(cycleR)) * 1 * s
                };
                p.joints.wristR = {
                    x: p.joints.shoulderR.x + 1 * s + sway * 0.5,
                    y: p.joints.shoulderR.y + 7.5 * s + Math.sin(cycleL) * armSwingY * walkDir - Math.abs(Math.sin(cycleL)) * 1 * s
                };
            } else {
                p.joints.wristL = { x: p.joints.shoulderL.x - 1 * s, y: p.joints.shoulderL.y + 7.5 * s + breath };
                p.joints.wristR = { x: p.joints.shoulderR.x + 1 * s, y: p.joints.shoulderR.y + 7.5 * s + breath };
            }

            // Projected Elbows
            const armDistL = p.joints.wristL.y - p.joints.shoulderL.y;
            const armCompL = Math.max(0, 8 * s - armDistL);
            p.joints.elbowL = {
                x: p.joints.shoulderL.x - (1.5 * s + armCompL * 0.2),
                y: p.joints.shoulderL.y + armDistL * 0.45
            };
            const armDistR = p.joints.wristR.y - p.joints.shoulderR.y;
            const armCompR = Math.max(0, 8 * s - armDistR);
            p.joints.elbowR = {
                x: p.joints.shoulderR.x + (1.5 * s + armCompR * 0.2),
                y: p.joints.shoulderR.y + armDistR * 0.45
            };
        }
    }

    /**
     * Renders the base bone structure using the computed IK joints.
     */
    private renderBodyBase(ctx: CanvasRenderingContext2D, pose: SkeletonPose) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw order based on facing
        if (pose.facing === 'UP') {
            // Legs -> Arms -> Spine/Ribs -> Skull
            this.drawLeg(ctx, pose.joints.hipL, pose.joints.kneeL, pose.joints.ankleL, pose.facing, true);
            this.drawLeg(ctx, pose.joints.hipR, pose.joints.kneeR, pose.joints.ankleR, pose.facing, false);
            this.drawArm(ctx, pose.joints.shoulderL, pose.joints.elbowL, pose.joints.wristL);
            this.drawArm(ctx, pose.joints.shoulderR, pose.joints.elbowR, pose.joints.wristR);
            this.drawTorso(ctx, pose);
        } else if (pose.facing === 'DOWN') {
            // Legs -> Spine/Ribs -> Arms -> Skull
            this.drawLeg(ctx, pose.joints.hipL, pose.joints.kneeL, pose.joints.ankleL, pose.facing, true);
            this.drawLeg(ctx, pose.joints.hipR, pose.joints.kneeR, pose.joints.ankleR, pose.facing, false);
            this.drawTorso(ctx, pose);
            this.drawArm(ctx, pose.joints.shoulderL, pose.joints.elbowL, pose.joints.wristL);
            this.drawArm(ctx, pose.joints.shoulderR, pose.joints.elbowR, pose.joints.wristR);
        } else {
            // SIDE: Left Arm/Leg -> Torso -> Right Leg/Arm
            this.drawLeg(ctx, pose.joints.hipL, pose.joints.kneeL, pose.joints.ankleL, pose.facing, true);
            this.drawArm(ctx, pose.joints.shoulderL, pose.joints.elbowL, pose.joints.wristL);
            this.drawTorso(ctx, pose);
            this.drawLeg(ctx, pose.joints.hipR, pose.joints.kneeR, pose.joints.ankleR, pose.facing, false);
            this.drawArm(ctx, pose.joints.shoulderR, pose.joints.elbowR, pose.joints.wristR);
        }
    }

    private drawBone(ctx: CanvasRenderingContext2D, p1: { x: number, y: number }, p2: { x: number, y: number }, thickness: number) {
        // Shadow pass
        ctx.strokeStyle = BaseSkeletonRenderer.BONE_SHADOW;
        ctx.lineWidth = thickness + 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Main bone pass
        ctx.strokeStyle = BaseSkeletonRenderer.BONE_MAIN;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    private drawLeg(ctx: CanvasRenderingContext2D, hip: { x: number, y: number }, knee: { x: number, y: number }, ankle: { x: number, y: number }, facing: SpriteFacing, isLeft: boolean) {
        this.drawBone(ctx, hip, knee, 3);
        this.drawBone(ctx, knee, ankle, 2.5);

        let dirX = 3;
        let dirY = 1;

        if (facing === 'UP') {
            dirX = isLeft ? -1.5 : 1.5;
            dirY = -1;
        } else if (facing === 'DOWN') {
            dirX = isLeft ? -2 : 2;
            dirY = 2;
        }

        // Simple foot structure
        this.drawBone(ctx, ankle, { x: ankle.x + dirX, y: ankle.y + dirY }, 2);
    }

    private drawArm(ctx: CanvasRenderingContext2D, shoulder: { x: number, y: number }, elbow: { x: number, y: number }, wrist: { x: number, y: number }) {
        this.drawBone(ctx, shoulder, elbow, 2.5);
        this.drawBone(ctx, elbow, wrist, 2);
    }

    private drawTorso(ctx: CanvasRenderingContext2D, p: SkeletonPose) {
        // Spine
        this.drawBone(ctx, p.joints.pelvis, p.joints.neck, 3.5);

        ctx.strokeStyle = BaseSkeletonRenderer.BONE_MAIN;
        ctx.fillStyle = BaseSkeletonRenderer.BONE_MAIN;

        // Pelvis bone block
        ctx.beginPath();
        ctx.arc(p.joints.pelvis.x, p.joints.pelvis.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Ribs (AAA requirement: defined ribcage)
        ctx.lineWidth = 2;
        const ribsCount = 4;
        const spineLen = p.joints.pelvis.y - p.joints.neck.y;

        // Rib width based on facing
        const baseWidth = p.facing === 'SIDE' ? 4 : 7;

        for (let i = 1; i <= ribsCount; i++) {
            const h = p.joints.neck.y + (spineLen * 0.2) + (i * 3 * p.scale);
            const w = baseWidth * p.scale * (1 - (i * 0.15)); // Ribs get smaller

            ctx.beginPath();
            if (p.facing === 'SIDE') {
                ctx.moveTo(p.joints.neck.x - w * 0.5, h); // A bit back
                ctx.quadraticCurveTo(p.joints.neck.x + w * 1.5, h + 1, p.joints.neck.x + w, h + 3);
            } else {
                // Symmetrical ribs
                ctx.moveTo(p.joints.neck.x - w, h);
                ctx.quadraticCurveTo(p.joints.neck.x, h - 2, p.joints.neck.x + w, h);
            }
            ctx.stroke();
        }

        // Skull is usually drawn via headDecoration or basic
        // We defer skull drawing to either subclasses, but provide a basic one if they don't override
        // Actually, skull is part of body base if there's no helmet covering face
    }

    // Helper method for 2D IK (2 segments)
    protected solve2BoneIK(
        startX: number, startY: number,
        targetX: number, targetY: number,
        len1: number, len2: number,
        bendForward: boolean
    ): { x: number, y: number } {
        const dx = targetX - startX;
        const dy = targetY - startY;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Guard against div by 0 and NaN
        if (dist < 0.01) dist = 0.01;

        // Clamp distance to prevent unreachable target tearing
        const maxDist = len1 + len2 - 0.1;
        if (dist > maxDist) {
            const scale = maxDist / dist;
            targetX = startX + dx * scale;
            targetY = startY + dy * scale;
            dist = maxDist;
        }

        // Angle from start to target
        const angle = Math.atan2(targetY - startY, targetX - startX);

        // Law of Cosines to find the inner angle
        let cosInner = (len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist);
        cosInner = Math.max(-1, Math.min(1, cosInner));

        const innerAngle = Math.acos(cosInner);

        // Determine bend direction
        const finalAngle = bendForward ? angle - innerAngle : angle + innerAngle;

        return {
            x: startX + Math.cos(finalAngle) * len1,
            y: startY + Math.sin(finalAngle) * len1
        };
    }
}
