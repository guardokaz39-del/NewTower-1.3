import { Tower } from '../Tower';
import { CONFIG } from '../Config';
import { InkUtils } from '../graphics/InkUtils';
import { INK_CONFIG } from '../graphics/InkConfig';
import { InkHatching } from '../graphics/InkHatching';
import { VISUALS } from '../VisualConfig';

/**
 * Renders towers as if they were hand-drawn sketches on the map.
 * Supports all gameplay feedback: Building state, Recoil, Heat, Rotation.
 */
export class InkTowerRenderer {

    static draw(ctx: CanvasRenderingContext2D, tower: Tower) {
        const size = CONFIG.TILE_SIZE;
        const drawX = tower.col * size;
        const drawY = tower.row * size;

        if (tower.isBuilding) {
            this.drawBuildingState(ctx, tower, drawX, drawY, size);
        } else {
            this.drawActiveState(ctx, tower, size);
        }
    }

    private static drawBuildingState(ctx: CanvasRenderingContext2D, tower: Tower, x: number, y: number, size: number) {
        const pct = tower.buildProgress / tower.maxBuildProgress;
        const half = size / 2;
        const centerX = x + half;
        const centerY = y + half;

        // Ink fades in
        ctx.save();
        ctx.globalAlpha = pct;

        // Draw Construction Circle (Rough Sketch)
        ctx.strokeStyle = INK_CONFIG.PALETTE.INK;
        ctx.lineWidth = 1;

        // Draw multiple faint circles to look like a draft
        InkUtils.drawWobbleCircle(ctx, centerX, centerY, size * 0.3, 0);
        if (pct > 0.5) InkUtils.drawWobbleCircle(ctx, centerX, centerY, size * 0.35, 1);

        // Progress Bar (Ink Style)
        const barW = size - 16;
        const barH = 4;
        const barX = x + 8;
        const barY = y + size - 12;

        // Outline
        ctx.strokeStyle = '#5d4037';
        ctx.strokeRect(barX, barY, barW, barH);

        // Fill (Scribble)
        const fillW = barW * pct;
        if (fillW > 2) {
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(barX, barY, fillW, barH);
        }

        ctx.restore();
    }

