import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tower } from '../src/Tower';
import { Enemy } from '../src/Enemy';
import { Projectile } from '../src/Projectile';
import { CollisionSystem } from '../src/CollisionSystem';
import { ProjectileSystem } from '../src/systems/ProjectileSystem';
import { TargetingSystem } from '../src/systems/TargetingSystem';
import { WeaponSystem } from '../src/WeaponSystem';
import { FlowField } from '../src/FlowField';
import { EventBus, Events } from '../src/EventBus';
import { ICard } from '../src/CardSystem';
import { SoundManager } from '../src/SoundManager';

// --- Mocks ---
const mockEffectSystem = {
    add: vi.fn(),
    spawn: vi.fn(),
} as any;

describe('Combat Integration Pipeline (P2)', () => {
    let colSys: CollisionSystem;
    let projSys: ProjectileSystem;
    let flowField: FlowField;
    let tower: Tower;
    let enemy: Enemy;

    // Trackers
    let enemiesDiedCount = 0;

    beforeEach(() => {
        // Ensure valid window dimensions for SpatialGrid calculation in jsdom
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });

        // Reset state
        EventBus.getInstance().clear();
        enemiesDiedCount = 0;

        // Subscribe to events
        EventBus.getInstance().on(Events.ENEMY_DIED, () => {
            enemiesDiedCount++;
        });

        colSys = new CollisionSystem(mockEffectSystem);
        projSys = new ProjectileSystem();
        flowField = new FlowField(10, 10);

        // Setup Tower
        // Tower constructor takes (col, row), so we initialize at (0,0) and override x/y for testing
        tower = new Tower(0, 0);
        tower.x = 100;
        tower.y = 100;
        tower.targetingMode = 'closest';
        tower.slots[0].card = {
            id: 'c1',
            level: 1,
            isDragging: false,
            type: {
                id: 'minigun',
                modifiers: { damage: 10, fireRate: 10, range: 200 } // Super fast!
            }
        } as unknown as ICard;
        tower.invalidateCache(); // Forces calculation of range/stats based on cards

        // Setup Enemy nearby
        enemy = new Enemy();
        enemy.init({ health: 10, speed: 0, path: [] } as any); // 1-shot kill, no movement
        enemy.x = 100;
        enemy.y = 150; // Distance 50 (within range)
        enemy.currentHealth = 10;
    });

    it('should successfully simulate the full Game Loop (Aim -> Shoot -> Hit -> Die)', () => {
        const weaponSys = new WeaponSystem();
        const towers = [tower];
        const enemies = [enemy];
        const dt = 1 / 60; // 60 FPS simulation
        const SIMULATION_SECONDS = 3.0; // 3 seconds
        const ticks = Math.ceil(SIMULATION_SECONDS / dt);

        vi.spyOn(SoundManager, 'play').mockImplementation(() => { });

        // Initial sanity check
        expect(enemy.currentHealth).toBe(10);
        expect(projSys.projectiles.length).toBe(0);

        // Tick loop (Simulating GameController.update logic)
        for (let i = 0; i < ticks; i++) {
            // 1. Grid Preparation
            const grid = colSys.getValidGrid(enemies);

            // 2. Tower Targeting & Aiming
            tower.target = TargetingSystem.findTarget(tower, grid, flowField);
            tower.update(dt, grid, flowField);

            // 3. Weapon System (Shooting)
            weaponSys.update(towers, enemies, projSys, dt, mockEffectSystem);

            // 4. Projectile Movement
            projSys.update(dt, mockEffectSystem);

            // 5. Collision Detection
            colSys.update(projSys.projectiles, enemies);

            // 6. Cleanup dead
            for (let e = enemies.length - 1; e >= 0; e--) {
                if (!enemies[e].isAlive()) {
                    enemies.splice(e, 1);
                }
            }

            // Early exit if dead
            if (enemies.length === 0) break;
        }

        // --- VERIFICATION ---

        // Enemy should be dead
        expect(enemies.length).toBe(0);
        expect(enemy.isAlive()).toBe(false);

        // EventBus should have dispatched EXACTLY one death event
        expect(enemiesDiedCount).toBe(1);
    });
});
