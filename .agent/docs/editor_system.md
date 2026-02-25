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
- **Keyboard Cleanup:** `WaveEditor` adds `keydown` listener for Ctrl+Z/Y/S — MUST be removed in `destroy()` via stored `boundKeyHandler` reference.

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

## 💾 Serialization & Map Storage

Map saving is handled by `Utils.serializeMap()` and `EditorScene.saveMap()`.

- **Strict Typing:** `waves` are cast to `IWaveConfig[]` to prevent `any` pollution.
- **Explicit Modes:** `waypointsMode` is explicitly saved to ensure loaded maps behave consistently.
- **Default Waves:** New maps generate default waves if none exist.
- **Size Check:** `MapStorage.saveLocal()` проверяет размер через `TextEncoder` — предупреждение при >4MB.

### 📦 Map Storage Architecture (MapStorage.ts)

Карты хранятся **гибридно** — два источника:

| Источник | Тип | Чтение | Запись |
|---|---|---|---|
| `public/maps/*.json` | Bundled (из проекта) | `fetch()` (async) | Вручную: положить JSON в папку |
| `localStorage` (`NEWTOWER_MAPS`) | Local (пользовательские) | Sync | `MapStorage.saveLocal()` |

**Collision Policy: Local Override.** Если имена совпадают — local побеждает, bundled скрывается. Удаление local → bundled «восстанавливается».

**Bundled миграция:** `getBundledMaps()` прогоняет каждую карту через `migrateMapData()` + `validateMap()`. Без этого при изменении `IMapData` в будущем bundled карты сломаются.

### Async UI: Local-First + Async Append

`refreshMapsPanel()` (EditorScene) и `refreshList()` (MenuScene) используют двухфазную отрисовку:

1. **Фаза 1 (sync):** Показать local карты мгновенно
2. **Фаза 2 (async):** Дописать bundled карты через `.then()`

Race condition guard: `_refreshGeneration` counter отбрасывает устаревшие промисы.

### Import / Export

- **Export:** `MapStorage.createExportBlob(data)` → `<a download>` в EditorScene
- **Import:** File input → `MapStorage.importFromFile()` → `migrateMapData()` → `validateMap()` → prompt имя → конфликт-check → save

### Vite Plugin (vite.config.ts)

`mapsIndexPlugin()` автогенерирует `public/maps/_index.json`:

- `buildStart`: сканирует `*.json` (исключая `_*.json`)
- `configureServer`: HMR watcher на add/unlink с debounce 300ms

---

## 🌊 Wave Editor v2 (Overhaul)

### Архитектура компонентов

```text
WaveEditor.ts (Host: overlay + toolbar + status bar)
├── WavePresetPanel.ts (Выбор, применение, сохранение и удаление пресетов)
├── WaveList.ts (Аккордеон волн + Bulk логика: удалить все/дублировать все)
│   ├── WaveSettingsPanel.ts (name, startDelay, waitForClear, shuffle, bonus)
│   │   └── SpawnTimingControl.ts (range + number input, синхронизованно)
│   ├── WaveTimeline.ts (Canvas визуализация)
│   ├── ThreatMeter.ts (Шкала угрозы)
│   └── EnemyGroupRow.ts (2 строки: тип/кол-во + таймиг)
│       └── SpawnTimingControl.ts × 2 (интервал + задержка)
├── ValidationPanel.ts (Отображение ошибок и предупреждений)
└── WaveEditorHistory.ts (Undo/Redo, JSON snapshots, max 30)
```

### Компоненты

| Компонент | Файл | Описание |
|-----------|------|----------|
| `WaveEditor` | `WaveEditor.ts` | Хост: оверлей, toolbar (undo/redo), status bar, Ctrl+Z/Y/S |
| `WavePresetPanel` | `components/WavePresetPanel.ts` | Выпадающий список пресетов (built-in и кастомные) и кнопки управления |
| `ValidationPanel` | `components/ValidationPanel.ts` | Панель вывода `validateExtended()` (ошибки блокируют сохранение) |
| `WaveList` | `components/WaveList.ts` | Аккордеон волн, содержит Bulk Operations Tooltar (удаление/дублирование всех) |
| `WaveSettingsPanel` | `components/WaveSettingsPanel.ts` | Метаданные волны + авто-сводка |
| `WaveTimeline` | `components/WaveTimeline.ts` | Canvas: цветные блоки = группы, серые = задержки |
| `EnemyGroupRow` | `components/EnemyGroupRow.ts` | 2-строчный: тип/кол-во/паттерн + интервал/задержка |
| `SpawnTimingControl` | `components/SpawnTimingControl.ts` | Переиспользуемый: range + число |
| `ThreatMeter` | `components/ThreatMeter.ts` | Шкала угрозы с цветовой градацией |

### Массовые Операции и Валидация

Добавлен инструментарий массового редактирования:

- **Presets**: `WavePresets.ts` управляет встроенными и кастомными пресетами, сохраненными в `localStorage`.
- **Bulk Ops**: Метод `WaveModel.replaceAllWaves` позволяет полностью заменить драфт (сохраняя шаг в Undo-стек). Кнопки "Move Up/Down" управляют позицией отдельной волны.
- **Extended Validation**: Метод `validateExtended()` возвращает массивы warning/error, которые визуализируются как в `ValidationPanel`, так и внутри `WaveList` (красные/желтые рамки `EnemyGroupRow`).

### WaveEditorHistory (Undo/Redo)

`WaveEditorHistory.ts` — JSON snapshots, отдельный от `EditorHistory` (тайлы/объекты).

- **Max 30** записей (FIFO).
- `push(label, waves)` — snapshot ПЕРЕД мутацией.
- `undo(currentWaves)` / `redo(currentWaves)` — возвращает восстановленный массив.
- Все мутации `WaveModel` вызывают `history.push()` первым.

### BaseComponent Lifecycle

Все UI-компоненты наследуют `BaseComponent<T>`:

```typescript
abstract class BaseComponent<T> {
    protected element: HTMLElement;
    protected data: T;

    constructor(data: T) {
        this.data = data;
        this.element = this.createRootElement(); // ← вызов в конструкторе!
    }

    abstract createRootElement(): HTMLElement;
    abstract render(): void;

    mount(parent: HTMLElement) {
        parent.appendChild(this.element);
        this.render();
    }
}
```

> [!WARNING]
> НЕ объявляйте `private field!` в подклассах для полей, устанавливаемых в `createRootElement()`.
> ES2022 class field initializers ПЕРЕЗАПИШУТ значение после `super()`. См. pitfall #8.

### Keyboard Shortcuts

| Комбинация | Действие |
|-----------|----------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+S` | Сохранить |

Обработчик хранится в `boundKeyHandler` и удаляется в `destroy()`.

### Правила разработки

1. **Новые поля данных:** Обязательно обновить 3 файла: `MapData.ts` → `Utils.ts` → `WaveModel.ts`
2. **Canvas компоненты:** Использовать `this.element as HTMLCanvasElement`, НЕ отдельное поле
3. **Range слайдеры с историей:** `onchange` для записи, `oninput` только для UI-синхронизации
4. **Тестирование:** Round-trip test для каждого нового поля в `WaveModel.test.ts`
5. **Локализация:** UI строки на русском (кроме ID врагов)
