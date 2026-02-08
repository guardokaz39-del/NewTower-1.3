import { Assets } from '../Assets';
import { CONFIG } from '../Config';
import { VISUALS } from '../VisualConfig';
import type { Tower } from '../Tower';
import { getTurretRenderer } from './turrets';

export class TowerRenderer {
    static drawSprite(ctx: CanvasRenderingContext2D, tower: Tower) {
        const size = CONFIG.TILE_SIZE;
        const drawX = tower.col * size;
        const drawY = tower.row * size;

        if (tower.isBuilding) {
            TowerRenderer.drawBuildingSprite(ctx, tower, drawX, drawY, size);
        } else {
            TowerRenderer.drawActiveSprite(ctx, tower, size);
        }
    }

    static drawUI(ctx: CanvasRenderingContext2D, tower: Tower) {
        const size = CONFIG.TILE_SIZE;
        const drawX = tower.col * size;
        const drawY = tower.row * size;

        if (tower.isBuilding) {
            TowerRenderer.drawBuildingUI(ctx, tower, drawX, drawY, size);
        } else {
            // Overheat bar for Minigun
            let turretName = 'turret_standard';
            const mainCard = tower.cards[0];
            if (mainCard && mainCard.type.id === 'minigun') turretName = 'turret_minigun';

            if (turretName === 'turret_minigun' && tower.spinupTime > 0) {
                TowerRenderer.drawOverheatBar(ctx, tower);
            }
        }
    }

