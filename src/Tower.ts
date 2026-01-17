import { CONFIG } from './Config';
import { ICard } from './CardSystem';
import { Enemy } from './Enemy';
import { Projectile, IProjectileStats } from './Projectile';
import { ObjectPool } from './Utils';
import { EffectSystem } from './EffectSystem';
import { Assets } from './Assets';
import { VISUALS } from './VisualConfig';
import { getCardUpgrade, mergeModifiers, mergeEffects, getMultishotConfig, ICardEffect } from './cards';

export class Tower {
    public col: number;
    public row: number;
    public x: number;
    public y: number;

    public cards: ICard[] = [];
    public cooldown: number = 0;
    public angle: number = 0;
    public targetingMode: string = 'first'; // Targeting priority: first, closest, strongest, weakest, last

    public isBuilding: boolean = false;
    public buildProgress: number = 0;
    public maxBuildProgress: number = CONFIG.TOWER.BUILD_TIME;

    public costSpent: number = 0;

    // Spinup state (for Minigun cards)
    public spinupFrames: number = 0;        // Frames spent firing continuously
    public maxHeat: number = 300;           // Max frames before overheat (default 5s)
    public isOverheated: boolean = false;   // Whether tower is overheated
    public overheatCooldown: number = 0;    // Frames remaining in overheat lockout

    // Visual state (Phase 3)
    public recoilFrames: number = 0;        // Recoil animation timer
    public recoilIntensity: number = 0;     // Recoil strength

    constructor(c: number, r: number) {
        this.col = c;
        this.row = r;
        this.x = c * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.y = r * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.costSpent = CONFIG.ECONOMY.TOWER_COST;
    }

    public static getPreviewStats(cards: ICard[]): any {
        const dummy = new Tower(0, 0);
        dummy.cards = cards;
        return dummy.getStats();
    }

    getStats(): IProjectileStats & { range: number; cd: number; projCount: number; spread: number; projectileType: string } {
        // Start with base stats
        let range = CONFIG.TOWER.BASE_RANGE;
        let damage = CONFIG.TOWER.BASE_DMG;
        let attackSpeed = CONFIG.TOWER.BASE_CD;
        let speed = 8;
        let color = VISUALS.PROJECTILES.STANDARD;
        let critChance = 0;
        let pierce = 0;
        let projectileType = 'standard';

        const allEffects: ICardEffect[] = [];
        const cardModifiers: any[] = [];

        // Collect modifiers and effects from all cards (except multishot)
        this.cards.forEach((card) => {
            const typeId = card.type.id;
            const level = card.level;

            // Skip multishot for now - handle separately
            if (typeId === 'multi') return;

            const upgrade = getCardUpgrade(typeId, level);
            if (!upgrade) return;

            cardModifiers.push(upgrade.modifiers);
            allEffects.push(...upgrade.effects);
        });

        // Merge all modifiers
        const mergedMods = mergeModifiers(cardModifiers);

        // Apply modifiers
        damage += mergedMods.damage || 0;
        range += mergedMods.range || 0;
        range *= mergedMods.rangeMultiplier || 1.0;
        attackSpeed = attackSpeed / (mergedMods.attackSpeedMultiplier || 1.0);
        critChance = mergedMods.critChance || 0;

        // Handle multishot cards
        let projCount = 1;
        let damageMultiplier = 1.0;
        const multiCards = this.cards.filter((c) => c.type.id === 'multi');

        // Get visual overrides from first card (data-driven approach)
        const mainCard = this.cards[0];
        if (mainCard) {
            const upgrade = getCardUpgrade(mainCard.type.id, mainCard.level);
            if (upgrade?.visualOverrides) {
                projectileType = upgrade.visualOverrides.projectileType || 'standard';
                color = upgrade.visualOverrides.projectileColor || VISUALS.PROJECTILES.STANDARD;
                speed = upgrade.visualOverrides.projectileSpeed || 8;
            } else if (mainCard.type.id === 'multi') {
                // Fallback for multishot (no visual overrides needed, it modifies count)
                projectileType = 'split';
                color = VISUALS.PROJECTILES.SPLIT;
            }
        }

        if (multiCards.length > 0) {
            // Use highest level multishot card
            const maxLevel = Math.max(...multiCards.map((c) => c.level));
            const multiConfig = getMultishotConfig(maxLevel);
            projCount = multiConfig.projectileCount;
            damageMultiplier = multiConfig.damageMultiplier;

            // If main card is NOT multishot, but we have multishot upgrades, 
            // the projectile type stays as main card (e.g. Ice + Split = 3 Ice Shards)
            // But if Multishot is the FIRST card, then it's a "Split Tower"
        }

        // Apply multishot damage penalty
        damage *= damageMultiplier;

        // Find pierce effect
        const pierceEffect = allEffects.find(e => e.type === 'pierce');
        if (pierceEffect) {
            pierce = pierceEffect.pierceCount || 0;
        }

        // === SPINUP MECHANIC ===
        // Find spinup effect and apply bonuses based on current spinupFrames
        const spinupEffect = allEffects.find(e => e.type === 'spinup');
        if (spinupEffect) {
            const spinupSeconds = this.spinupFrames / 60; // Convert frames to seconds

            // Apply damage bonus
            if (spinupEffect.spinupSteps) {
                // Stepped damage (Level 3)
                for (const step of spinupEffect.spinupSteps) {
                    if (spinupSeconds >= step.threshold) {
                        damage = CONFIG.TOWER.BASE_DMG * 0.5 + step.damage; // Base 2.5 + step bonus
                    }
                }
            } else if (spinupEffect.spinupDamagePerSecond) {
                // Linear damage (Level 1-2)
                const bonusDamage = spinupEffect.spinupDamagePerSecond * spinupSeconds;
                damage += bonusDamage;
            }

            // Apply crit chance bonus
            if (spinupEffect.spinupCritPerSecond) {
                const bonusCrit = spinupEffect.spinupCritPerSecond * spinupSeconds;
                critChance += bonusCrit;
            }

            // Cap spinup at max seconds
            // (actual capping happens in WeaponSystem)
        }

        return {
            range: Math.round(range),
            dmg: damage,
            cd: Math.round(attackSpeed),
            speed,
            color,
            effects: allEffects,
            pierce,
            projCount,
            spread: projCount > 1 ? 0.3 : 0,
            critChance,
            projectileType
        };
    }

