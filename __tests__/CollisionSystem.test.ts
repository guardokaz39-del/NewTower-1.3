import { CollisionSystem } from '../src/CollisionSystem';
import { ProjectileSystem } from '../src/systems/ProjectileSystem';
import { Enemy } from '../src/Enemy';
import { Projectile } from '../src/Projectile';

describe('CollisionSystem Splash Safety', () => {
    let colSys: CollisionSystem;
    let projSys: ProjectileSystem;

    beforeEach(() => {
        projSys = new ProjectileSystem();
        const effectSysMock = { add: jest.fn(), spawn: jest.fn() } as any;

        // Mock window for spatial grid initialization
        if (typeof window === 'undefined') {
            (global as any).window = { innerWidth: 1920, innerHeight: 1080 };
        }

        colSys = new CollisionSystem(effectSysMock);
    });

    it('should safely process explosive chain reactions without crashing via recursive calls', () => {
        const enemies = [new Enemy(), new Enemy(), new Enemy()];

        enemies.forEach((e, i) => {
            e.init({ health: 100, speed: 50, path: [] } as any);
            e.x = 10 * i;
            e.y = 10 * i;
            e.currentHealth = 50;
            e.maxHealth = 100;
        });

        colSys.prepareGrid(enemies);

        const explosiveProj = new Projectile();
        explosiveProj.init(10, 10, { x: 10, y: 10 }, {
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
            colSys['handleHit'](explosiveProj, enemies[0], enemies);
        }).not.toThrow();

        expect(enemies[0].isAlive()).toBe(false);
    });
});
