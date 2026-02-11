import { UnitRenderer } from './UnitRenderer';
import type { Enemy } from '../../Enemy';
import { Assets } from '../../Assets';

export class TrollUnitRenderer implements UnitRenderer {
    // 🎨 Palette (Snow Troll)
    private static readonly FUR_BASE = '#eceff1';    // Snow White
    private static readonly FUR_SHADOW = '#cfd8dc';  // Blue-ish Grey Shadow
    private static readonly SKIN_DARK = '#b0bec5';   // Face/Hands
    private static readonly CLUB_WOOD = '#5d4037';   // Dark Wood
    private static readonly CLUB_LIGHT = '#8d6e63';  // Wood Highlight
    private static readonly EYE_COLOR = '#455a64';   // Dark Eyes (not glowing)

    // Config
    private static readonly CLUB_LENGTH = 24;
    private static readonly CLUB_WIDTH = 8;

    // BAKING SUPPORT
    drawFrame(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number): void {
        const cycle = t * Math.PI * 2;
        const scale = 1.0;
        const isMoving = true;
        this.drawSide(ctx, scale, cycle, isMoving);
    }

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.001;
        // Heavy, slow movement (baseSpeed is 42, ~0.7 tiles/sec)
        // Adjusted walk cycle speed for "heaviness"
        const walkCycle = time * (enemy.baseSpeed * 0.15);

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

            // Hit Flash
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
        // Angles: -PI..PI. 0 is Right. 
        // UP: -PI/2 approx (-1.57). range -2.35 to -0.78
        // DOWN: PI/2 approx (1.57). range 0.78 to 2.35
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();

        if (enemy.hitFlashTimer > 0) ctx.globalAlpha = 0.7;

        if (facing === 'SIDE') {
            if (Math.abs(rotation) > Math.PI / 2) {
                ctx.scale(-1, 1); // Flip for Left
            }
            this.drawSide(ctx, scale, walkCycle, isMoving);
        } else if (facing === 'UP') {
            this.drawBack(ctx, scale, walkCycle, isMoving);
        } else {
            this.drawFront(ctx, scale, walkCycle, isMoving);
        }

