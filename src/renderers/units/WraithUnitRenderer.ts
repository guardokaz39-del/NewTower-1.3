import { UnitRenderer } from './UnitRenderer';
import { CONFIG } from '../../Config';
import { Assets } from '../../Assets';
import type { Enemy } from '../../Enemy';

export class WraithUnitRenderer implements UnitRenderer {
    // 🎨 Palette (Final Polish)
    private static readonly C_ROBE_DARK = '#120524'; // Deepest Void
    private static readonly C_ROBE_MID = '#311b92';  // Indigo
    private static readonly C_ACCENT = '#d500f9';    // Bright Magenta
    private static readonly C_SOUL_CORE = '#e0f7fa'; // White core
    private static readonly C_SOUL_GLOW = '#00e5ff'; // Cyan Glow
    private static readonly C_SHIELD = '#ffd700';    // Gold
    private static readonly C_HORN = '#263238';      // Dark Horn
    private static readonly C_EMERALD_FIRE = '#00e676'; // Emerald Fire

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.002;
        const bossScale = scale * 1.7; // Large Boss Scale

        // Heavy Levitation
        const hover = Math.sin(time * 1.2) * (10 * scale);

        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';
        const r = rotation;
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();
        ctx.translate(0, hover - 18 * scale);

        if (facing === 'SIDE') {
            if (Math.abs(rotation) > Math.PI / 2) ctx.scale(-1, 1);
            this.drawSide(ctx, bossScale, time, enemy);
        } else if (facing === 'UP') {
            this.drawBack(ctx, bossScale, time, enemy);
        } else {
            this.drawFront(ctx, bossScale, time, enemy);
        }

