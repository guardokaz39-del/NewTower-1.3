# Wave System & Determinism

This document details the Deterministic Wave System introduced in v1.4.

---

## 1. Deterministic Simulation

To ensure that leaderboards and replays (future feature) are valid, the game simulation must be **Deterministic**. Replaying the same level with the same `seed` must result in the exact same outcome.

### Mulberry32 (PRNG)

We replaced the native `Math.random()` with a custom **Mulberry32** implementation.

- **Fast**: 32-bit integer math.
- **Seeded**: Initialized with a session seed.
- **Scope**: Used for **Simulation Logic Only**.
  - Enemy Spawning variants
  - Damage Rolls (Crit chance)
  - Drop Logic
  - Tower targeting arbitration

*Note: Visual effects (particles, screen shake) may still use `Math.random()` as they do not affect game state.*

### Implementation Usage

```typescript
// ❌ BAD
if (Math.random() < 0.5) spawnOrc();

// ✅ GOOD
if (GameSession.rng.nextFloat() < 0.5) spawnOrc();
```

---

## 2. Wave Configuration (`WaveConfig.ts`)

Wave definitions have been migrated from "Loose JSON" to "Strict Typed Interfaces".

### `IWaveDef` Structure

```typescript
interface IWaveDef {
    groups: ISpawnGroup[]; // Sequence of spawn clusters
    message?: string;      // "Boss Wave!" warning
}

interface ISpawnGroup {
    type: string;          // Enemy ID ('GRUNT', 'BOSS', etc)
    count: number;         // How many
    interval: number;      // Seconds between spawns
    wait?: IWaitCondition; // When to proceed to next group
}
```

### Normalization

The `WaveManager` automatically converts legacy or shorthand wave configs into this canonical format at runtime (`normalizeWaveConfig`). This prevents `undefined` errors during the heat of gameplay.

### Pattern Types

1. **`waitForClear`**: The next group will NOT start until all currently alive enemies are dead. Used for Boss waves.
2. **`time`**: Fixed delay after spawning the group.
3. **`overlap`**: Allows waves to bleed into each other (advanced mapping).

---

## 3. Threat Modeling

The system calculates a "Threat Score" for each active enemy to prioritize targeting.

- **Base Priority**: `distToEnd`.
- **Taunt Priority**: Special enemies (e.g., `MAGMA_STATUE`) have `threatPriority = 999`.
- **Targeting Modes**:
  - `FIRST` / `LAST` (Distance based)
  - `STRONGEST` (HP based)
  - `CLOSEST` (Proximity based)

This logic is centralized in `TargetingSystem.ts` and uses the `FlowField` for precise distance calculations.
