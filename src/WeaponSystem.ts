import { Tower } from './Tower';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { CONFIG } from './Config';
import { EffectSystem } from './EffectSystem';
import { SoundManager, SoundPriority } from './SoundManager';
import { ProjectileSystem } from './systems/ProjectileSystem';

export class WeaponSystem {

    public update(towers: Tower[], enemies: Enemy[], projectileSystem: ProjectileSystem, dt: number, effects?: EffectSystem) {
        towers.forEach(tower => {
            this.processTower(tower, enemies, projectileSystem, dt, effects);
        });
    }

    private processTower(tower: Tower, enemies: Enemy[], projectileSystem: ProjectileSystem, dt: number, effects?: EffectSystem) {
        if (tower.isBuilding) return;
        if (tower.cards.length === 0) return;

        // Handle overheat cooldown
        if (tower.isOverheated) {
            if (tower.overheatCooldown > 0) {
                tower.overheatCooldown -= dt;
            } else {
                tower.isOverheated = false;
                tower.spinupTime = 0; // Reset spinup after overheat
            }
            return; // Can't shoot while overheated
        }

        if (tower.cooldown > 0) {
            tower.cooldown -= dt;
        }

        // Decrement recoil (seconds)
        if (tower.recoilTimer > 0) {
            tower.recoilTimer -= dt;
            if (tower.recoilTimer < 0) tower.recoilTimer = 0;
        }

        const stats = tower.getStats();

        // 1. Find Target
        const target = this.findTarget(tower, enemies, stats.range);

        if (target) {
            // === SPINUP MECHANIC ===
            // Increment spinup progress whenever we have a target (and not overheated yet)
            const spinupEffect = stats.effects.find(e => e.type === 'spinup');
            if (spinupEffect && !tower.isOverheated) {
                // PHYSICS-BASED HEAT GENERATION
                // Heat generation depends on how fast the gun is firing.
                // Standard Minigun (LVL1) has ~2.65x multiplier.
                // If we add Sniper (0.5x), heat should generate slower.
                // If we add Rapid Fire (2.0x), heat should generate faster.
                // We normalize against the base Minigun speed (~2.65) to keep the 5s duration standard.
                const MINIGUN_BASE_SPEED_MULT = 2.65;
                const speedFactor = (stats.attackSpeedMultiplier || 1.0) / MINIGUN_BASE_SPEED_MULT;

                // If using Sniper card, speedFactor will be < 1, so heat builds slower (takes longer to overheat)
                // If using Rapid card, speedFactor will be > 1, so heat builds faster
                tower.spinupTime += dt * speedFactor;

                const maxSpinupSeconds = spinupEffect.maxSpinupSeconds || 5;
                tower.maxHeat = maxSpinupSeconds; // Sync for visual bar

                // Check if tower has Ice card (for overheat extension)
                const hasIceCard = tower.cards.some(c => c.type.id === 'ice');
                const overheatExtension = hasIceCard ? (spinupEffect.overheatExtensionWithIce || 0) : 0;
                const overheatThreshold = maxSpinupSeconds + overheatExtension;

                if (tower.spinupTime >= overheatThreshold) {
                    tower.isOverheated = true;
                    tower.overheatCooldown = spinupEffect.overheatDuration || 1.5;
                    tower.totalOverheatDuration = tower.overheatCooldown; // Store for UI
                    tower.spinupTime = 0;
                }
            }

            // 2. Rotate Tower Smoothly
            const dx = target.x - tower.x;
            const dy = target.y - tower.y;
            const desiredAngle = Math.atan2(dy, dx);

            // Apply semi-smooth rotation
            tower.angle = this.rotateTowards(tower.angle, desiredAngle, CONFIG.TOWER.TURN_SPEED * dt);

            // 3. Fire only if aimed close enough
            const angleDiff = Math.abs(this.getShortestAngleDifference(tower.angle, desiredAngle));

            if (tower.cooldown <= 0 && angleDiff < CONFIG.TOWER.AIM_TOLERANCE) {
                this.fire(tower, target, stats, projectileSystem, effects);
                tower.cooldown = stats.cd;
            }
        } else {
            // === SPINUP RESET / COOLING ===
            // No target - Start cooling down
            if (tower.spinupTime > 0) {
                // Cool down rate: 
                // User wants 1.5 seconds to cool down from max heat
                // Rate = MaxHeat / 1.5
                const coolRate = (tower.maxHeat / 1.5) * dt;
                tower.spinupTime = Math.max(0, tower.spinupTime - coolRate);
            }
            if (tower.isOverheated) {
                // If we lost target but are overheated, we still cool down the overheat timer?
                // The overheat timer is handled at the top of processTower logic.
                // We don't need to force clear it here, let it run its course.
            }
        }
    }