    addCard(c: ICard): boolean {
        if (this.cards.length < CONFIG.TOWER.MAX_CARDS) {
            this.cards.push(c);
            this.costSpent += 100;
            return true;
        }
        return false;
    }

    removeCard(index: number): ICard | null {
        if (index < 0 || index >= this.cards.length) return null;
        const card = this.cards.splice(index, 1)[0];
        return card || null;
    }

    updateBuilding(effects: EffectSystem) {
        if (this.isBuilding) {
            this.buildProgress++;
            if (this.buildProgress >= this.maxBuildProgress) {
                this.isBuilding = false;
                effects.add({ type: 'explosion', x: this.x, y: this.y, radius: 30, life: 20, color: VISUALS.PROJECTILES.STANDARD });
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        const size = CONFIG.TILE_SIZE;
        const drawX = this.col * size;
        const drawY = this.row * size;

        if (this.isBuilding) {
            // Стройка (фундамент)

            ctx.fillStyle = VISUALS.TOWER.BUILDING.BASE;
            ctx.fillRect(drawX + 5, drawY + 5, size - 10, size - 10);
            const barWidth = size - 10;
            const pct = this.buildProgress / this.maxBuildProgress;
            ctx.fillStyle = VISUALS.TOWER.BUILDING.BAR_BG;
            ctx.fillRect(drawX + 5, drawY + size - 15, barWidth, 8);
            ctx.fillStyle = VISUALS.TOWER.BUILDING.BAR_FILL;
            ctx.fillRect(drawX + 5, drawY + size - 15, barWidth * pct, 8);
        } else {
            // --- MODULAR RENDER SYSTEM ---

            // 1. Draw Base
            const halfSize = size / 2;
            const baseImg = Assets.get('base_default');
            if (baseImg) {
                ctx.drawImage(baseImg, this.x - halfSize, this.y - halfSize);
            }

            // 2. Determine Turret Asset based on Main Card (First Slot)
            let turretName = 'turret_standard';
            const mainCard = this.cards[0];
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
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);

                // Progressive scaling based on HIGHEST card level (not just first card)
                const cardLevel = this.cards.length > 0
                    ? Math.max(...this.cards.map(c => c.level))
                    : 1;
                const scaleMultiplier = 1.0 + ((cardLevel - 1) * 0.15); // LVL2=1.15, LVL3=1.30
                ctx.scale(scaleMultiplier, scaleMultiplier);

                // Recoil offset
                if (this.recoilFrames > 0) {
                    const recoilOffset = Math.sin(this.recoilFrames * 0.5) * this.recoilIntensity;
                    ctx.translate(0, recoilOffset);
                    this.recoilFrames--;
                }

                ctx.drawImage(turretImg, -halfSize, -halfSize);

                // 4. Draw Modules (Attachments)
                // Iterate through cards to verify what modules to draw
                this.cards.forEach((card, index) => {
                    // Logic: 
                    // Main Card (Index 0) defines the Turret Body - already drawn.
                    // However, we *could* add a "Module" for the main card too if we wanted visual flair, 
                    // BUT the spec says "Modules (Attachments) - Defined by UPGRADE CARDS".
                    // So we might skip index 0, OR we treat all cards as potentially adding modules.
                    // The spec says:
                    // "Modules (Attachments) — Defined by CARDS IN SLOTS ... determined by UPGRADE cards"
                    // "B. Turrets ... - Defined by FIRST card"

                    // Interpretation:
                    // Slot 0 -> Defines Turret Body.
                    // Slot 1..N -> Define Modules attached to the body.

                    // Let's draw modules for Index > 0
                    if (index > 0) {
                        let modName = '';
                        if (card.type.id === 'ice') modName = 'mod_ice';
                        else if (card.type.id === 'fire') modName = 'mod_fire';
                        else if (card.type.id === 'sniper') modName = 'mod_sniper';
                        else if (card.type.id === 'multi') modName = 'mod_split';
                        else if (card.type.id === 'minigun') modName = 'mod_minigun';

                        const modImg = Assets.get(modName);
                        if (modImg) {
                            // Positioning modules
                            // We need "Anchor Points". 
                            // Simple logic: 
                            // Slot 1: Left side
                            // Slot 2: Right side
                            // Slot 3: Top/Back

                            // Relative offsets to center (0,0) (which is the turret pivot)
                            let offX = 0;
                            let offY = 0;
                            let rot = 0;

                            if (index === 1) {
                                offX = 0; offY = 10; // Right side (relative to gun pointing right?? No, standard rotation is 0=East?)
                                // Wait, standard 0 angle usually points East.
                                // In generateTexture, we drew barrels pointing Right?
                                // turret_standard: Barrel is (0, -6, 20, 12). If 0 is East... 
                                // Actually usually canvas arc 0 is East.
                                // But let's assume standard rotation.

                                // Let's simplify: Place modules around the center.
                                // index 1: Side 1
                                offX = -5; offY = 12;
                            } else if (index === 2) {
                                offX = -5; offY = -12;
                            } else {
                                offX = -12; offY = 0; // Back
                            }

                            ctx.save();
                            ctx.translate(offX, offY);
                            // Draw module centered at offset
                            ctx.drawImage(modImg, -12, -12);
                            ctx.restore();
                        }
                    }
                });

                // Laser Sight for Sniper (Only if Turret is Sniper)
                if (turretName === 'turret_sniper') {
                    // Draw faint red line
                    const stats = this.getStats();
                    ctx.globalCompositeOperation = 'screen';
                    ctx.strokeStyle = VISUALS.TOWER.LASER;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(10, 0); // Start from end of barrel approx
                    ctx.lineTo(stats.range, 0); // extend to max range
                    ctx.stroke();
                    ctx.globalCompositeOperation = 'source-over';
                }

                ctx.restore();

                // Level-based visual effects (outside rotation context)
                // Use same cardLevel calculation as for scaling
                const visualLevel = this.cards.length > 0
                    ? Math.max(...this.cards.map(c => c.level))
                    : 1;

                if (visualLevel > 1) {
                    ctx.save();
                    ctx.translate(this.x, this.y);

                    if (visualLevel === 2) {
                        // LVL 2: Pulse Glow
                        const pulse = 0.3 + Math.sin(Date.now() * 0.003) * 0.1;
                        const cardColor = mainCard.type.color || '#fff';
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
                        const cardColor = mainCard.type.color || '#fff';
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

                // 5. Minigun Overheat Bar
                if (turretName === 'turret_minigun' && this.spinupFrames > 0) {
                    this.drawOverheatBar(ctx, size);
                }
            }
        }
    }

    private drawOverheatBar(ctx: CanvasRenderingContext2D, size: number) {
        // Calculate heat percentage
        const maxFrames = this.maxHeat || 420;
        let pct = this.spinupFrames / maxFrames;
        if (pct > 1) pct = 1;

        // Visual flash if overheated
        if (this.isOverheated) {
            pct = 1; // Full bar
        }

        const barW = 4;
        const barH = 20;
        const barX = this.x + 20; // Right of tower
        const barY = this.y - 10;

        // Bg
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barW, barH);

        // Fill
        // Color gradient from yellow to red
        if (this.isOverheated) {
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
}
