import { CachedUnitRenderer } from './CachedUnitRenderer';
import { UnitRenderer } from './UnitRenderer';
import type { Enemy } from '../../Enemy';
import { Assets } from '../../Assets';
import { AssetCache } from '../../utils/AssetCache';

interface MagmaParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    maxLife: number;
    type: 'EMBER' | 'ASH' | 'SMOKE' | 'SPARK';
    active: boolean; // For pooling
}

export class MagmaUnitRenderer extends CachedUnitRenderer {
    // --- PALETTE: MOLTEN CORE ---
    // Core is blindingly bright, cooling as it goes out
    private static readonly C_CORE = '#ffffff';       // White-hot core
    private static readonly C_CORE_BRIGHT = '#fff9e6'; // Slightly yellow glow
    private static readonly C_LAVA_LIGHT = '#ff9800'; // Liquid Magma
    private static readonly C_LAVA_DARK = '#bf360c';  // Cooling Magma
    private static readonly C_CRUST = '#212121';      // Obsidian/Slag
    private static readonly C_ASH = '#757575';        // Grey Ash

    // --- DECOY PALETTE: DEAD STONE ---
    private static readonly C_STONE_BASE = '#0d0d0d';
    private static readonly C_STONE_DARK = '#1a1a1a';
    private static readonly C_STONE_HIGHLIGHT = '#424242';
    private static readonly C_EMBER_FAINT = '#3e1c14'; // Dying embers in cracks

    // Particle System (WeakMap for instance isolation)
    private particleSystems = new WeakMap<Enemy, MagmaParticle[]>();

    // Object Pool for Particles to avoid GC
    private static particlePool: MagmaParticle[] = [];

    constructor() {
        super();
        this.walkCycleMultiplier = 1.0;
    }

    // --- POOLING UTILS ---
    private static getParticle(): MagmaParticle {
        // Find inactive particle in pool
        const p = this.particlePool.find(p => !p.active);
        if (p) {
            p.active = true;
            return p;
        }
        // Create new if pool full/empty
        const newP: MagmaParticle = {
            x: 0, y: 0, vx: 0, vy: 0, size: 0, life: 0, maxLife: 0, type: 'SMOKE', active: true
        };
        this.particlePool.push(newP);
        return newP;
    }

    private static releaseParticle(p: MagmaParticle) {
        p.active = false;
    }

    // BAKING SUPPORT
    drawFrame(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number): void {
        const time = t * 10;
        const scale = 1.0;
        // Check local override or passed enemy type for boss status
        const isBoss = (enemy.typeId === 'magma_king');

        if (isBoss) {
            this.drawDemonBoss(ctx, enemy, scale, time);
        } else {
            this.drawObsidianStatue(ctx, scale, time);
        }
    }

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const isBoss = enemy.typeId === 'magma_king';

        // --- PARTICLE UPDATE (Always Procedural) ---
        this.updateParticles(ctx, enemy, scale, isBoss);

