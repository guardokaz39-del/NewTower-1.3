import { Assets } from '../Assets';
import { CONFIG } from '../Config';
import { VISUALS } from '../VisualConfig';
import type { Tower } from '../Tower';

export class TowerRenderer {
    static draw(ctx: CanvasRenderingContext2D, tower: Tower) {
        const size = CONFIG.TILE_SIZE;
        const drawX = tower.col * size;
        const drawY = tower.row * size;

        if (tower.isBuilding) {
            TowerRenderer.drawBuildingState(ctx, tower, drawX, drawY, size);
        } else {
            TowerRenderer.drawActiveState(ctx, tower, size);
            // Draw Heat Haze (outside rotation context to rise UP)
            if (tower.spinupTime > 0) {
                // We need to confirm it's minigun, but drawActiveState encapsulates that logic mostly.
                // Actually, drawActiveState draws the bar, let's look closer.
                // Helper method call in drawActiveState is better.
            }
        }
    }

    private static drawBuildingState(ctx: CanvasRenderingContext2D, tower: Tower, drawX: number, drawY: number, size: number) {
        // Enhanced building animation - base emerges from below with opacity
        const pct = tower.buildProgress / tower.maxBuildProgress;
        const emergeOffset = (1 - pct) * 15; // Starts 15px below, rises to 0
        const halfSize = size / 2;

        ctx.save();

        // Clip to only show portion based on progress (reveal from bottom)
        ctx.beginPath();
        const clipHeight = size * pct;
        ctx.rect(drawX, drawY + size - clipHeight - emergeOffset, size, clipHeight + 5);
        ctx.clip();

        // Draw actual base with reduced opacity
        ctx.globalAlpha = 0.5 + pct * 0.5; // 50% -> 100% opacity
        const baseImg = Assets.get('base_default');
        if (baseImg) {
            ctx.drawImage(baseImg, drawX, drawY - emergeOffset);
        } else {
            // Fallback circle
            ctx.fillStyle = CONFIG.COLORS.TOWER_BASE;
            ctx.beginPath();
            ctx.arc(tower.x, tower.y - emergeOffset, size * 0.35, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Holographic construction lines overlay
        ctx.save();
        ctx.globalAlpha = 0.3 * (1 - pct); // Fade out as progress increases
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, size * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Progress bar
        const barWidth = size - 10;
        ctx.fillStyle = VISUALS.TOWER.BUILDING.BAR_BG;
        ctx.fillRect(drawX + 5, drawY + size - 10, barWidth, 5);
        ctx.fillStyle = '#4caf50'; // Green progress
        ctx.fillRect(drawX + 5, drawY + size - 10, barWidth * pct, 5);
    }

    private static drawActiveState(ctx: CanvasRenderingContext2D, tower: Tower, size: number) {
        // 1. Draw Base
        const halfSize = size / 2;
        const baseImg = Assets.get('base_default');
        if (baseImg) {
            ctx.drawImage(baseImg, tower.x - halfSize, tower.y - halfSize);
        }

        // 2. Determine Turret Asset based on Main Card (First Slot)
        let turretName = 'turret_standard';
        const mainCard = tower.cards[0];
        if (mainCard) {
            if (mainCard.type.id === 'ice') turretName = 'turret_ice';
            else if (mainCard.type.id === 'fire') turretName = 'turret_fire';
            else if (mainCard.type.id === 'sniper') turretName = 'turret_sniper';
            else if (mainCard.type.id === 'multi') turretName = 'turret_split';
            else if (mainCard.type.id === 'minigun') turretName = 'turret_minigun';
        }

        // 3. Draw Turret (Rotated) with Level Visuals
        const turretImg = Assets.get(turretName);
        if (turretImg) {
            ctx.save();
            ctx.translate(tower.x, tower.y);
            ctx.rotate(tower.angle);

            // Progressive scaling based on HIGHEST card level (not just first card)
            const cardLevel = tower.cards.length > 0
                ? Math.max(...tower.cards.map(c => c.level))
                : 1;
            const scaleMultiplier = 1.0 + ((cardLevel - 1) * 0.15); // LVL2=1.15, LVL3=1.30
            ctx.scale(scaleMultiplier, scaleMultiplier);

            // Recoil offset
            if (tower.recoilTimer > 0) {
                const recoilOffset = Math.sin(tower.recoilTimer * 20) * tower.recoilIntensity;
                ctx.translate(0, recoilOffset);
                // tower.recoilTimer reduced in WeaponSystem
            }

            ctx.drawImage(turretImg, -halfSize, -halfSize);

            // 4. Draw Modules (Attachments)
            TowerRenderer.drawModules(ctx, tower);

            // Laser Sight for Sniper (Only if Turret is Sniper)
            if (turretName === 'turret_sniper') {
                TowerRenderer.drawLaserSight(ctx, tower);
            }

            ctx.restore();

            // Level-based visual effects (outside rotation context)
            TowerRenderer.drawLevelVisuals(ctx, tower, cardLevel, mainCard);

            // 5. Minigun Overheat Bar & Heat Haze
            if (turretName === 'turret_minigun' && tower.spinupTime > 0) {
                TowerRenderer.drawOverheatBar(ctx, tower);
                TowerRenderer.drawHeatHaze(ctx, tower);
            }
        }
    }

    private static drawModules(ctx: CanvasRenderingContext2D, tower: Tower) {
        tower.cards.forEach((card, index) => {
            // Slot 0 Defines Turret Body. Modules are for Index > 0
            if (index > 0) {
                let modName = '';
                if (card.type.id === 'ice') modName = 'mod_ice';
                else if (card.type.id === 'fire') modName = 'mod_fire';
                else if (card.type.id === 'sniper') modName = 'mod_sniper';
                else if (card.type.id === 'multi') modName = 'mod_split';
                else if (card.type.id === 'minigun') modName = 'mod_minigun';

                const modImg = Assets.get(modName);
                if (modImg) {
                    let offX = 0;
                    let offY = 0;

                    if (index === 1) {
                        offX = -5; offY = 12; // Side 1
                    } else if (index === 2) {
                        offX = -5; offY = -12; // Side 2
                    } else {
                        offX = -12; offY = 0; // Back
                    }

                    ctx.save();
                    ctx.translate(offX, offY);
                    ctx.drawImage(modImg, -12, -12);
                    ctx.restore();
                }
            }
        });
    }

    private static drawLaserSight(ctx: CanvasRenderingContext2D, tower: Tower) {
        // Draw faint red line
        const stats = tower.getStats();
        // Pulse effect
        const opacity = 0.4 + Math.sin(Date.now() * 0.005) * 0.2; // 0.2 to 0.6

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = VISUALS.TOWER.LASER;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(10, 0); // Start from end of barrel approx
        ctx.lineTo(stats.range, 0); // extend to max range
        ctx.stroke();

        // Dot at the end
        ctx.fillStyle = VISUALS.TOWER.LASER;
        ctx.globalAlpha = opacity * 1.5;
        ctx.beginPath();
        ctx.arc(stats.range, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private static drawLevelVisuals(ctx: CanvasRenderingContext2D, tower: Tower, visualLevel: number, mainCard: any) {
        if (visualLevel > 1) {
            ctx.save();
            ctx.translate(tower.x, tower.y);

            if (visualLevel === 2) {
                // LVL 2: Pulse Glow
                const pulse = 0.3 + Math.sin(Date.now() * 0.003) * 0.1;
                const cardColor = mainCard?.type.color || '#fff';
                const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 25);
                gradient.addColorStop(0, `${cardColor}00`);
                gradient.addColorStop(1, `${cardColor}${Math.floor(pulse * 255).toString(16).padStart(2, '0')}`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, 25, 0, Math.PI * 2);
                ctx.fill();
            } else if (visualLevel === 3) {
                // LVL 3: Rotating Aura Ring
                const rotation = (Date.now() * 0.002) % (Math.PI * 2);
                const cardColor = mainCard?.type.color || '#fff';
                ctx.strokeStyle = cardColor;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;

                // Draw rotating arc segments
                for (let i = 0; i < 3; i++) {
                    const angle = rotation + (i * Math.PI * 2 / 3);
                    ctx.beginPath();
                    ctx.arc(0, 0, 28, angle, angle + Math.PI / 3);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1.0;
            }

            // Level counter badge
            ctx.fillStyle = '#ffd700'; // Gold
            ctx.font = 'bold 14px Arial';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(visualLevel.toString(), 20, -20);
            ctx.fillText(visualLevel.toString(), 20, -20);

            ctx.restore();
        }
    }

    private static drawOverheatBar(ctx: CanvasRenderingContext2D, tower: Tower) {
        // Calculate heat percentage
        const maxTime = tower.maxHeat || 5;
        let pct = tower.spinupTime / maxTime;
        if (pct > 1) pct = 1;

        // Visual flash if overheated
        if (tower.isOverheated) {
            pct = 1; // Full bar
        }

        const barW = 4;
        const barH = 20;
        const barX = tower.x + 20; // Right of tower
        const barY = tower.y - 10;

        // Bg
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barW, barH);

        // Fill
        // Color gradient from yellow to red
        if (tower.isOverheated) {
            ctx.fillStyle = (Math.floor(Date.now() / 100) % 2 === 0) ? '#ff0000' : '#ffffff'; // Flash
        } else {
            const r = 255;
            const g = Math.floor(255 * (1 - pct));
            ctx.fillStyle = `rgb(${r},${g},0)`;
        }

        // Draw from bottom up
        const fillH = barH * pct;
        ctx.fillRect(barX, barY + (barH - fillH), barW, fillH);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);
    }

    private static drawHeatHaze(ctx: CanvasRenderingContext2D, tower: Tower) {
        // Heat rises from the barrel
        // Calculate barrel tip world position
        const barrelLen = 30;
        const tipX = tower.x + Math.cos(tower.angle) * barrelLen;
        const tipY = tower.y + Math.sin(tower.angle) * barrelLen;

        ctx.save();
        // Use time for animation
        const time = Date.now() * 0.005;

        // Draw multiple rising heat puffs
        for (let i = 0; i < 3; i++) {
            // Oscillating offset
            // Cycle 0..50 pixels UP
            const cycleDur = 50;
            const offset = (time * 20 + i * (cycleDur / 3)) % cycleDur;

            // Fade out as it goes up (1.0 at bottom, 0.0 at top)
            const alpha = Math.max(0, (1 - (offset / cycleDur)) * 0.2);

            // Sway left/right
            const sway = Math.sin(time + i) * 5;
            const dist = offset; // rising

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            // Circle grows as it rises
            const size = 5 + (offset * 0.2);
            ctx.arc(tipX + sway, tipY - dist, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
