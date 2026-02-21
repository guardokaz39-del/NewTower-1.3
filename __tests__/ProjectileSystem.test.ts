import { ProjectileSystem } from '../src/systems/ProjectileSystem';
import { Projectile } from '../src/Projectile';

describe('ProjectileSystem Mechanics', () => {
    let sys: ProjectileSystem;

    beforeEach(() => {
        // Mock global canvas API
        (global as any).document = { createElement: () => ({ getContext: () => ({}) }) };
        sys = new ProjectileSystem();
    });

    it('should correctly remove a projectile using swap and pop without losing array integrity', () => {
        const target = { x: 0, y: 0 };
        // Spawn 3 projectiles
        const p1 = sys.spawn(10, 10, target, { dmg: 10, speed: 10, color: 'red', effects: [], pierce: 1, projectileType: 'test' });
        const p2 = sys.spawn(20, 20, target, { dmg: 10, speed: 10, color: 'blue', effects: [], pierce: 1, projectileType: 'test' }); // Middle
        const p3 = sys.spawn(30, 30, target, { dmg: 10, speed: 10, color: 'green', effects: [], pierce: 1, projectileType: 'test' });

        expect(sys.projectiles.length).toBe(3);

        // Manually kill the middle projectile
        p2.alive = false;

        // Update system to trigger remove
        sys.update(0.1, { add: jest.fn() } as any);

        // Expect length to drop to 2
        expect(sys.projectiles.length).toBe(2);

        // Expect p3 to have swapped into p2's index
        // Since update loop iterates forward, when it hits i=1 (p2), it removes it and swaps p3 into its place, then decrements i.
        // It then processes i=1 again (which is now p3).
        expect(sys.projectiles).toContain(p1);
        expect(sys.projectiles).toContain(p3);
        expect(sys.projectiles).not.toContain(p2);
    });
});
