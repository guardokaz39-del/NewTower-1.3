# Phase 4: Waves, Pathfinding, and Performance Architecture

This document details the architectural changes introduced in Phase 4 (v1.4 Alpha).  
**Goal:** Achieve deterministic gameplay, type-safe wave configuration, and engine-grade zero-allocation pathfinding.

---

## 4.A - Determinism & RNG

We replaced `Math.random()` with a seeded PRNG (`Mulberry32`) to ensure that replaying the same level with the same inputs yields identical results.

### Key Components

- **`Mulberry32`**: A fast, seeded 32-bit PRNG.
- **`GameSession`**: Initialization requires a seed.
- **`WaveManager`**: Enemy spawning intervals and "random" enemy selection (e.g., variant choice) now use the session's RNG instance.

### Contract

1. **No `Math.random()` in Logical Update Loop**: Visuals (particles, screen shake) can use it, but game logic (damage rolls, spawn positions, path choice) MUST use `RNG`.
2. **Fixed Iteration Order**: Loops over enemies/towers must be stable (avoid `Set` iteration if order matters; use Arrays with indices).

---

## 4.B - Wave Configuration

We migrated from loose JSON objects to strict TypeScript interfaces for Wave Definitions.

### Types (`WaveConfig.ts`)

- **`IWaveDef`**: The top-level definition for a wave.
- **`ISpawnGroup`**: Represents a cluster of enemies (e.g., "10 Goblins spaced 0.5s apart").
- **`wait`**: Logic to delay the next group (e.g., `waitForClear`, `time: 5.0`).

### Normalization

All legacy wave data is converted at runtime into the canonical `IWaveDef` format, preventing "undefined" errors during spawn logic.

---

## 4.C - Navigation & Path Contract

We separated map data (static) from pathfinding state (dynamic).

### Contracts

1. **FlowField is Canonical**: Entities move based on the `FlowField` vector, not a list of waypoints.
2. **Strict Waypoints**:
   - `ENDPOINTS` mode: The map file only provides Start and End. The game calculates the path on load.
   - `FULLPATH` mode: The map file provides exact waypoints (for artistic curves).
3. **Lazy Updates**: `FlowField` is only regenerated when `isFlowFieldDirty` is set (e.g., by placing a tower).

---

## 4.D - Engine-Grade Performance (Zero-Allocation)

To support 500+ enemies on low-end devices, we eliminated all memory allocations from the hot path (Pathfinding & Movement).

### 1. FlowField Optimization

Instead of creating `new Queue()`, `new Set()`, or `new Node()` every frame, we use **static shared buffers**:

- **`Int32Array` (Queue)**: Pre-allocated buffer for BFS queue.
- **`Uint16Array` (Visited)**: Uses a `searchId` (incremented per search) to avoid `fill(0)` or `clear()` costs. Reset is O(1).
- **`Int32Array` (Distances)**: Stores path metadata cheaply.

**Impact**: `FlowField.generate` is now allocation-free after initial load.

### 2. "Maze Forbidden" Rule

To simplify path validation complexity:

- **Rule**: Players CANNOT build on tiles marked as `type === 1` (Path).
- **Optimization**: `isBuildable` and `checkBuildability` are now O(1) checks in most cases. Blockage checks are only needed if we allow "mazing" (building on grass to divert enemies). Currently, we enforce strict paths.

### 3. Usage & Safety

- **Access**: Systems must access `FlowField` data via helper methods (e.g., `getVector`, `getPreciseFlowDistance`) or use calculated 1D indices (`y * cols + x`).
- **Direct Access Forbidden**: Do not access `flowField.distances[y][x]` (it is a flat array now).

---

## Future Steps (Phase 4.E)

- **Editor UI**: Visualization of the `FlowField` and Validation Errors (broken paths).
- **Validation**: Enforce `WaypointsMode` when saving maps in the Editor.