        // --- BODY RENDERING (Cached or Fallback) ---
        super.drawBody(ctx, enemy, scale, rotation);
    }


    // =========================================================================
    // 1. THE MOLTEN ARCHDEMON
    // =========================================================================
    private drawDemonBoss(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, time: number) {
        const isMoving = !enemy.finished && enemy.baseSpeed > 5;
        const hpPercent = enemy.currentHealth / enemy.maxHealth;

        // INTENSIFIED Breathing: The core expands MORE, cracking the crust
        const breathe = Math.sin(time * 3) * 0.10 * scale;

        // Instability: As HP drops, the crust fragments more (jitter)
        const instability = (1 - hpPercent) * 3;

        // Movement Flow
        const lean = isMoving ? Math.sin(time * 4) * 5 * scale : 0;

        // INCREASED Heavy Step for more impact
        const heavyStep = Math.abs(Math.sin(time * 4)) * 5 * scale;

        // Low HP Jitter
        const jitterX = hpPercent < 0.3 ? (Math.random() - 0.5) * 2 * scale : 0;
        const jitterY = hpPercent < 0.3 ? (Math.random() - 0.5) * 2 * scale : 0;

        ctx.translate(lean + jitterX, -heavyStep + jitterY);
        ctx.scale(scale + breathe, scale + breathe);

        // A. MAGMA BODY (The Glow)
        this.drawLavaCore(ctx, time, instability, hpPercent);

        // B. OBSIDIAN ARMOR (Floating Plates)
        this.drawCrustPlates(ctx, time, instability);

        // C. HEAD (The Crown)
        this.drawDemonHead(ctx, time, lean);

        // D. ARMS (Heavy Flow with DRIPPING LAVA)
        this.drawLavaArms(ctx, time, isMoving);
    }

    private drawLavaCore(ctx: CanvasRenderingContext2D, time: number, instability: number, hpPercent: number) {
        // More WHITE the lower HP gets (desperation)
        const coreIntensity = 1 - (hpPercent * 0.5);

        // Complex Gradient: Core -> Lava -> Cooling Edge
        const grad = ctx.createRadialGradient(0, -15, 3, 0, -12, 35);
        grad.addColorStop(0, MagmaUnitRenderer.C_CORE);
        grad.addColorStop(0.15, MagmaUnitRenderer.C_CORE_BRIGHT);
        grad.addColorStop(0.4, MagmaUnitRenderer.C_LAVA_LIGHT);
        grad.addColorStop(0.75, MagmaUnitRenderer.C_LAVA_DARK);
        grad.addColorStop(1, MagmaUnitRenderer.C_CRUST);

        ctx.fillStyle = grad;

        // Shape: Bulky, muscular upper body, tapering to a flow
        ctx.beginPath();
        ctx.moveTo(-15, -25); // Shoulder L
        ctx.quadraticCurveTo(0, -30, 15, -25); // Shoulder R
        ctx.bezierCurveTo(25, -10, 10, 5 + instability, 0, 10); // Torso R
        ctx.bezierCurveTo(-10, 5 + instability, -25, -10, -15, -25); // Torso L
        ctx.fill();

        ctx.fillStyle = MagmaUnitRenderer.C_CORE;
        const coreSize = 6 + coreIntensity * 3;

        // Fake Glow (Optimized)
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(0, -15, coreSize * 1.5, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(0, -15, coreSize, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawCrustPlates(ctx: CanvasRenderingContext2D, time: number, instability: number) {
        // Large polygonal plates that float on the magma
        // MORE MOVEMENT at high instability
        ctx.fillStyle = MagmaUnitRenderer.C_CRUST;

        // Chest Plate (Broken) - INCREASED movement
        const shiftX = Math.sin(time * 2) * (2 + instability * 2);
        const shiftY = Math.cos(time * 2) * (2 + instability * 2);

        // Left Plate
        ctx.beginPath();
        ctx.moveTo(-2 + shiftX, -18 + shiftY);
        ctx.lineTo(-12, -22);
        ctx.lineTo(-10, -8);
        ctx.closePath();
        ctx.fill();

        // Right Plate
        ctx.beginPath();
        ctx.moveTo(2 - shiftX, -18 - shiftY);
        ctx.lineTo(12, -22);
        ctx.lineTo(10, -8);
        ctx.closePath();
        ctx.fill();

        // Abdominal Plates with rotation
        ctx.save();
        ctx.translate(0, -5);
        ctx.rotate(shiftX * 0.05);
        ctx.fillRect(-6, 0, 12, 4);
        ctx.restore();
    }

    private drawDemonHead(ctx: CanvasRenderingContext2D, time: number, lean: number) {
        ctx.save();
        ctx.translate(0, -28);

        // Horns (Floating Obsidian Shards) - INCREASED float
        ctx.fillStyle = MagmaUnitRenderer.C_CRUST;
        const hornFloat = Math.sin(time * 4) * 3;

        // Left Horn
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.lineTo(-20, -12 + hornFloat); ctx.lineTo(-10, -2);
        ctx.fill();

        // Right Horn
        ctx.beginPath();
        ctx.moveTo(8, 0); ctx.lineTo(20, -12 - hornFloat); ctx.lineTo(10, -2);
        ctx.fill();

        // Face (Skull-like magma)
        ctx.fillStyle = MagmaUnitRenderer.C_LAVA_LIGHT;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 10, lean * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Obsidian Mask
        ctx.fillStyle = MagmaUnitRenderer.C_CRUST;
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(6, -6);
        ctx.lineTo(0, 8); // Jaw
        ctx.fill();

        // Eyes (INTENSIFIED - Brighter)
        // Replaced shadowBlur with manual glow
        ctx.fillStyle = MagmaUnitRenderer.C_CORE;

        // Fake Glow
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(-3, -2, 3.5, 0, Math.PI * 2);
        ctx.arc(3, -2, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(-3, -2, 2, 0, Math.PI * 2);
        ctx.arc(3, -2, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private drawLavaArms(ctx: CanvasRenderingContext2D, time: number, move: boolean) {
        const sway = Math.sin(time * 2) * 0.2;

        // Arms are heavy, dripping magma
        this.drawHeavyArm(ctx, -16, -22, -0.3 + sway, false, time);
        this.drawHeavyArm(ctx, 16, -22, 0.3 - sway, true, time);
    }

    private drawHeavyArm(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, flip: boolean, time: number) {
        ctx.save();
        ctx.translate(x, y);
        if (flip) ctx.scale(-1, 1);
        ctx.rotate(angle);

        // Magma Flow Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, 35);
        grad.addColorStop(0, MagmaUnitRenderer.C_CRUST); // Shoulder is hard
        grad.addColorStop(0.4, MagmaUnitRenderer.C_LAVA_LIGHT);
        grad.addColorStop(0.8, MagmaUnitRenderer.C_LAVA_DARK);
        grad.addColorStop(1, MagmaUnitRenderer.C_LAVA_LIGHT); // Dripping tip

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-10, 10, -5, 25, 0, 35); // Heavy dripping hand
        ctx.bezierCurveTo(5, 25, 10, 10, 0, 0);
        ctx.fill();

        // Floating crust bits + DRIPPING EFFECT
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const drift = Math.sin(time * 5) * 2;
        ctx.fillRect(-2, 10 + drift, 4, 4);

        // LAVA DRIP (animated)
        const dripY = 35 + Math.abs(Math.sin(time * 3)) * 8;
        ctx.fillStyle = MagmaUnitRenderer.C_LAVA_LIGHT;
        ctx.beginPath();
        ctx.ellipse(0, dripY, 1.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }


    // =========================================================================
    // 2. THE OBSIDIAN STATUE (DECOY) - ENHANCED
    // =========================================================================
    private drawObsidianStatue(ctx: CanvasRenderingContext2D, scale: number, time: number) {
        ctx.scale(scale, scale);

        // Statue Body (Crystalline, Angular)
        ctx.fillStyle = MagmaUnitRenderer.C_STONE_BASE;
        ctx.strokeStyle = MagmaUnitRenderer.C_STONE_HIGHLIGHT;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        // HEROIC POSE: Arms raised
        ctx.moveTo(-14, -28);
        ctx.lineTo(-8, -20);
        ctx.lineTo(-12, -10);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-12, 10);
        ctx.lineTo(12, 10);
        ctx.lineTo(8, 0);
        ctx.lineTo(12, -10);
        ctx.lineTo(8, -20);
        ctx.lineTo(14, -28);
        ctx.lineTo(0, -25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // CRACK NETWORK
        ctx.strokeStyle = MagmaUnitRenderer.C_STONE_DARK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.lineTo(-5, -10); ctx.lineTo(2, -5); ctx.lineTo(-3, 2);
        ctx.stroke();

        // Secondary cracks
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, -10); ctx.lineTo(-8, -8);
        ctx.moveTo(2, -5); ctx.lineTo(5, -3);
        ctx.moveTo(-3, 2); ctx.lineTo(-6, 5);
        ctx.stroke();

        // DYING EMBERS in Cracks (Red glow)
        // REPLACED shadowBlur with stroke + alpha overlap
        ctx.fillStyle = 'rgba(0,0,0,0)'; // No fill
        ctx.strokeStyle = 'rgba(255, 61, 0, 0.5)'; // Orange faint glow
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.lineTo(-5, -10); ctx.lineTo(2, -5);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = MagmaUnitRenderer.C_EMBER_FAINT;
        ctx.stroke();

        // Head (Frozen Scream)
        ctx.translate(0, -30);
        ctx.fillStyle = MagmaUnitRenderer.C_STONE_BASE;
        ctx.strokeStyle = MagmaUnitRenderer.C_STONE_HIGHLIGHT;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eyes (Dead, but faint ember)
        ctx.fillStyle = MagmaUnitRenderer.C_EMBER_FAINT;
        ctx.beginPath();
        ctx.arc(-3, -1, 1, 0, Math.PI * 2);
        ctx.arc(3, -1, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // =========================================================================
    // 3. PARTICLE SYSTEM (AAA EFFECT) - OPTIMIZED (Pooled)
    // =========================================================================
    private updateParticles(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, isBoss: boolean) {
        let particles = this.particleSystems.get(enemy);
        if (!particles) {
            particles = [];
            this.particleSystems.set(enemy, particles);
        }

        // SPAWN
        const spawnRate = isBoss ? 0.6 : 0.4;
        if (Math.random() < spawnRate) {
            let type: 'EMBER' | 'ASH' | 'SMOKE' | 'SPARK' = 'SMOKE';

            if (isBoss) {
                const rand = Math.random();
                if (rand > 0.7) type = 'SPARK';
                else if (rand > 0.4) type = 'EMBER';
                else type = 'SMOKE';
            } else {
                type = Math.random() > 0.5 ? 'ASH' : 'SMOKE';
            }

            // USE POOL
            const p = MagmaUnitRenderer.getParticle();
            p.x = (Math.random() * 30 - 15) * scale;
            p.y = -(Math.random() * 30 + 10) * scale;
            p.vx = (Math.random() - 0.5) * 0.8;
            p.vy = type === 'SPARK' ? -(Math.random() * 3 + 2) :
                type === 'EMBER' ? -(Math.random() * 2 + 1) :
                    -(Math.random() + 0.5);
            p.size = (Math.random() * 3 + 1) * scale;
            p.life = 1.0;
            p.maxLife = 1.0;
            p.type = type;

            particles.push(p);
        }

        // UPDATE & DRAW
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= p.type === 'SPARK' ? 0.03 : 0.015;
            p.x += p.vx + Math.sin(p.life * 10) * 0.3;
            p.y += p.vy;

            if (p.life <= 0) {
                // Return to pool
                MagmaUnitRenderer.releaseParticle(p);
                // Swap & Pop
                particles[i] = particles[particles.length - 1];
                particles.pop();
                continue;
            }

            // Draw
            ctx.globalAlpha = p.life;
            if (p.type === 'SPARK') {
                ctx.fillStyle = MagmaUnitRenderer.C_CORE;
                // Fake Glow
                ctx.globalAlpha = p.life * 0.5;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = p.life;
            } else if (p.type === 'EMBER') {
                ctx.fillStyle = MagmaUnitRenderer.C_LAVA_LIGHT;
            } else if (p.type === 'ASH') {
                ctx.fillStyle = MagmaUnitRenderer.C_ASH;
            } else {
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; // Smoke
            }

            ctx.beginPath();
            const renderSize = p.size * (p.type === 'SPARK' ? 0.3 : p.type === 'EMBER' ? 0.5 : 1.0);
            ctx.arc(p.x, p.y, renderSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    drawEmissive(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.002;
        if (enemy.typeId === 'magma_king') {
            // INTENSIFIED Heat Haze / Glow with PULSING
            const pulse = (Math.sin(time * 3) + 1) * 0.5; // 0..1

            // Replaced shadowBlur with AssetCache.getGlow (Radial Gradient)
            // Color #ff5722 = Orange-Red
            const glow1 = AssetCache.getGlow('rgba(255, 87, 34, 0.4)', 64);
            const size1 = (40 + pulse * 10) * scale;

            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(glow1, -size1, -size1, size1 * 2, size1 * 2);

            // Layer 2: Wide soft glow
            const glow2 = AssetCache.getGlow('rgba(255, 152, 0, 0.2)', 100);
            const size2 = (60 + pulse * 15) * scale;
            ctx.drawImage(glow2, -size2, -size2, size2 * 2, size2 * 2);

            ctx.globalCompositeOperation = 'source-over';

        } else {
            // Statue: Faint residual heat
            const glow = AssetCache.getGlow('rgba(255, 61, 0, 0.3)', 32);
            const size = 20 * scale;
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(glow, -size, -size, size * 2, size * 2);
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
