import { UnitRenderer } from './UnitRenderer';
import { CONFIG } from '../../Config';
import type { Enemy } from '../../Enemy';

export class SpiderUnitRenderer implements UnitRenderer {
    // 🎨 Sinister Poison Palette
    private static readonly BODY_COLOR = '#051806'; // Nearly black green
    private static readonly ABDOMEN_COLOR = '#0f2910'; // Dark toxic green
    private static readonly LEG_COLOR = '#194d1b'; // Darker Leg
    private static readonly LEG_JOINT = '#4caf50'; // Glowing Joints
    private static readonly EYES_COLOR = '#d500f9'; // Sharp Purple
    private static readonly FANGS_COLOR = '#b388ff'; // Pale Purple
    private static readonly ACID_GLOW = '#76ff03';  // Bright Toxic Green
    private static readonly VEIN_COLOR = '#2e7d32'; // Subtle veins

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.001;
        const walkCycle = time * (enemy.baseSpeed * 0.4); // Faster twitchy movement
        const isMoving = !enemy.finished && enemy.currentHealth > 0;

        const spiderScale = scale * 1.1;

        // Orientation
        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';
        const r = rotation;
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();

        if (enemy.hitFlashTimer > 0) ctx.filter = 'brightness(500%) sepia(100%) hue-rotate(50deg)';

        // Twitchy breathing
        const breathe = Math.sin(time * 8) * 0.3 * spiderScale; // Faster breath

        // Draw Legs FIRST (under body)
        this.drawLegs(ctx, facing, spiderScale, walkCycle, isMoving);

        // Draw Acid Trail
        if (isMoving && Math.random() > 0.7) {
            this.drawAcidDrip(ctx, spiderScale);
        }

        // Draw Body
        if (facing === 'SIDE') {
            if (Math.abs(rotation) > Math.PI / 2) ctx.scale(-1, 1);
            this.drawSide(ctx, spiderScale, breathe, time);
        } else if (facing === 'UP') {
            this.drawBack(ctx, spiderScale, breathe, time);
        } else {
            this.drawFront(ctx, spiderScale, breathe, time);
        }

