# Editor System Documentation

This document describes the architecture and safety mechanisms of the Map Editor in NewTower 1.4.

## Core Components

| Component | File | Responsibilities |
|-----------|------|------------------|
| **EditorScene** | `scenes/EditorScene.ts` | Main controller. Handles input, tools, rendering, and UI orchestration. |
| **MapManager** | `Map.ts` | Manages grid state, tiles, objects, and pathfinding logic. |
| **EditorHistory** | `editor/EditorHistory.ts` | Manages Undo/Redo stack with support for compound actions. |
| **MapData** | `MapData.ts` | Defines data schemas (`IMapData`, `IWaveConfig`) and migration logic. |
| **WaveEditor** | `WaveEditor.ts` | UI overlay for configuring enemy waves. |

---

## 🏗️ Data Architecture

### Map Data Schema (`IMapData`)

The game uses a strictly typed schema for map data. Key fields include:

- `schemaVersion`: Tracks data format version (Current: `1`).
- `waypointsMode`: Defines path logic (`'FULLPATH'` vs `'ENDPOINTS'`).
- `waves`: Array of `IWaveConfig` (strict type).
- `tiles`: 2D array of tile IDs.
- `objects`: Array of static objects (trees, rocks).

### Versioning & Migration

Backward compatibility is handled by `migrateMapData` in `MapData.ts`.

- **Legacy Maps:** Automatically detected.
- **Manual Paths:** Old `manualPath` boolean is migrated to `waypointsMode = 'FULLPATH'`.
- **Validation:** Ensures critical fields (tiles, width/height) exist before loading.

---

## 🛡️ Safety Mechanisms

### 1. Lifecycle Management

The Editor prevents memory leaks and DOM pollution through strict cleanup in `EditorScene.onExitImpl()`:

- **UI Cleanup:** Destroys Toolbar, WaveEditor overlay, and Maps panel.
- **History:** Clears Undo/Redo stack.
- **Listeners:** Removes global event listeners.

### 2. Validation Gate

The `saveMap` function enforces validity **before** writing to storage:

- **Path Resolution:** `resolveFullPath()` converts sparse waypoints (Start → WPs → End) into a dense tile-by-tile BFS path via `Pathfinder.findPath()` for each segment.
- **Path Connectivity:** Checks if Start is connected to End.
- **Path Integrity:** Verifies no loops or unreachable signals (in `FULLPATH` mode).
- **Data Sync:** Synchronizes `WaypointManager` state to `MapManager` before validation.
- **User Alert:** Blocks save and alerts user if validation fails.

> [!CAUTION]
> `WaypointManager.getFullPath()` returns **разреженные** (sparse) waypoints — только поставленные вручную маркеры. Это НЕ тайл-за-тайлом путь. Если записать их напрямую в `map.waypoints` с режимом `'FULLPATH'`, `validatePath()` выдаст ошибки "disconnected" и "loop", потому что проверяет Manhattan distance ≤ 1 между соседними точками.
>
> Всегда пропускайте через `resolveFullPath()` перед валидацией и сохранением!

### 3. Wave Editor Safety

The `WaveEditor` runs as an overlay.

- **Reference Tracking:** `EditorScene` tracks the active instance.
- **Automatic Destruction:** If the scene exits while the editor is open, it is force-destroyed to prevent "ghost" UIs.

---

## ⏪ Undo/Redo System

The `EditorHistory` class supports **Compound Actions** to handle continuous input (like drag-painting).

### How it works

1. **Begin Compound:** Called on `mousedown`. key: (e.g., `'paint_road'`).
2. **Push Actions:** Individual tile changes are pushed via `pushInCompound()`.
3. **Commit:** Called on `mouseup`. Bundles all actions into a single `IEditorAction`.

### Supported Actions

- **Tile Paint:** Change tile type (Grass <-> Road).
- **Fog Paint:** Change fog density.
- **Object Placement:** Add/Remove objects.
- **Waypoints:** Add/Move/Remove waypoints.

---

## 💾 Serialization

Map saving is handled by `Utils.serializeMap()` and `EditorScene.saveMap()`.

- **Strict Typing:** `waves` are cast to `IWaveConfig[]` to prevent `any` pollution.
- **Explicit Modes:** `waypointsMode` is explicitly saved to ensure loaded maps behave consistently.
- **Default Waves:** New maps generate default waves if none exist.