        ctx.restore();
    }

    // === FRONT VIEW ===
    private drawFront(ctx: CanvasRenderingContext2D, s: number, wc: number, moving: boolean) {
        // Heavy plodding bounce
        const bounce = moving ? Math.abs(Math.sin(wc)) * 2 * s : 0;

        ctx.translate(0, -bounce);

        // 1. Back/Legs (Behind)
        this.drawLegsFront(ctx, s, wc, moving);

        // 2. Club (Dragging BEHIND to the side)
        // Hand is at (11, -4). Club should go down and back.
        // We simulate "dragging" by angling it.
        const dragAngle = -0.4; // Tilted back/out
        ctx.save();
        ctx.translate(11 * s, -4 * s); // Pivot at hand
        ctx.rotate(dragAngle);
        // Draw club extending down from hand
        this.drawClub(ctx, s, true);
        ctx.restore();

        // 3. Body (Hunchback Main Mass)
        ctx.fillStyle = TrollUnitRenderer.FUR_BASE;
        ctx.beginPath();
        // Big round belly/chest
        ctx.ellipse(0, -2 * s, 10 * s, 11 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fur Details (Chest)
        this.drawFurPatches(ctx, 0, -2 * s, 8 * s, s);

        // 4. Arms (Heavy, hanging low)
        const sway = moving ? Math.sin(wc) * 0.1 : 0;

        // Left Arm (Empty) - Thick muscles
        this.drawArmFront(ctx, -11 * s, -4 * s, s, 0.2 + sway);

        // Right Arm (Holding Club) - Firm grip on the pivoted club
        // We draw the arm on top of the club pivot
        this.drawArmFront(ctx, 11 * s, -4 * s, s, dragAngle);

        // 5. Head (Low, sunken)
        ctx.translate(0, -8 * s); // Neck is low
        this.drawHeadFront(ctx, s);
    }

    // === BACK VIEW ===
    private drawBack(ctx: CanvasRenderingContext2D, s: number, wc: number, moving: boolean) {
        const bounce = moving ? Math.abs(Math.sin(wc)) * 2 * s : 0;
        ctx.translate(0, -bounce);

        // 1. Legs
        this.drawLegsFront(ctx, s, wc, moving);

        // 2. Club (Dragging)
        // Hand is at Right (User's Right is Unit's Right) -> (12, -8)
        const dragAngle = 0.4;
        ctx.save();
        ctx.translate(12 * s, -8 * s); // Shoulder/Hand area
        ctx.rotate(dragAngle);
        // Club extends down
        this.drawClub(ctx, s, true);
        ctx.restore();

        // 3. Body (Massive Back)
        ctx.fillStyle = TrollUnitRenderer.FUR_SHADOW; // Darker back
        ctx.beginPath();
        ctx.ellipse(0, -4 * s, 11 * s, 12 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fur Texture
        this.drawFurPatches(ctx, 0, -4 * s, 9 * s, s, true);

        // 4. Shoulders
        ctx.fillStyle = TrollUnitRenderer.FUR_BASE;
        ctx.beginPath();
        ctx.arc(-11 * s, -8 * s, 5.5 * s, 0, Math.PI * 2); // Left Shoulder
        ctx.arc(11 * s, -8 * s, 5.5 * s, 0, Math.PI * 2);  // Right Shoulder
        ctx.fill();

        // 5. Head (Back)
        ctx.translate(0, -10 * s);
        ctx.fillStyle = TrollUnitRenderer.FUR_BASE;
        ctx.beginPath();
        ctx.arc(0, 0, 6.5 * s, 0, Math.PI * 2);
        ctx.fill();
    }

    // === SIDE VIEW ===
    private drawSide(ctx: CanvasRenderingContext2D, s: number, wc: number, moving: boolean) {
        const bounce = moving ? Math.abs(Math.sin(wc)) * 2 * s : 0;

        // Stride
        const stride = 7 * s;
        const leftLegX = moving ? Math.sin(wc) * stride : 0; // Far leg
        const rightLegX = moving ? -Math.sin(wc) * stride : 0; // Near leg

        // 1. Far Leg (Left)
        this.drawFoot(ctx, leftLegX + 3 * s, 12 * s, s, true);

        ctx.translate(0, -bounce);

        // 2. Club (Dragging Behind)
        // Hand approx at (4, -4)
        // Club should drag way back
        const dragLift = moving ? Math.sin(wc) * 0.1 : 0; // Slight bump
        ctx.save();
        ctx.translate(4 * s, -4 * s); // Hand position
        ctx.rotate(-1.2 + dragLift); // Angled sharply back
        this.drawClub(ctx, s, true);
        ctx.restore();

        // 3. Far Arm (Holding Club)
        ctx.save();
        ctx.translate(4 * s, -6 * s); // Shoulder
        ctx.rotate(-0.8); // Reaching back/down to hold club
        this.drawArmShape(ctx, s, 13);
        ctx.restore();

        // 4. Body (Hunchback Profile)
        ctx.fillStyle = TrollUnitRenderer.FUR_BASE;
        ctx.beginPath();
        // Hunch shape: ellipse rotated forward
        // More "bean" shaped for hunch
        ctx.moveTo(-6 * s, 8 * s);
        ctx.quadraticCurveTo(-12 * s, -6 * s, 0, -14 * s); // Back curve
        ctx.quadraticCurveTo(10 * s, -8 * s, 6 * s, 8 * s); // Front/Belly
        ctx.fill();

        // 5. Head (Forward/Low)
        ctx.save();
        ctx.translate(6 * s, -12 * s);
        this.drawHeadSide(ctx, s);
        ctx.restore();

        // 6. Near Leg (Right)
        ctx.save();
        ctx.translate(0, bounce); // Cancel bounce
        this.drawFoot(ctx, rightLegX, 12 * s, s, false);
        ctx.restore();

        // 7. Near Arm (Swinging free)
        const armSway = moving ? Math.cos(wc) * 0.4 : 0;
        ctx.save();
        ctx.translate(6 * s, -8 * s); // Shoulder fwd
        ctx.rotate(armSway + 0.3);
        this.drawArmShape(ctx, s, 13);
        ctx.restore();
    }

    // --- COMPONENTS ---

    private drawClub(ctx: CanvasRenderingContext2D, s: number, held: boolean = false) {
        // If held, (0,0) is handle top
        const len = TrollUnitRenderer.CLUB_LENGTH * s;
        const w = TrollUnitRenderer.CLUB_WIDTH * s;

        // Positioning: if held, draw DOWN from 0,0
        // Handle
        const handleLen = 6 * s;

        ctx.fillStyle = TrollUnitRenderer.CLUB_WOOD;

        ctx.beginPath();
        // Start thin at handle (0,0)
        ctx.moveTo(-1.5 * s, 0);
        ctx.lineTo(1.5 * s, 0);

        // Flare out
        ctx.lineTo(w / 2 + 2 * s, len); // Thick end
        ctx.lineTo(-w / 2 - 2 * s, len);
        ctx.fill();

        // Texture / Spikes?
        ctx.fillStyle = TrollUnitRenderer.CLUB_LIGHT;
        ctx.beginPath();
        ctx.arc(0, len * 0.8, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Shadow on ground if dragging? (Simplified as dark tip)
        ctx.fillStyle = '#3e2723';
        ctx.beginPath();
        ctx.arc(0, len, w / 2, 0, Math.PI, false);
        ctx.fill();
    }

    private drawHeadFront(ctx: CanvasRenderingContext2D, s: number) {
        // Wide, flat head, deep set
        ctx.fillStyle = TrollUnitRenderer.FUR_BASE;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7.5 * s, 6.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Face Area (No fur)
        ctx.fillStyle = TrollUnitRenderer.SKIN_DARK;
        ctx.beginPath();
        ctx.ellipse(0, 1.5 * s, 4.5 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = TrollUnitRenderer.EYE_COLOR;
        ctx.beginPath(); ctx.arc(-2 * s, 0.5 * s, 0.9 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(2 * s, 0.5 * s, 0.9 * s, 0, Math.PI * 2); ctx.fill();

        // Brow Ridge (Heavy)
        ctx.fillStyle = TrollUnitRenderer.FUR_SHADOW;
        ctx.beginPath();
        ctx.roundRect(-5 * s, -2.5 * s, 10 * s, 2 * s, 1 * s);
        ctx.fill();

        // Tusks (Protruding Up)
        ctx.fillStyle = '#fff9c4';
        ctx.beginPath();
        ctx.moveTo(-2.5 * s, 3.5 * s); ctx.lineTo(-3 * s, 6 * s); ctx.lineTo(-1.5 * s, 4 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2.5 * s, 3.5 * s); ctx.lineTo(3 * s, 6 * s); ctx.lineTo(1.5 * s, 4 * s);
        ctx.fill();
    }

    private drawHeadSide(ctx: CanvasRenderingContext2D, s: number) {
        // Snouty profile
        ctx.fillStyle = TrollUnitRenderer.FUR_BASE;
        // Furry back of head
        ctx.beginPath();
        ctx.arc(-2 * s, -1 * s, 5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Face connection
        ctx.beginPath();
        ctx.ellipse(1 * s, 0, 4 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Snout
        ctx.fillStyle = TrollUnitRenderer.SKIN_DARK;
        ctx.beginPath();
        ctx.ellipse(4 * s, 1 * s, 3 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ear (Pointy)
        ctx.fillStyle = TrollUnitRenderer.SKIN_DARK;
        ctx.beginPath();
        ctx.moveTo(-2 * s, 0);
        ctx.lineTo(-5 * s, -2 * s);
        ctx.lineTo(-3 * s, 2 * s);
        ctx.fill();

        // Eye (Deep)
        ctx.fillStyle = TrollUnitRenderer.EYE_COLOR;
        ctx.beginPath(); ctx.arc(2 * s, 0, 0.9 * s, 0, Math.PI * 2); ctx.fill();

        // Tusk Side
        ctx.fillStyle = '#fff9c4';
        ctx.beginPath();
        ctx.moveTo(5 * s, 2 * s); ctx.lineTo(6 * s, -1 * s); ctx.lineTo(4 * s, 1 * s);
        ctx.fill();
    }

    private drawArmFront(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, angle: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.fillStyle = TrollUnitRenderer.FUR_BASE;
        ctx.beginPath();
        // Muscle shape
        ctx.ellipse(0, 6 * s, 3.5 * s, 7 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hand
        ctx.fillStyle = TrollUnitRenderer.SKIN_DARK;
        ctx.beginPath();
        ctx.arc(0, 13 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private drawArmShape(ctx: CanvasRenderingContext2D, s: number, length: number) {
        ctx.fillStyle = TrollUnitRenderer.FUR_BASE;
        ctx.beginPath();
        ctx.ellipse(0, length * 0.4 * s, 3.5 * s, length * 0.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hand
        ctx.fillStyle = TrollUnitRenderer.SKIN_DARK;
        ctx.beginPath();
        ctx.arc(0, length * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawLegsFront(ctx: CanvasRenderingContext2D, s: number, wc: number, moving: boolean) {
        const strideY = moving ? Math.sin(wc) * 3 * s : 0;
        // Wide stance
        this.drawLeg(ctx, -7 * s, 6 * s + strideY, s, true);
        this.drawLeg(ctx, 7 * s, 6 * s - strideY, s, false);
    }

    private drawLeg(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, isLeft: boolean) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = TrollUnitRenderer.FUR_SHADOW;

        // Thigh
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, 4 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Foot (Paw-like, 3 toes)
        ctx.fillStyle = TrollUnitRenderer.SKIN_DARK;
        const toeY = 10 * s;

        // Main foot pad
        ctx.beginPath();
        ctx.ellipse(0, toeY - 1 * s, 4.5 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Toes
        const toes = [-2.5, 0, 2.5];
        toes.forEach(tx => {
            ctx.beginPath();
            ctx.arc(tx * s, toeY + 1.5 * s, 1.8 * s, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    private drawFoot(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dark: boolean) {
        ctx.save();
        ctx.translate(x, y);

        // Leg stump
        ctx.fillStyle = dark ? TrollUnitRenderer.FUR_SHADOW : TrollUnitRenderer.FUR_BASE;
        ctx.beginPath();
        ctx.roundRect(-3.5 * s, -8 * s, 7 * s, 8 * s, 2 * s);
        ctx.fill();

        // Foot (Paw)
        ctx.fillStyle = TrollUnitRenderer.SKIN_DARK;

        // Pad
        ctx.beginPath();
        ctx.ellipse(1 * s, 0, 5 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Toes (Side view - stacked)
        ctx.beginPath(); ctx.arc(5 * s, 1 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3 * s, 1.5 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    private drawFurPatches(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, s: number, dark: boolean = false) {
        ctx.fillStyle = dark ? '#b0bec5' : '#ffffff'; // Highlight patches
        // Random-ish patches to break up the circle
        const patches = [
            { dx: -0.5, dy: -0.5, sz: 0.4 },
            { dx: 0.5, dy: -0.4, sz: 0.5 },
            { dx: 0, dy: 0.2, sz: 0.6 },
        ];

        patches.forEach(p => {
            ctx.beginPath();
            ctx.arc(x + p.dx * r, y + p.dy * r, p.sz * r, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