        ctx.restore();
    }

    private drawLegs(ctx: CanvasRenderingContext2D, facing: string, s: number, cycle: number, isMoving: boolean) {
        const drawLeg = (sx: number, sy: number, ex: number, ey: number, kneeDir: number, phase: number, zIndex: number = 0) => {
            let tx = ex;
            let ty = ey;

            // Spider Movement: Legs lift HIGH and stab down
            if (isMoving) {
                const step = (cycle + phase) % (Math.PI * 2);
                if (step < Math.PI) {
                    // Lift phase (High arch)
                    const progress = Math.sin(step);
                    ty -= progress * 8 * s; // High steps
                    tx += Math.cos(step) * 2 * s;
                } else {
                    // Plant phase (Drag back)
                }
            }

            ctx.lineWidth = (zIndex === 0 ? 2 : 1.5) * s;
            ctx.strokeStyle = SpiderUnitRenderer.LEG_COLOR;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(sx, sy);

            // Knee Calculation (Sharp angles)
            const dx = tx - sx;
            const dy = ty - sy; // 3D Topdown perspective flattening
            const dist = Math.hypot(dx, dy);

            // Knee sticks UP in Z (negative Y in 2D)
            const midX = (sx + tx) / 2;
            const midY = (sy + ty) / 2;

            // Calculate a "knee" point that creates an arch
            const archHeight = 10 * s;
            const kx = midX + (dx * 0.1);
            // In top down, knees usually point OUT or UP. 
            // Let's bias Y negative for "Up"
            const ky = midY - archHeight * kneeDir;

            ctx.lineTo(kx, ky);
            ctx.lineTo(tx, ty);
            ctx.stroke();

            // Glowing Joint
            ctx.fillStyle = SpiderUnitRenderer.LEG_JOINT;
            ctx.beginPath(); ctx.arc(kx, ky, 1.2 * s, 0, Math.PI * 2); ctx.fill();
        };

        if (facing === 'SIDE') {
            // Side View Legs (Scuttling)
            // Far Left Legs
            drawLeg(0, -2 * s, -8 * s, 6 * s, 0.8, 0, 0);
            drawLeg(2 * s, -2 * s, 8 * s, 6 * s, 0.8, 1.5, 0);
            drawLeg(-2 * s, -2 * s, -10 * s, 4 * s, 0.9, 3.0, 0);
            drawLeg(4 * s, -2 * s, 12 * s, 4 * s, 0.9, 4.5, 0);
        } else {
            // Front/Back View Legs (Arched around body)
            // 4 Pairs
            const legSpread = [
                { dir: -1, phase: 0, ex: -12, ey: -8 }, // Front L
                { dir: 1, phase: Math.PI, ex: 12, ey: -8 }, // Front R
                { dir: -1, phase: 1.5, ex: -16, ey: 0 },  // Mid L
                { dir: 1, phase: Math.PI + 1.5, ex: 16, ey: 0 },  // Mid R
                { dir: -1, phase: 3, ex: -14, ey: 8 },    // Mid-Back L
                { dir: 1, phase: Math.PI + 3, ex: 14, ey: 8 },    // Mid-Back R
                { dir: -1, phase: 4.5, ex: -10, ey: 12 },   // Back L
                { dir: 1, phase: Math.PI + 4.5, ex: 10, ey: 12 },   // Back R
            ];

            const flipY = facing === 'UP' ? -1 : 1;

            legSpread.forEach(l => {
                const sx = l.dir * 3 * s; // Body attach width
                const sy = 0; // Center body

                // Front view: Legs arch DOWN
                // Back view: Legs arch DOWN
                // My knee logic (negative Y = UP) works for side view.
                // For top-downish front view:

                // Draw manual polylines for better shape
                this.drawLegArc(ctx, sx, sy, l.ex * s, l.ey * s * flipY, cycle + l.phase, s, isMoving);
            });
        }
    }

    private drawLegArc(ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number, cycle: number, s: number, isMoving: boolean) {
        let finalEx = ex;
        let finalEy = ey;

        if (isMoving) {
            const lift = Math.sin(cycle);
            if (lift > 0) {
                finalEy -= lift * 6 * s; // Lift leg UP (negative Y)
            }
        }

        ctx.strokeStyle = SpiderUnitRenderer.LEG_COLOR;
        ctx.lineWidth = 1.8 * s;
        ctx.beginPath();
        ctx.moveTo(sx, sy);

        // Elbow point (High)
        const mx = (sx + finalEx) / 2;
        const my = (sy + finalEy) / 2 - 8 * s; // Arch UP

        ctx.quadraticCurveTo(mx, my, finalEx, finalEy);
        ctx.stroke();

        // Tip (claw)
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(finalEx, finalEy, 1 * s, 0, Math.PI * 2); ctx.fill();
    }

    // === VIEWS ===

    private drawFront(ctx: CanvasRenderingContext2D, s: number, breathe: number, t: number) {
        // Abdomen (Behind) - Darker
        ctx.fillStyle = SpiderUnitRenderer.ABDOMEN_COLOR;
        ctx.beginPath();
        ctx.ellipse(0, -3 * s, 6.5 * s, 5.5 * s + breathe, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing Veins
        this.drawVeins(ctx, 0, -3 * s, 6 * s, t);

        // Cephalothorax (Head)
        ctx.fillStyle = SpiderUnitRenderer.BODY_COLOR;
        ctx.beginPath();
        // Spiky shape
        ctx.moveTo(-3 * s, 0); ctx.lineTo(0, 4 * s); ctx.lineTo(3 * s, 0); ctx.lineTo(0, -3 * s);
        ctx.fill();

        // Eyes (Many)
        ctx.fillStyle = SpiderUnitRenderer.EYES_COLOR;
        ctx.shadowBlur = 5; ctx.shadowColor = SpiderUnitRenderer.EYES_COLOR;
        [[-1, 1], [1, 1], [-2.5, 0.5], [2.5, 0.5]].forEach(p => {
            ctx.beginPath(); ctx.arc(p[0] * s, p[1] * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Fangs (Sharp)
        ctx.fillStyle = SpiderUnitRenderer.FANGS_COLOR;
        ctx.beginPath();
        ctx.moveTo(-1.5 * s, 3 * s); ctx.lineTo(-1 * s, 7 * s); ctx.lineTo(-0.5 * s, 3 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(1.5 * s, 3 * s); ctx.lineTo(1 * s, 7 * s); ctx.lineTo(0.5 * s, 3 * s);
        ctx.fill();
    }

    private drawBack(ctx: CanvasRenderingContext2D, s: number, breathe: number, t: number) {
        // Cephalothorax (Front)
        ctx.fillStyle = SpiderUnitRenderer.BODY_COLOR;
        ctx.beginPath();
        ctx.arc(0, -2 * s, 3.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Abdomen (Huge, foreground)
        const abY = 3 * s;
        ctx.fillStyle = SpiderUnitRenderer.ABDOMEN_COLOR;
        ctx.beginPath();
        ctx.ellipse(0, abY, 7.5 * s, 6.5 * s + breathe, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing Veins
        this.drawVeins(ctx, 0, abY, 7 * s, t);

        // Hourglass (Glowing)
        this.drawHourglass(ctx, 0, abY, s, t);
    }

    private drawSide(ctx: CanvasRenderingContext2D, s: number, breathe: number, t: number) {
        // Abdomen (Back)
        ctx.fillStyle = SpiderUnitRenderer.ABDOMEN_COLOR;
        ctx.beginPath();
        ctx.ellipse(-5 * s, -1 * s, 6.5 * s, 5 * s + breathe, -0.2, 0, Math.PI * 2);
        ctx.fill();

        this.drawVeins(ctx, -5 * s, -1 * s, 6 * s, t);

        // Cephalothorax (Front)
        ctx.fillStyle = SpiderUnitRenderer.BODY_COLOR;
        ctx.beginPath();
        ctx.ellipse(3 * s, 1 * s, 3.5 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = SpiderUnitRenderer.EYES_COLOR;
        ctx.shadowBlur = 4; ctx.shadowColor = SpiderUnitRenderer.EYES_COLOR;
        ctx.beginPath(); ctx.arc(5.5 * s, 0.5 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Fangs
        ctx.fillStyle = SpiderUnitRenderer.FANGS_COLOR;
        ctx.beginPath();
        ctx.moveTo(4.5 * s, 2 * s); ctx.lineTo(4 * s, 6 * s); ctx.lineTo(5.5 * s, 2 * s);
        ctx.fill();
    }

    private drawHourglass(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
        const glow = Math.sin(t * 5) * 5;
        ctx.fillStyle = SpiderUnitRenderer.ACID_GLOW;
        ctx.shadowBlur = 10 + glow; ctx.shadowColor = SpiderUnitRenderer.ACID_GLOW;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 1.5);
        ctx.beginPath();
        ctx.moveTo(-1.5 * s, -1.5 * s); ctx.lineTo(1.5 * s, 1.5 * s); ctx.lineTo(-1.5 * s, 1.5 * s); ctx.lineTo(1.5 * s, -1.5 * s);
        ctx.fill();
        ctx.restore();
        ctx.shadowBlur = 0;
    }

    private drawVeins(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
        ctx.strokeStyle = SpiderUnitRenderer.VEIN_COLOR;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 + Math.sin(t * 3) * 0.2;
        ctx.beginPath();
        // Web pattern on back
        for (let i = 0; i < 8; i++) {
            const angle = i * (Math.PI / 4);
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    private drawAcidDrip(ctx: CanvasRenderingContext2D, s: number) {
        ctx.fillStyle = SpiderUnitRenderer.ACID_GLOW;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 5 * s, 1.5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}