    private findTarget(tower: Tower, enemies: Enemy[], range: number): Enemy | null {
        // Filter enemies within range
        const inRange = enemies.filter(e => {
            if (!e.isAlive()) return false;
            const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
            return dist <= range;
        });

        if (inRange.length === 0) return null;

        // PRIORITY CHECK: Filter for highest priority enemies (like Magma Statues)
        // If there are enemies with priority > 0, we IGNORE all others and only target them.
        let maxPriority = 0;
        for (const e of inRange) {
            if (e.threatPriority > maxPriority) maxPriority = e.threatPriority;
        }

        // If high priority enemies exist, reduce the pool to ONLY them
        // This ensures the tower is "taunted" by the decoy
        const targetPool = maxPriority > 0
            ? inRange.filter(e => e.threatPriority === maxPriority)
            : inRange;

        // Apply targeting strategy based on tower's mode
        switch (tower.targetingMode) {
            case 'first':
                // Enemy closest to end of path (highest pathIndex)
                return targetPool.reduce((a, b) => a.pathIndex > b.pathIndex ? a : b);

            case 'closest':
                // Enemy nearest to tower
                return targetPool.reduce((a, b) => {
                    const distA = Math.hypot(a.x - tower.x, a.y - tower.y);
                    const distB = Math.hypot(b.x - tower.x, b.y - tower.y);
                    return distA < distB ? a : b;
                });

            case 'strongest':
                // Enemy with highest max health
                return targetPool.reduce((a, b) => a.maxHealth > b.maxHealth ? a : b);

            case 'weakest':
                // Enemy with lowest current health
                return targetPool.reduce((a, b) => a.currentHealth < b.currentHealth ? a : b);

            case 'last':
                // Enemy furthest from end (lowest pathIndex)
                return targetPool.reduce((a, b) => a.pathIndex < b.pathIndex ? a : b);

            default:
                // Default to first available
                return targetPool[0];
        }
    }

    private rotateTowards(current: number, target: number, maxStep: number): number {
        const diff = this.getShortestAngleDifference(current, target);

        if (Math.abs(diff) <= maxStep) {
            return target;
        }

        return current + Math.sign(diff) * maxStep;
    }

    /**
     * Returns the shortest difference between two angles in radians (-PI to PI)
     */
    private getShortestAngleDifference(current: number, target: number): number {
        let diff = target - current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }

    private fire(tower: Tower, target: { x: number, y: number }, stats: any, projectileSystem: ProjectileSystem, effects?: EffectSystem) {
        // Muzzle Math
        const barrelLen = CONFIG.TOWER.BARREL_LENGTH;
        const muzzleX = tower.x + Math.cos(tower.angle) * barrelLen;
        const muzzleY = tower.y + Math.sin(tower.angle) * barrelLen;

        // === MUZZLE FLASH EFFECT ===
        if (effects) {
            effects.add({
                type: 'muzzle_flash',
                x: muzzleX,
                y: muzzleY,
                radius: 15,
                life: 0.08,
            });

            // === SHELL CASING EFFECT ===
            // Eject shell perpendicular to fire angle
            const ejectAngle = tower.angle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
            const ejectSpeed = (2 + Math.random() * 2) * 60; // Convert to px/sec
            effects.add({
                type: 'debris',
                x: tower.x, // Eject from tower center/breech
                y: tower.y,
                vx: Math.cos(ejectAngle) * ejectSpeed,
                vy: Math.sin(ejectAngle) * ejectSpeed,
                gravity: 720, // 12 * 60 (Acceleration: px/sec^2)
                rotation: Math.random() * Math.PI,
                vRot: (Math.random() - 0.5) * 30, // 0.5 * 60 (rad/sec)
                life: 1.0, // 60 frames -> 1.0 second
                color: '#ffd700', // Gold shell
                size: 3,
            });
        }

        // Multishot logic
        if (stats.projCount > 1) {
            const startAngle = tower.angle - (stats.spread * (stats.projCount - 1)) / 2;

            for (let i = 0; i < stats.projCount; i++) {
                const currentAngle = startAngle + i * stats.spread;

                // For 'shotgun' spread, we might want the projectile to originate from the same muzzle point
                // but travel in different directions.
                // Or we can slightly offset the origin if it's a wide bank of guns.
                // Let's keep origin same, vary velocity vector implies target varies OR we just calculate velocity manually in Projectile.
                // Currently Projectile.init calculates angle to target. 
                // We need to override this or create a virtual target for the spread shots.

                // Calculate a virtual target point in the direction of fire
                const range = 500; // Arbitrary far distance
                const vx = Math.cos(currentAngle) * range;
                const vy = Math.sin(currentAngle) * range;
                const virtualTarget = { x: muzzleX + vx, y: muzzleY + vy };

                const finalDamage = Math.max(1, stats.damage * (stats.damageMultiplier || 1));
                projectileSystem.spawn(muzzleX, muzzleY, virtualTarget, { ...stats, damage: finalDamage });
            }
        } else {
            // Single shot
            const finalDamage = Math.max(1, stats.damage * (stats.damageMultiplier || 1));
            const p = projectileSystem.spawn(muzzleX, muzzleY, target, { ...stats, damage: finalDamage });

            // Trigger recoil for critical hits
            if (p.isCrit) {
                tower.recoilTimer = 0.2; // 0.2s duration (was 10 frames)
                tower.recoilIntensity = 3;
            }
        }

        // Minigun vibration (constant while firing)
        if (stats.projectileType === 'minigun') {
            tower.recoilTimer = 0.1; // 0.1s duration (was 5 frames)
            // tower.recoilIntensity = 0.5; // OLD: Caused constant shaking
            // Only purely visual recoil for the tower itself, do not trigger screen shake here if possible
            // But if recoilFrames is used for screen shake, we need to be careful.
            // GameScene uses gameState.shakeTimer for screen shake. 
            // Tower.recoilFrames usually just shakes the tower sprite.
            // Let's verify Tower.ts usage of recoil.
        }

        // Play Sound
        const isSniper = stats.projectileType === 'sniper';
        const soundKey = isSniper ? 'shoot_sniper' : 'shoot_basic';
        const priority = isSniper ? SoundPriority.HIGH : SoundPriority.LOW;

        SoundManager.play(soundKey, priority);
    }
}
