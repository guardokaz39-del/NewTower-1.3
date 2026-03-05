---
description: Architecture overview — key files, systems, data flow, and responsibilities in NewTower 1.4
---

# NewTower 1.4 — Architecture Overview

## System Stack

```
┌─────────────────────────────────────────────┐
│              Game.ts (Entry Point)           │
│  canvas, ctx, loop(dt), resize, scene mgmt  │
└─────────────┬───────────────────────────────┘
              │ safeDt (clamped 1/30)
              ▼
┌─────────────────────────────────────────────┐
│            GameScene.ts (Orchestrator)       │
│  update(dt) → loops × systems               │
│  draw(ctx) → layer-ordered rendering        │
│  Event wiring (death, split, spawn)         │
└──┬──────┬──────┬──────┬──────┬──────┬───────┘
   │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼
┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
│Entity││Wave  ││Weapon││Collis││Effect││   UI │
│Mgr   ││Mgr   ││Sys   ││Sys   ││Sys   ││  Mgr │
└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘
```

## Key Files & Responsibilities

### Core Loop

| File | Lines | Role |
|:---|:---|:---|
| `Game.ts` | ~220 | Entry point. Canvas setup, DPR, dt clamp, scene switching |
| `GameScene.ts` | ~810 | Main orchestrator. Wires all systems, update/draw order, event listeners |
| `GameSession.ts` | ~140 | Groups logic systems (state, entities, waves, collision, etc.) |
| `GameState.ts` | ~100 | Shared mutable state: money, lives, towers[], enemies[], paused |

### Domain (Simulation)

| File | Lines | Role |
|:---|:---|:---|
| `Enemy.ts` | ~470 | Enemy entity. HP, move, status effects (slow/burn/shield), death |
| `Tower.ts` | ~540 | Tower entity. Cards/slots, stat computation, targeting, angle tracking |
| `Projectile.ts` | ~130 | Projectile entity. Movement, homing, pierce, AoE config |

### Systems

| File | Lines | Role |
|:---|:---|:---|
| `EntityManager.ts` | ~260 | Spawn/death lifecycle. Swap-and-pop removal, sub-step movement |
| `WaveManager.ts` | ~320 | Wave config, spawn queue, deterministic RNG-based delays |
| `WeaponSystem.ts` | ~290 | Tower firing logic. Cooldowns, projectile creation |
| `CollisionSystem.ts` | ~410 | Projectile-enemy collision. SpatialGrid, deferred explosions |
| `TargetingSystem.ts` | ~120 | Target selection (first/last/closest/strongest/healthiest) |
| `SpatialGrid.ts` | ~180 | Spatial hash for O(1) radius queries |

### Rendering

| File | Lines | Role |
|:---|:---|:---|
| `EffectSystem.ts` | ~620 | VFX: explosions, text, particles, debris. Object pool + priority budgets |
| `renderers/EnemyRenderer.ts` | ~40 | Delegates to unit-specific renderers |
| `renderers/units/*.ts` | ~100ea | Per-type enemy drawing (Orc, Goblin, Troll, Skeleton, Flesh, Cached) |
| `renderers/TowerRenderer.ts` | ~200 | Tower sprite + barrel rotation + build animation |
| `RendererFactory.ts` | ~50 | Factory for renderer creation/dispatch |
| `ObjectRenderer.ts` | ~470 | Procedural sprite baking (ink-style) |

### Caching

| File | Lines | Role |
|:---|:---|:---|
| `utils/AssetCache.ts` | ~72 | Static sprite cache. Hard limit 4096, toLowerCase keys, full clear on overflow |
| `utils/SpriteBaker.ts` | varies | Procedural generation of unit sprites |

### Map & Environment

| File | Lines | Role |
|:---|:---|:---|
| `Map.ts` | ~530 | Tile grid, FlowField, waypoints, torches, buildable checks |
| `FlowField.ts` | ~280 | BFS-based vector field for enemy pathing |
| `FogSystem.ts` | ~110 | Fog of war overlay |
| `systems/LightingSystem.ts` | ~200 | Light sources + ambient overlay |
| `DayNightCycle.ts` | ~60 | Sine-wave day/night cycle |
| `systems/AtmosphereSystem.ts` | ~150 | Weather particles (rain, leaves, etc.) |

---

## Update Order (per frame)

```
GameScene.update(dt):
  for loops (1x or 2x speed):
    1. DayNight, Atmosphere, Map, WaveManager, Fog
    2. EntityManager.updateEnemies(dt, flowField)
       - Sub-step move (1/60s chunks)
       - update(dt) for timers
       - Swap-and-pop dead/finished
    3. AcidSystem, CommanderSystem
    4. CollisionSystem.invalidateGrid()
    5. Tower.update() — targeting + tracking
    6. WeaponSystem.update() — firing
    7. ProjectileSystem.update()
    8. CollisionSystem.update() — hit detection
    9. EffectSystem.update()
```

## Draw Order (per frame)

```
GameScene.draw(ctx):
  ctx.save()
  1. Screen shake transform
  2. Clear canvas
  3. Map tiles + torches
  4. Acid puddles, Commander auras
  5. Path preview, hover highlight
  6. Towers (sprites + UI)
  7. Enemies (with view culling)
  8. Projectiles
  9. Effects (VFX layer)
  10. Fog overlay
  11. Lighting overlay
  12. Emissive pass (enemy eyes)
  13. Atmosphere (weather)
  ctx.restore()
```

---

## Event Flow

### Enemy Death Pipeline

```
Enemy.takeDamage() → currentHealth ≤ 0
  → Enemy.kill() → Enemy.die()
    → EventBus.emit(ENEMY_DIED, { enemy })
    → EventBus.emit(ENEMY_DEATH_SPAWN, { enemy, spawns }) [if has deathSpawns]
      
EntityManager.updateEnemies():
  → detects !isAlive()
  → handleEnemyDeath() — reward, death animation, effects
  → pool.free(enemy) — returns to object pool
  
GameScene event listeners:
  → ENEMY_DIED: check sapper_rat → triggerExplosion (with depth guard)
  → ENEMY_SPLIT: magma_king → spawn decoy
  → ENEMY_DEATH_SPAWN: flesh_colossus → spawn children
```

---

## Key Design Decisions

1. **Variable dt (not fixed timestep)** — we use `Math.min(dt, 1/30)` clamp + sub-stepping for `move()` instead of a full accumulator. This avoids refactoring all 15+ systems.

2. **hitFlashTimer remains in Enemy.ts** — it's 1 line of code, purely visual, read-only by renderers. Moving it to a separate system would add complexity without benefit.

3. **Swap-and-pop only for enemies** — tower draw order matters (z-index), so towers still use indexOf+splice (rare operation, not hot-path).

4. **No LRU cache** — LRU in JS is expensive. AssetCache uses hard limit + full clear instead.

5. **Deferred explosions via CollisionSystem** — `queueExplosion()` adds to queue, `processExplosions()` runs after the collision pass to avoid modifying arrays during iteration.
