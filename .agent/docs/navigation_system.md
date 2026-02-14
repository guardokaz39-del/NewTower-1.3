# Navigation & Pathfinding System

This document details the **Engine-Grade Navigation System** introduced in v1.4. It is designed to support 500+ units with zero per-frame memory allocations.

---

## 1. Zero-Allocation Architecture

To achieve high performance on low-end devices, the core pathfinding modules (`FlowField` and `Pathfinder`) use **Shared Static Typed Arrays** instead of allocating objects per search.

### Data Structures

Instead of `class Node { x, y, parent, visited }`, we use flat arrays indexed by `y * cols + x`:

| Buffer | Type | Description |
|--------|------|-------------|
| **`queue`** | `Int32Array` | Circular buffer for BFS. Stores packed integers `index`. |
| **`visited`** | `Uint16Array` | Stores `searchId`. If `visited[i] == searchId`, node is visited. |
| **`distances`** | `Int32Array` | Stores distance from target (cost). |
| **`vectors`** | `Int8Array` | Stores flow vectors. Interleaved `[vx, vy, vx, vy...]`. |

### The `searchId` Optimization

To avoid `O(N)` clearing of the `visited` array (which takes ~0.5ms for large maps), we use a rolling generation ID.

```typescript
// Start of Search
this.searchId++; 

// Node check
if (this.visited[neighborIdx] !== this.searchId) {
    this.visited[neighborIdx] = this.searchId; // Mark as visited for THIS search
    // ...
}
```

*When `searchId` overflows `65535` (max Uint16), we reset it to `1` and `fill(0)` the array once.*

---

## 2. FlowField (Swarm Movement)

Entities do not calculate individual paths. Instead, the `FlowField` is generated **once** for the entire map, and all entities simply query the vector at their position.

### Generation

1. **Target**: Usually the Base (End Point).
2. **Algorithm**: BFS Integration Field.
3. **Lazy Update**: The field is **only** regenerated when `MapManager.isFlowFieldDirty` is true (e.g., after building a tower).

### Usage (Access Pattern)

**❌ INCORRECT (Legacy):**

```typescript
const dist = flowField.distances[y][x]; // Runtime Error: It's a 1D array now!
const vec = flowField.vectors[y][x];    // Runtime Error
```

**✅ CORRECT:**

```typescript
// 1. Get Vector (Zero-Alloc helper)
flowField.getVector(x, y, outVector);

// 2. Get Distance Helper
// Uses sub-tile precision to prevent stuttering
TargetingSystem.getPreciseFlowDistance(enemy, flowField);
```

---

## 3. Pathfinding (Individual)

Used for:

- Validating if a path exists (`checkBuildability`).
- Calculating the initial path for the map loading process.

It shares the same **Zero-Allocation** principles but uses a separate static buffer set in `Pathfinder.ts`.

### Determinism

The order of neighbor processing is fixed: `[Up, Right, Down, Left]`. This guarantees that `findPath(A, B)` always returns the exact same array of coordinates for the same grid state, which is critical for the new `Mulberry32` deterministic simulation.

---

## 4. Contracts & Rules

### "Maze Forbidden" Rule

**Rule**: Towers CANNOT be placed on tiles marked as **Path (`type === 1`)**.

**Purpose**:

1. **Game Design**: Prevents "cheesing" by blocking the intended enemy route.
2. **Performance**: Makes `checkBuildability` an **O(1)** operation for 90% of cases (if `type === 1`, return `false`). We only run BFS if the map supports "mazing" on grass (currently disabled/strict).

### Waypoints Contract

- **`ENDPOINTS` Mode**: Map file only stores Start and End. The game calculates the path at load time.
- **`FULLPATH` Mode**: Map file stores exact waypoints. Used for artistic/curved paths.
