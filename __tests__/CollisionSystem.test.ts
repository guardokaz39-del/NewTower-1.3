import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollisionSystem } from '../src/CollisionSystem';
import { ProjectileSystem } from '../src/systems/ProjectileSystem';
import { Enemy } from '../src/Enemy';
import { Projectile } from '../src/Projectile';

describe('CollisionSystem Public API', () => {
    let colSys: CollisionSystem;
    let projSys: ProjectileSystem;

    beforeEach(() => {
        projSys = new ProjectileSystem();
        const effectSysMock = { add: vi.fn(), spawn: vi.fn() } as any;

        colSys = new CollisionSystem(effectSysMock);
    });

    it('should correctly apply splash damage only to enemies within radius', () => {
        const center = new Enemy(); center.init({ health: 100, speed: 50, path: [] } as any); center.x = 100; center.y = 100;
        const near = new Enemy(); near.init({ health: 100, speed: 50, path: [] } as any); near.x = 100; near.y = 120; // Distance 20
        const far = new Enemy(); far.init({ health: 100, speed: 50, path: [] } as any); far.x = 100; far.y = 200; // Distance 100

        const enemies = [center, near, far];
        colSys.getValidGrid(enemies);

        const proj = new Projectile();
        proj.init(100, 100, { x: 100, y: 100 }, {
            dmg: 50,
            speed: 50,
            color: '#f00',
            pierce: 0,
            effects: [{ type: 'splash', radius: 30, power: 1.0 }]
        });

        // This is necessary because the CollisionSystem uses the hitList mechanism when piercing, 
        // but the core update loop handles normal hits by deactivating the projectile. 
        // We simulate a single frame update.
        colSys.update([proj], enemies);

        // Center hit directly (100 - 50 = 50)
        expect(center.currentHealth).toBe(50);

        // Near hit by splash (100 - (50 * 0.7) = 65)
        expect(near.currentHealth).toBe(65);

        // Far untouched (outside 30 radius)
        expect(far.currentHealth).toBe(100);
    });

    it('should prevent double-hits on the same enemy in a single tick', () => {
        const enemy = new Enemy(); enemy.init({ health: 100, speed: 50, path: [] } as any); enemy.x = 100; enemy.y = 100;

        colSys.getValidGrid([enemy]);

        const proj = new Projectile();
        proj.init(100, 100, { x: 100, y: 100 }, {
            dmg: 10,
            speed: 50,
            color: '#f00',
            pierce: 5, // High pierce allows hitting multiple targets, but not the SAME target twice
            effects: []
        });

        // First tick
        colSys.update([proj], [enemy]);
        expect(enemy.currentHealth).toBe(90);
        expect(proj.hitList).toContain(enemy.id);

        // Second tick (projectile still alive, enemy still overlapping)
        colSys.update([proj], [enemy]);
        // Health should REMAIN 90, hitList prevents second hit
        expect(enemy.currentHealth).toBe(90);
    });

    it('should safely process explosive chain reactions without crashing via recursive calls', () => {
        const enemies = [new Enemy(), new Enemy(), new Enemy()];

        enemies.forEach((e, i) => {
            e.init({ health: 100, speed: 50, path: [] } as any);
            e.x = 100 + (10 * i);
            e.y = 100 + (10 * i);
            e.currentHealth = 50; // Low health to ensure death
        });

        colSys.getValidGrid(enemies);

        const explosiveProj = new Projectile();
        explosiveProj.init(100, 100, { x: 100, y: 100 }, {
            dmg: 100,
            speed: 50,
            color: '#f00',
            pierce: 1,
            effects: []
        });
        explosiveProj.explodeOnDeath = true;
        explosiveProj.explosionRadius = 50;
        explosiveProj.explosionDamage = 100;

        expect(() => {
            // Testing via public update API instead of private handleHit
            colSys.update([explosiveProj], enemies);
        }).not.toThrow();

        // The first enemy dies due to the 100 dmg hit, triggering an explosion
        // The explosion (radius 50) hits the other two enemies (at dist 14 and 28)
        // Since they have 50 health, they also die.
        // The test explicitly verifies that taking them out of the aoeBuffer during iteration doesn't crash the loop.
        expect(enemies[0].isAlive()).toBe(false);
        expect(enemies[1].isAlive()).toBe(false);
        expect(enemies[2].isAlive()).toBe(false);
    });
});