    private static drawActiveState(ctx: CanvasRenderingContext2D, tower: Tower, size: number) {
        const half = size / 2;

        // 0. Drop Shadow (Slanted Ink Smudge)
        ctx.save();
        const lightAngle = VISUALS.LIGHTING.GLOBAL_LIGHT_ANGLE;
        const shadowDist = 8;
        // Shadow is offset opposite to light
        const sx = tower.x + size / 2 + Math.cos(lightAngle + Math.PI) * shadowDist;
        const sy = tower.y + size / 2 + Math.sin(lightAngle + Math.PI) * shadowDist;

        ctx.translate(sx, sy);
        ctx.rotate(lightAngle); // Rotate to align with light direction
        ctx.fillStyle = 'rgba(45, 27, 14, 0.15)'; // Very faint ink wash

        ctx.beginPath();
        // Elongated irregular shadow
        ctx.ellipse(0, 0, size * 0.4, size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner core of shadow (darker)
        ctx.fillStyle = 'rgba(45, 27, 14, 0.15)';
        ctx.beginPath();
        ctx.ellipse(-2, 0, size * 0.25, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 1. Base (Static Charcoal Sketch)
        this.drawBase(ctx, tower.x, tower.y, size);

        // 2. Turret (Rotated)
        ctx.save();
        ctx.translate(tower.x, tower.y);
        ctx.rotate(tower.angle);

        // Recoil
        if (tower.recoilFrames > 0) {
            const recoil = Math.sin(tower.recoilFrames * 0.5) * tower.recoilIntensity;
            ctx.translate(0, recoil);
            tower.recoilFrames--;
        }

        // Determine style from cards
        const mainCard = tower.cards[0];
        const type = mainCard ? mainCard.type.id : 'standard';

        // Draw the specific turret sketch
        this.drawTurretSketch(ctx, type, size);

        // Modules (Attachments)
        this.drawModules(ctx, tower);

        // Sniper Laser
        if (type === 'sniper') {
            this.drawLaserSight(ctx, tower);
        }

        ctx.restore();

        // 3. Status / Heat (Unrotated)
        if (type === 'minigun' && tower.spinupFrames > 0) {
            this.drawHeatEffects(ctx, tower);
        }

        // 4. Level Visuals
        const maxLevel = tower.cards.length > 0 ? Math.max(...tower.cards.map(c => c.level)) : 1;
        if (maxLevel > 1) {
            this.drawLevelVisuals(ctx, tower, maxLevel);
        }
    }

    private static drawBase(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        // Base Outline
        ctx.strokeStyle = 'rgba(45, 27, 14, 0.4)'; // Faint ink
        ctx.lineWidth = 2;
        const radius = size * 0.35;
        InkUtils.drawWobbleCircle(ctx, x, y, radius, 0); // Inner ring

        // Dynamic Hatching (Volume)
        // Assuming global light is roughly Top-Left (3/4 PI)
        const lightAngle = Math.PI * 0.75;

        const hatching = InkHatching.getCircularHatching(radius, lightAngle);
        ctx.drawImage(hatching, x - radius, y - radius);
    }

    private static drawTurretSketch(ctx: CanvasRenderingContext2D, type: string, size: number) {
        const time = Date.now() * 0.002;
        ctx.strokeStyle = INK_CONFIG.PALETTE.INK;
        ctx.fillStyle = '#fff'; // Paper fill for body
        ctx.lineWidth = 1.5;

        // STYLE: Da Vinci Blueprint
        // Geometric shapes, construction lines, measurement ticks.

        if (type === 'fire') {
            // "Mortar" schematic
            // Main circle
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.stroke();

            // Inner circle (bore)
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.stroke();

            // Nozzle/Chute (Trapezoid)
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(8, -8); // Top right
            ctx.lineTo(8, 8);  // Bot right
            ctx.lineTo(0, 6);
            ctx.stroke();

            // Construction marks
            this.drawMeasureTick(ctx, 0, -12, 0, 12); // Vertical axis

        } else if (type === 'ice') {
            // "Prism" schematic
            // Rhombus shape
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.lineTo(0, 8);
            ctx.lineTo(-12, 0);
            ctx.lineTo(0, -8);
            ctx.closePath();
            ctx.stroke();

            // Inner cross (Refraction lines)
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(12, 0); ctx.lineTo(-12, 0);
            ctx.moveTo(0, -8); ctx.lineTo(0, 8);
            ctx.stroke();
            ctx.setLineDash([]);

        } else if (type === 'sniper') {
            // "Ballista/Long Gun" schematic
            // Long barrel rectangle
            ctx.strokeRect(-4, -4, 30, 8);

            // Scope circle
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.stroke();

            // Crosshair in scope
            ctx.beginPath();
            ctx.moveTo(0, -4); ctx.lineTo(0, 4);
            ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
            ctx.stroke();

        } else if (type === 'minigun') {
            // "Gatling" schematic
            // Rotary circle block
            ctx.strokeRect(-6, -8, 12, 16); // Body

            // Barrels (3 lines)
            ctx.beginPath();
            ctx.moveTo(6, -5); ctx.lineTo(20, -5);
            ctx.moveTo(6, 0); ctx.lineTo(22, 0);
            ctx.moveTo(6, 5); ctx.lineTo(20, 5);
            ctx.stroke();

            // Gear teeth hint on body
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.stroke();

        } else if (type === 'multi') {
            // "Tri-shot" schematic
            // Triangle array
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-5, 8);
            ctx.lineTo(-5, -8);
            ctx.closePath();
            ctx.stroke();

            // 3 small circles at corners
            InkUtils.drawWobbleCircle(ctx, 10, 0, 2, 0);
            InkUtils.drawWobbleCircle(ctx, -5, 8, 2, 0);
            InkUtils.drawWobbleCircle(ctx, -5, -8, 2, 0);

        } else {
            // Standard Turret
            ctx.strokeRect(-8, -8, 16, 16);
            // Barrel
            ctx.strokeRect(8, -4, 12, 8);
            // Center rivet
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    private static drawMeasureTick(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
        ctx.save();
        ctx.strokeStyle = 'rgba(45, 27, 14, 0.4)'; // Faint ink
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    }

    private static drawModules(ctx: CanvasRenderingContext2D, tower: Tower) {
        tower.cards.forEach((card, index) => {
            if (index === 0) return; // Main card handled by turret sketch

            let ox = 0, oy = 0;
            // Variant 1: Distinct Nodes
            if (index === 1) { ox = -8; oy = -16; } // Top-Left
            else if (index === 2) { ox = -8; oy = 16; } // Bot-Left
            else { ox = -20; oy = 0; } // Back

            ctx.save();
            ctx.translate(ox, oy);

            // Connector line from center
            ctx.save();
            ctx.strokeStyle = INK_CONFIG.PALETTE.INK;
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Draw line back to 0,0 (relative to translation this is -ox, -oy)
            // But we are in turret local space. 
            // Turret center is at 0,0 relative to parent... wait.
            // drawModules is called inside context where 0,0 is Turret Center.
            // So we draw line from (0,0) to (-ox, -oy) ? No, we are translated to module center.
            // So we draw line to (-ox, -oy) which is the turret center.
            ctx.moveTo(0, 0);
            ctx.lineTo(-ox * 0.8, -oy * 0.8); // Connect almost to center
            ctx.stroke();
            ctx.restore();

            // Module Node (Gear / Small Circle)
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = INK_CONFIG.PALETTE.INK;
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Icon hint (Geometric symbol based on type)
            ctx.fillStyle = card.type.color;
            ctx.beginPath();
            if (card.type.id === 'damage') ctx.rect(-2, -2, 4, 4); // Square
            else ctx.arc(0, 0, 2, 0, Math.PI * 2); // Dot
            ctx.fill();

            ctx.restore();
        });
    }

    private static drawLaserSight(ctx: CanvasRenderingContext2D, tower: Tower) {
        const stats = tower.getStats();
        ctx.strokeStyle = 'rgba(200, 0, 0, 0.3)'; // Very faint red ink
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(35, 0); // Start after barrel
        ctx.lineTo(stats.range, 0);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    private static drawHeatEffects(ctx: CanvasRenderingContext2D, tower: Tower) {
        // Heat Haze (Wavy lines rising)
        const time = Date.now() * 0.005;
        const x = tower.x;
        const y = tower.y - 20;

        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;

        for (let i = 0; i < 3; i++) {
            const offset = (Math.sin(time + i) * 10);
            const h = 20 + Math.random() * 10;
            ctx.beginPath();
            ctx.moveTo(x + offset, y);
            ctx.quadraticCurveTo(x + offset + 5, y - h / 2, x + offset, y - h);
            ctx.stroke();
        }
        ctx.restore();
    }

    private static drawLevelVisuals(ctx: CanvasRenderingContext2D, tower: Tower, level: number) {
        if (level >= 2) {
            // Gold Aura Ring
            ctx.save();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            InkUtils.drawWobbleCircle(ctx, tower.x, tower.y, 25, Date.now() * 0.001);

            if (level >= 3) {
                // Double Ring
                InkUtils.drawWobbleCircle(ctx, tower.x, tower.y, 28, -Date.now() * 0.002);
            }
            ctx.restore();
        }

        // Level Number text
        ctx.fillStyle = INK_CONFIG.PALETTE.INK;
        ctx.font = '12px Courier New';
        ctx.fillText(`LVL ${level}`, tower.x + 15, tower.y - 15);
    }
}
