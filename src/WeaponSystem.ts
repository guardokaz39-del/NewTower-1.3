import { Tower } from './Tower';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { ObjectPool } from './Utils';
import { CONFIG } from './Config';
import { EffectSystem } from './EffectSystem';

export class WeaponSystem {

    public update(towers: Tower[], enemies: Enemy[], projectiles: Projectile[], pool: ObjectPool<Projectile>, effects?: EffectSystem) {
        towers.forEach(tower => {
            this.processTower(tower, enemies, projectiles, pool, effects);
        });
    }

    private processTower(tower: Tower, enemies: Enemy[], projectiles: Projectile[], pool: ObjectPool<Projectile>, effects?: EffectSystem) {
        if (tower.isBuilding) return;
        if (tower.cards.length === 0) return;

        if (tower.cooldown > 0) {
            tower.cooldown--;
        }

        const stats = tower.getStats();

        // 1. Find Target
        const target = this.findTarget(tower, enemies, stats.range);

        if (target) {
            // 2. Rotate Tower Smoothly
            const dx = target.x - tower.x;
            const dy = target.y - tower.y;
            const desiredAngle = Math.atan2(dy, dx);

            // Apply semi-smooth rotation
            tower.angle = this.rotateTowards(tower.angle, desiredAngle, CONFIG.TOWER.TURN_SPEED);

            // 3. Fire only if aimed close enough
            const angleDiff = Math.abs(this.getShortestAngleDifference(tower.angle, desiredAngle));

            if (tower.cooldown <= 0 && angleDiff < CONFIG.TOWER.AIM_TOLERANCE) {
                this.fire(tower, target, stats, projectiles, pool, effects);
                tower.cooldown = stats.cd;
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

        // Apply targeting strategy based on tower's mode
        switch (tower.targetingMode) {
            case 'first':
                // Enemy closest to end of path (highest pathIndex)
                return inRange.reduce((a, b) => a.pathIndex > b.pathIndex ? a : b);

            case 'closest':
                // Enemy nearest to tower
                return inRange.reduce((a, b) => {
                    const distA = Math.hypot(a.x - tower.x, a.y - tower.y);
                    const distB = Math.hypot(b.x - tower.x, b.y - tower.y);
                    return distA < distB ? a : b;
                });

            case 'strongest':
                // Enemy with highest max health
                return inRange.reduce((a, b) => a.maxHealth > b.maxHealth ? a : b);

            case 'weakest':
                // Enemy with lowest current health
                return inRange.reduce((a, b) => a.currentHealth < b.currentHealth ? a : b);

            case 'last':
                // Enemy furthest from end (lowest pathIndex)
                return inRange.reduce((a, b) => a.pathIndex < b.pathIndex ? a : b);

            default:
                // Default to first available
                return inRange[0];
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

    private fire(tower: Tower, target: { x: number, y: number }, stats: any, projectiles: Projectile[], pool: ObjectPool<Projectile>, effects?: EffectSystem) {
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
                life: 5,
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

                const p = pool.obtain();
                p.init(muzzleX, muzzleY, virtualTarget, stats);
                projectiles.push(p);
            }
        } else {
            // Single shot
            const p = pool.obtain();
            p.init(muzzleX, muzzleY, target, stats);
            projectiles.push(p);
        }
    }
}