    static drawPreview(ctx: CanvasRenderingContext2D, x: number, y: number, cardId?: string) {
        ctx.globalAlpha = 0.5;
        // Draw Base
        const baseImg = Assets.get('base_default');
        if (baseImg) {
            ctx.drawImage(baseImg, x - 32, y - 32);
        } else {
            ctx.fillStyle = VISUALS.TOWER.BASE_COLOR;
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Turret (if card selected)
        if (cardId) {
            const renderer = getTurretRenderer(cardId);
            const turretImg = Assets.get(renderer.getTurretAsset(1));

            // Should also draw preview modules? Maybe too much detail.
            // Just draw the main turret for now.
            if (turretImg) {
                // Determine scale based on... level 1 for preview
                ctx.drawImage(turretImg, x - 32, y - 32);
            }

            // Draw range circle in preview?
            // Already handled by UI usually, but good to ensure visual clarity
        }
        ctx.globalAlpha = 1.0;
    }


    private static drawBuildingSprite(ctx: CanvasRenderingContext2D, tower: Tower, drawX: number, drawY: number, size: number) {
        // ... existing building sprite logic ...
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
            ctx.fillStyle = VISUALS.TOWER.BASE_COLOR;
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
    }

    private static drawBuildingUI(ctx: CanvasRenderingContext2D, tower: Tower, drawX: number, drawY: number, size: number) {
        // ... existing building UI logic ...
        // Progress bar
        const pct = tower.buildProgress / tower.maxBuildProgress;
        const barWidth = size - 10;
        ctx.fillStyle = VISUALS.TOWER.BUILDING.BAR_BG;
        ctx.fillRect(drawX + 5, drawY + size - 10, barWidth, 5);
        ctx.fillStyle = '#4caf50'; // Green progress
        ctx.fillRect(drawX + 5, drawY + size - 10, barWidth * pct, 5);
    }

    private static drawActiveSprite(ctx: CanvasRenderingContext2D, tower: Tower, size: number) {
        // 1. Draw Base (Static - NO Rotation, NO Recoil)
        const halfSize = size / 2;
        const baseImg = Assets.get('base_default');
        if (baseImg) {
            ctx.drawImage(baseImg, tower.x - halfSize, tower.y - halfSize);
        }

        // 2. Get turret renderer via Strategy Pattern
        const mainCard = tower.cards[0];
        const renderer = getTurretRenderer(mainCard?.type.id || 'default');

        // Progressive scaling based on HIGHEST card level
        const cardLevel = tower.cards.length > 0
            ? Math.max(...tower.cards.map(c => c.level))
            : 1;

        const turretName = renderer.getTurretAsset(cardLevel);

        // 3. Draw Turret (Rotated + Recoiled)
        const turretImg = Assets.get(turretName);
        if (turretImg) {
            ctx.save();
            ctx.translate(tower.x, tower.y);

            // Apply rotation
            // For Minigun, we might have additional barrel rotation? 
            // Usually minigun barrels spin AROUND the aim axis.
            // But this is top-down 2D. 
            // So 'barrelRotation' might effectively just be 'angle' if we want the whole gun to spin?
            // No, minigun barrels spin around the central axis.
            // Visually in 2D top down, this might look like the sprite switching frames OR
            // just blurring.
            // For now, standard rotation towards target:
            ctx.rotate(tower.angle);

            const scaleMultiplier = 1.0 + ((cardLevel - 1) * 0.15);
            ctx.scale(scaleMultiplier, scaleMultiplier);

            // Apply Barrel Recoil (Kickback)
            // Move along the negative X axis (since we are rotated, X is "forward")
            // Wait, standard canvas rotation: 0 is right (East).
            // So translates X moves forward/back.
            // Apply Barrel Recoil (Kickback)
            if (tower.barrelRecoil) {
                ctx.translate(tower.barrelRecoil, 0);
            }

            // Draw turret body
            if (renderer.drawTurret) {
                // Custom renderer handles the turret body + moving parts
                renderer.drawTurret(ctx, tower);
            } else {
                // Standard Sprite Drawing
                ctx.drawImage(turretImg, -halfSize, -halfSize);
            }

            // 4. Draw Modules (Attachments) - Attached to turret body?
            // If modules are attached to the rotating turret (like side-mounted guns), draw here.
            // If they are on the base, draw before.
            // Current design: Modules are ON the turret.
            TowerRenderer.drawModules(ctx, tower);

            // 5. Draw turret-specific effects (laser, heat haze)
            // Called INSIDE rotated+recoiled context so effects move with barrel
            if (renderer.drawEffects) {
                renderer.drawEffects(ctx, tower);
            }

            ctx.restore();

            // Level-based visual effects (outside rotation context, e.g. auras)
            TowerRenderer.drawLevelVisuals(ctx, tower, cardLevel, mainCard);
        }
    }

    private static drawModules(ctx: CanvasRenderingContext2D, tower: Tower) {
        tower.cards.forEach((card, index) => {
            // Slot 0 Defines Turret Body. Modules are for Index > 0
            if (index > 0) {
                const renderer = getTurretRenderer(card.type.id);
                // OLD: Sprite based
                // const modName = renderer.getModuleAsset();

                // NEW: Shape based modules (Phase 1)
                // For now, let's keep using the old sprite logic BUT
                // Phase 1 calls for Shapes.
                // Let's implement Shapes here as part of "Critical Fixes" 
                // because old icons were "pixel mush".

                // Determine position
                let offX = 0;
                let offY = 0;
                if (index === 1) { offX = -5; offY = 12; }
                else if (index === 2) { offX = -5; offY = -12; }
                else { offX = -12; offY = 0; }

                TowerRenderer.drawModuleShape(ctx, card.type.id, offX, offY, card.type.color);
            }
        });
    }

    private static drawModuleShape(ctx: CanvasRenderingContext2D, type: string, x: number, y: number, color: string) {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;

        // Simple shapes for readability
        ctx.beginPath();
        switch (type) {
            case 'fire': // Circle
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                break;
            case 'ice': // Diamond
                ctx.moveTo(x, y - 5);
                ctx.lineTo(x + 5, y);
                ctx.lineTo(x, y + 5);
                ctx.lineTo(x - 5, y);
                ctx.closePath();
                break;
            case 'sniper': // Triangle
                ctx.moveTo(x + 5, y);
                ctx.lineTo(x - 4, y - 4);
                ctx.lineTo(x - 4, y + 4);
                ctx.closePath();
                break;
            case 'multi': // Hexagon (Split)
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3;
                    const vx = x + Math.cos(angle) * 4;
                    const vy = y + Math.sin(angle) * 4;
                    if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
                }
                ctx.closePath();
                break;
            case 'minigun': // Square
                ctx.rect(x - 4, y - 4, 8, 8);
                break;
            default: // Small circle default
                ctx.arc(x, y, 3, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
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
        // Calculate percentage
        let pct = 0;

        if (tower.isOverheated) {
            // During overheat, show REVERSE progress (draining)
            // If totalOverheatDuration is 0 (shouldn't happen), avoid divide by zero
            const totalDur = tower.totalOverheatDuration || 1.5;
            pct = tower.overheatCooldown / totalDur;
        } else {
            // Normal heating up
            const maxTime = tower.maxHeat || 5;
            pct = tower.spinupTime / maxTime;
        }

        if (pct > 1) pct = 1;
        if (pct < 0) pct = 0;

        const barW = 6; // Slightly wider (was 4)
        const barH = 24; // Taller (was 20)
        const barX = tower.x + 22; // Right of tower
        const barY = tower.y - 12;

        // Bg
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX, barY, barW, barH);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        // Fill Logic
        if (tower.isOverheated) {
            // Flashing Red/Orange indicating danger/lockout
            const flash = Math.floor(Date.now() / 100) % 2 === 0;
            ctx.fillStyle = flash ? '#ff4400' : '#ff8800';
        } else {
            // Check if Cooling (No target, spinupTime > 0)
            // Ideally we'd pass a "isCooling" flag, but we can infer it if heat is decreasing.
            // However, TowerRenderer is static. 
            // Let's use blue tint if heat is not full and likely cooling? 
            // Actually, we don't know if it's cooling just by state here.
            // But we can check if it has a target in Tower? No.
            // Let's just keep the Red/Green gradient but maybe add a blue border if cooling?
            // Actually, user complained about "no animation of cooling".
            // The bar shrinking IS the animation.
            // Maybe they want the BAR COLOR to trigger "Cooling".
            // In WeaponSystem, when cooling, we reduce spinupTime.

            // Gradient Green -> Yellow -> Red
            if (pct < 0.5) {
                const r = Math.floor(255 * (pct * 2));
                ctx.fillStyle = `rgb(${r},255,0)`;
            } else {
                const g = Math.floor(255 * (2 - pct * 2));
                ctx.fillStyle = `rgb(255,${g},0)`;
            }
        }

        // Draw from bottom up
        const fillH = barH * pct;
        ctx.fillRect(barX + 1, barY + (barH - fillH) - 1, barW - 2, fillH);
    }
    static update(dt: number, tower: Tower) {
        if (tower.cards.length > 0) {
            const renderer = getTurretRenderer(tower.cards[0].type.id);
            if (renderer.update) {
                renderer.update(dt, tower);
            }
        }
    }
}