        ctx.restore();
    }

    // === FRONT VIEW ===
    private drawFront(ctx: CanvasRenderingContext2D, s: number, t: number, enemy: Enemy) {
        // 1. Robe Back Layer (Inside)
        this.drawRobeSilhouette(ctx, s, t, 0, 'BACK_LAYER');

        // 2. Void Body / Ribs
        ctx.fillStyle = WraithUnitRenderer.C_ROBE_MID;
        ctx.beginPath();
        ctx.moveTo(-10 * s, -14 * s);
        ctx.bezierCurveTo(-5 * s, 10 * s, 5 * s, 10 * s, 10 * s, -14 * s); // Ribs shape
        ctx.fill();

        // 3. Robe Front Layer (Edges)
        this.drawRobeSilhouette(ctx, s, t, 0, 'FRONT_EDGES');

        // 4. Void Heart (Pulsing)
        const pulse = 1.0 + Math.sin(t * 3) * 0.2;
        ctx.shadowBlur = 25 * pulse;
        ctx.shadowColor = WraithUnitRenderer.C_SOUL_GLOW;
        ctx.fillStyle = WraithUnitRenderer.C_SOUL_CORE;
        ctx.beginPath();
        ctx.arc(0, -4 * s, 2 * s * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 5. Claws (Spread out)
        const handFloat = Math.sin(t * 2) * 2 * s;
        this.drawClaw(ctx, -16 * s, -4 * s + handFloat, s, 0.4);
        this.drawClaw(ctx, 16 * s, -4 * s - handFloat, s, -0.4);

        // 6. Head
        ctx.translate(0, -18 * s);
        this.drawHorns(ctx, s, 'FRONT', t);
        this.drawHoodFront(ctx, s, t);

        // 7. FX
        ctx.translate(0, 18 * s);
        this.drawEffects(ctx, s, t, enemy);
    }

    // === BACK VIEW ===
    private drawBack(ctx: CanvasRenderingContext2D, s: number, t: number, enemy: Enemy) {
        // 1. Full Robe
        this.drawRobeSilhouette(ctx, s, t, 0, 'FULL');

        // 2. Spiked Collar
        ctx.fillStyle = '#0f041e';
        ctx.beginPath();
        ctx.moveTo(-12 * s, -16 * s);
        ctx.lineTo(0, -22 * s); // Tall spike
        ctx.lineTo(12 * s, -16 * s);
        ctx.lineTo(0, -5 * s);
        ctx.fill();

        // 3. Claws (Visible at sides)
        const handFloat = Math.sin(t * 2) * 2 * s;
        this.drawClaw(ctx, -16 * s, -4 * s + handFloat, s, 0.4, true);
        this.drawClaw(ctx, 16 * s, -4 * s - handFloat, s, -0.4, true);

        // 4. Head
        ctx.translate(0, -18 * s);
        this.drawHorns(ctx, s, 'BACK', t);

        ctx.fillStyle = WraithUnitRenderer.C_ROBE_DARK;
        ctx.beginPath();
        // Hood from back
        ctx.ellipse(0, 0, 9 * s, 11 * s, 0, Math.PI, 0);
        ctx.lineTo(9 * s, 8 * s);
        ctx.bezierCurveTo(0, 12 * s, 0, 12 * s, -9 * s, 8 * s);
        ctx.fill();

        // Glowing Rune
        ctx.strokeStyle = WraithUnitRenderer.C_ACCENT;
        ctx.lineWidth = 1.8 * s;
        ctx.shadowBlur = 10;
        ctx.shadowColor = WraithUnitRenderer.C_ACCENT;
        ctx.beginPath();
        ctx.moveTo(0, -5 * s); ctx.lineTo(0, 5 * s);
        ctx.moveTo(-3 * s, 0); ctx.lineTo(3 * s, 0);
        ctx.arc(0, 0, 3 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.translate(0, 18 * s);
        this.drawEffects(ctx, s, t, enemy);
    }

    // === SIDE VIEW (RE-DESIGNED) ===
    private drawSide(ctx: CanvasRenderingContext2D, s: number, t: number, enemy: Enemy) {
        // 1. Robe (Dynamic "S" Shape Wind)
        // Instead of a block, we draw a flowing cape behind and exposed void in front

        // Back Cape Flowing
        const wave = Math.sin(t * 2.5) * 3 * s;
        ctx.fillStyle = this.getRobeGradient(ctx, s);
        ctx.beginPath();
        ctx.moveTo(-2 * s, -18 * s); // Shoulder back
        // Flowing back line
        ctx.bezierCurveTo(-15 * s, -5 * s, -10 * s + wave, 20 * s, -20 * s + wave, 35 * s);
        // Bottom jagged
        ctx.lineTo(5 * s, 35 * s);
        // Front line (Cut away to reveal body)
        ctx.bezierCurveTo(0, 20 * s, 5 * s, -5 * s, 2 * s, -18 * s);
        ctx.fill();

        // 2. Void Body (Visible chest)
        ctx.fillStyle = WraithUnitRenderer.C_ROBE_MID;
        ctx.beginPath();
        ctx.ellipse(2 * s, -8 * s, 4 * s, 8 * s, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 3. Claw (Reaching Forward - MENACING)
        const armWave = Math.sin(t * 2) * 0.1;
        ctx.save();
        ctx.translate(10 * s, -6 * s); // Far forward
        ctx.rotate(-0.3 + armWave);
        this.drawClawSide(ctx, s); // Specialized side claw
        ctx.restore();

        // 4. Head (Properly Seated)
        ctx.translate(2 * s, -17 * s);

        // Horns (Large & Fiery)
        this.drawHorns(ctx, s, 'SIDE', t);

        // Hood Profile
        ctx.fillStyle = WraithUnitRenderer.C_ROBE_DARK;
        ctx.beginPath();
        // Neck connection
        ctx.moveTo(-4 * s, 8 * s);
        ctx.quadraticCurveTo(-8 * s, -5 * s, -2 * s, -10 * s); // Back
        ctx.lineTo(8 * s, -5 * s); // Peak
        ctx.lineTo(7 * s, 3 * s); // Front
        ctx.quadraticCurveTo(2 * s, 6 * s, -4 * s, 8 * s);
        ctx.fill();

        // Face Void (Deep)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(3 * s, 0, 2 * s, 5 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Eye (Burning)
        ctx.translate(4 * s, -0.5 * s);
        ctx.fillStyle = WraithUnitRenderer.C_SOUL_GLOW;
        ctx.shadowBlur = 15;
        ctx.shadowColor = WraithUnitRenderer.C_SOUL_GLOW;
        ctx.beginPath();
        ctx.moveTo(-1.5 * s, 0); ctx.lineTo(1.5 * s, -0.8 * s); ctx.lineTo(0.5 * s, 1.5 * s);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.translate(-6 * s, 17 * s);
        this.drawEffects(ctx, s, t, enemy);
    }

    // --- DETAILED COMPONENTS ---

    private getRobeGradient(ctx: CanvasRenderingContext2D, s: number): CanvasGradient {
        const grad = ctx.createLinearGradient(0, -20 * s, 0, 40 * s);
        grad.addColorStop(0, WraithUnitRenderer.C_ROBE_DARK);
        grad.addColorStop(0.5, WraithUnitRenderer.C_ROBE_MID);
        grad.addColorStop(0.85, 'rgba(49, 27, 146, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        return grad;
    }

    private drawRobeSilhouette(ctx: CanvasRenderingContext2D, s: number, t: number, tilt: number, mode: 'FULL' | 'BACK_LAYER' | 'FRONT_EDGES') {
        ctx.fillStyle = this.getRobeGradient(ctx, s);
        if (tilt !== 0) ctx.rotate(tilt);

        ctx.beginPath();
        const waveL = Math.sin(t * 2) * 2 * s;
        const waveR = Math.cos(t * 2.5) * 2 * s;

        // Base Cloth Shape
        const drawCloth = () => {
            ctx.moveTo(-12 * s, -18 * s);
            ctx.bezierCurveTo(-18 * s, -5 * s, -14 * s + waveL, 20 * s, -20 * s + waveL, 35 * s);
            ctx.lineTo(20 * s + waveR, 35 * s);
            ctx.bezierCurveTo(14 * s + waveR, 20 * s, 18 * s, -5 * s, 12 * s, -18 * s);
        };

        if (mode === 'FULL') {
            drawCloth();
            ctx.fill();
        } else if (mode === 'BACK_LAYER') {
            // Draw mostly the wide part
            drawCloth();
            ctx.fill();
        } else if (mode === 'FRONT_EDGES') {
            // Draw open cloak
            ctx.beginPath();
            ctx.moveTo(-12 * s, -18 * s);
            ctx.quadraticCurveTo(-14 * s, 0, -8 * s, 30 * s); // Left drapea
            ctx.lineTo(-5 * s, 30 * s);
            ctx.quadraticCurveTo(-8 * s, 0, -6 * s, -14 * s);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(12 * s, -18 * s);
            ctx.quadraticCurveTo(14 * s, 0, 8 * s, 30 * s); // Right drape
            ctx.lineTo(5 * s, 30 * s);
            ctx.quadraticCurveTo(8 * s, 0, 6 * s, -14 * s);
            ctx.fill();
        }

        if (tilt !== 0) ctx.rotate(-tilt);
    }

    private drawClaw(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, angle: number, back: boolean = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Palm
        ctx.fillStyle = back ? '#000' : '#2c1e3d';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fingers with Glowing Tips
        const fingers = [-1.5, -0.5, 0.5, 1.5];
        for (let f of fingers) {
            ctx.fillStyle = back ? '#1a1a1a' : '#4a148c';
            ctx.beginPath();
            ctx.moveTo(f * s, 1 * s);
            ctx.lineTo((f * 2.0) * s, 7 * s); // Longer fingers
            ctx.lineTo((f * 0.8) * s, 1 * s);
            ctx.fill();

            // Glow Tip
            if (!back) {
                ctx.fillStyle = WraithUnitRenderer.C_ACCENT;
                ctx.beginPath();
                ctx.arc((f * 2.0) * s, 7 * s, 0.4 * s, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    private drawClawSide(ctx: CanvasRenderingContext2D, s: number) {
        ctx.fillStyle = '#2c1e3d';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Reaching Fingers
        const drawFinger = (ang: number, len: number) => {
            ctx.save();
            ctx.rotate(ang);
            ctx.fillStyle = '#4a148c';
            ctx.beginPath();
            ctx.moveTo(0, 2 * s);
            ctx.lineTo(0.5 * s, len * s);
            ctx.lineTo(1.5 * s, 2 * s);
            ctx.fill();
            // Tip
            ctx.fillStyle = WraithUnitRenderer.C_ACCENT;
            ctx.beginPath(); ctx.arc(0.5 * s, len * s, 0.4 * s, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        };

        drawFinger(0.2, 7);
        drawFinger(0, 8);
        drawFinger(-0.3, 6);
    }

    private drawHorns(ctx: CanvasRenderingContext2D, s: number, view: 'FRONT' | 'BACK' | 'SIDE', t: number) {
        // Emerald Fire Gradient
        const fireGrad = ctx.createLinearGradient(0, -10 * s, 0, -22 * s);
        fireGrad.addColorStop(0, WraithUnitRenderer.C_HORN);
        fireGrad.addColorStop(0.6, WraithUnitRenderer.C_HORN);
        fireGrad.addColorStop(1, WraithUnitRenderer.C_EMERALD_FIRE); // Tip glow

        ctx.fillStyle = fireGrad;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.5 * s;

        // Flicker effect
        const flicker = Math.sin(t * 15) * 0.5;

        if (view === 'SIDE') {
            // Massive Swept Horn
            ctx.beginPath();
            ctx.moveTo(0, -5 * s);
            // Big curve back
            ctx.bezierCurveTo(4 * s, -14 * s, -6 * s, -18 * s, -12 * s, -14 * s + flicker);
            ctx.lineTo(-10 * s, -11 * s);
            ctx.bezierCurveTo(-6 * s, -14 * s, 2 * s, -12 * s, 0, -5 * s);
            ctx.fill(); ctx.stroke();

            // Emerald Particles
            this.drawHornParticles(ctx, -12 * s, -14 * s, s, t);

        } else {
            // Symmetrical Horns
            const drawHorn = (mirror: number) => {
                ctx.beginPath();
                ctx.moveTo(mirror * 6 * s, -6 * s);
                // Curve Out -> In -> Out
                ctx.bezierCurveTo(mirror * 14 * s, -12 * s, mirror * 8 * s, -20 * s, mirror * 18 * s, -24 * s + flicker);
                // Inner edge
                ctx.lineTo(mirror * 15 * s, -22 * s);
                ctx.bezierCurveTo(mirror * 8 * s, -18 * s, mirror * 10 * s, -10 * s, mirror * 6 * s, -6 * s);
                ctx.fill(); ctx.stroke();

                this.drawHornParticles(ctx, mirror * 18 * s, -24 * s, s, t);
            };
            drawHorn(1);
            drawHorn(-1);
        }
    }

    private drawHornParticles(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
        ctx.fillStyle = WraithUnitRenderer.C_EMERALD_FIRE;
        for (let i = 0; i < 3; i++) {
            const px = x + Math.sin(t * 10 + i) * 2 * s;
            const py = y - Math.abs(Math.cos(t * 8 + i)) * 4 * s;
            const size = (Math.sin(t * 5 + i) + 1.5) * 0.5 * s;
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    private drawHoodFront(ctx: CanvasRenderingContext2D, s: number, t: number) {
        // Inner Void
        ctx.fillStyle = '#100020';
        ctx.beginPath();
        ctx.arc(0, 0, 9 * s, 0, Math.PI * 2);
        ctx.fill();

        // Cowl
        ctx.fillStyle = WraithUnitRenderer.C_ROBE_DARK;
        ctx.beginPath();
        ctx.moveTo(0, -12 * s);
        ctx.bezierCurveTo(11 * s, -12 * s, 11 * s, 9 * s, 0, 9 * s);
        ctx.bezierCurveTo(-11 * s, 9 * s, -11 * s, -12 * s, 0, -12 * s);
        ctx.fill();

        // Face Hole shape
        ctx.fillStyle = '#000';
        ctx.beginPath();
        // Shield shape face
        ctx.moveTo(-5 * s, -2 * s);
        ctx.lineTo(5 * s, -2 * s);
        ctx.lineTo(0, 8 * s);
        ctx.lineTo(-5 * s, -2 * s);
        ctx.fill();
        // Upper dome
        ctx.beginPath(); ctx.arc(0, -2 * s, 5 * s, Math.PI, 0); ctx.fill();

        // Glowing Eyes
        const eyePulse = 0.8 + Math.sin(t * 8) * 0.2;
        this.drawEye(ctx, -2.5 * s, -1 * s, s * eyePulse, true);
        this.drawEye(ctx, 2.5 * s, -1 * s, s * eyePulse, false);
    }

    private drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, left: boolean) {
        const eyeImg = Assets.get('fx_boss_eye');
        if (eyeImg) {
            ctx.drawImage(eyeImg, x - 16 * s, y - 16 * s, 32 * s, 32 * s);
        } else {
            // Fallback
            ctx.translate(x, y);
            ctx.fillStyle = WraithUnitRenderer.C_SOUL_GLOW;
            ctx.beginPath();
            if (left) {
                ctx.moveTo(-1.2 * s, -0.6 * s); ctx.lineTo(1.2 * s, 0); ctx.lineTo(0, 1.2 * s);
            } else {
                ctx.moveTo(1.2 * s, -0.6 * s); ctx.lineTo(-1.2 * s, 0); ctx.lineTo(0, 1.2 * s);
            }
            ctx.fill();
            ctx.translate(-x, -y);
        }
    }

    private drawEffects(ctx: CanvasRenderingContext2D, s: number, t: number, enemy: Enemy) {
        const soulSpeed = enemy.isInvulnerable ? 8 : 2;
        this.drawGhostSouls(ctx, s, t * soulSpeed, enemy.isInvulnerable);
        if (enemy.isInvulnerable) {
            this.drawInvulnerabilityShield(ctx, s, t);
        }
    }

    private drawGhostSouls(ctx: CanvasRenderingContext2D, s: number, t: number, angry: boolean) {
        const count = 5;
        const soulImg = Assets.get('fx_soul');

        for (let i = 0; i < count; i++) {
            const angle = t + (i * (Math.PI * 2) / count);
            const rx = Math.cos(angle) * 18 * s;
            const ry = Math.sin(angle) * 6 * s;
            const z = Math.sin(angle);

            const scaleFactor = (1.5 + z * 0.5);
            const size = scaleFactor * s * 2.5;
            const alpha = 0.4 + z * 0.2;

            ctx.save();
            ctx.translate(rx, ry - 5 * s);

            if (soulImg && !angry) {
                // Use cached sprite for normal state
                ctx.globalAlpha = alpha;
                // Center sprite (16x16 original)
                // Scale it up
                const dSize = 16 * (size / 8); // approximate scaling
                ctx.drawImage(soulImg, -dSize, -dSize, dSize * 2, dSize * 2);
            } else {
                // Angry or fallback
                const color = angry ? '#ffeb3b' : WraithUnitRenderer.C_SOUL_GLOW;
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha;
                ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
            }

            // Trail (Simple Line)
            const color = angry ? '#ffeb3b' : WraithUnitRenderer.C_SOUL_GLOW;
            ctx.strokeStyle = color;
            ctx.lineWidth = size * 0.8;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(0, 0);
            const trailX = -Math.sin(angle) * -12 * s;
            const trailY = Math.cos(angle) * 3 * s;
            ctx.quadraticCurveTo(trailX * 0.5, trailY * 0.5, trailX, trailY);
            ctx.stroke();

            ctx.restore();
        }
        ctx.globalAlpha = 1.0;
    }

    private drawInvulnerabilityShield(ctx: CanvasRenderingContext2D, s: number, t: number) {
        const shieldImg = Assets.get('fx_boss_shield');
        if (shieldImg) {
            ctx.save();
            // Pulse scale
            const pulse = Math.sin(t * 10) * 0.05 + 1.0;
            ctx.scale(pulse, pulse);
            // Draw centered (128x128 original)
            const size = 64 * s;
            ctx.drawImage(shieldImg, -size, -size, size * 2, size * 2);
            ctx.restore();
        } else {
            // Fallback
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const pulse = Math.sin(t * 10) * 0.1;
            ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
            ctx.beginPath(); ctx.arc(0, -5 * s, 24 * s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 * s;
            ctx.setLineDash([6 * s, 4 * s]);
            ctx.beginPath(); ctx.arc(0, -5 * s, 24 * s + pulse * 5, 0 + t, Math.PI * 2 + t); ctx.stroke();
            ctx.restore();
        }
    }
}
