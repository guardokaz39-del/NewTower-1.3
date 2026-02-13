# UI & Event System Architecture

This document describes the architecture for User Interface components and the Event System in NewTower, focusing on lifecycle management and strict cleanup patterns to prevent memory leaks.

---

## 🏗️ UI Lifecycle Management

All UI components (Scenes, HUDs, Panels) must adhere to a **strict lifecycle** to ensure event listeners are bound and unbound correctly.

### 1. The `destroy()` Contract

Every UI class must implement a `destroy()` or `dispose()` method.

- **Responsibility:** Remove **ALL** DOM event listeners and generic EventBus subscriptions.
- **When to call:**
  - **Scenes:** Called automatically by `Game.ts` when switching scenes.
  - **Sub-components (HUD, Shop):** Called by the parent Scene's `destroy` method.

**❌ BAD Pattern:**

```typescript
class BadUI {
    constructor() {
        btn.addEventListener('click', this.onClick.bind(this)); // Creates new function ref!
        EventBus.getInstance().on('EVENT', () => this.update());
    }
    // No destroy method -> Memory Leak & Duplicate Logs
}
```

**✅ GOOD Pattern:**

```typescript
class GoodUI {
    private subId: number = -1;
    private boundClick: () => void;

    constructor() {
        this.boundClick = () => this.onClick();
        btn.addEventListener('click', this.boundClick);
        
        // Store Subscription ID
        this.subId = EventBus.getInstance().on('EVENT', this.onEvent);
    }

    destroy() {
        // Remove DOM Listener (must use exact same reference)
        btn.removeEventListener('click', this.boundClick);
        
        // Remove EventBus Subscription (must use ID)
        if (this.subId !== -1) {
            EventBus.getInstance().off(this.subId);
            this.subId = -1;
        }
    }
}
```

---

## 📡 EventBus System

We use a singleton `EventBus` for decoupled communication between Systems and UI.

### Subscription IDs

The `EventBus.on()` method returns a unique `number` ID. **You must store this ID** to unsubscribe later.

**Why?**
Passing functions to `off()` is unreliable if:

- You use anonymous arrow functions `() => {}` (different references).
- You use `.bind(this)` (creates a new wrapper).

**API:**

```typescript
// Subscribe
const id = EventBus.getInstance().on(Events.MONEY_CHANGED, (amt) => update(amt));

// Unsubscribe
EventBus.getInstance().off(id);
```

---

## 🖼️ UIManager & Layering

The `UIRoot` class manages high-level DOM containers.

### Layers

1. **Static Layer (`#ui-layer`)**:
    - Contains permanent HTML structures defined in `index.html` (e.g., Shop slots, HUD stats).
    - **NEVER CLEAR THIS LAYER** dynamically. These elements are re-used across game restarts.
    - If you clear this, `document.getElementById` will fail in the next session -> Crash.

2. **Dynamic Layers (`#hand-container`, `#tooltip-container`)**:
    - Contains elements created/destroyed at runtime (e.g., Cards in hand, Tooltips).
    - **Always clear** these in `UIManager.destroy()`.

### Scene Integration

Scenes should expose their UI components via `UIManager` or direct properties, but **must** ensure `destroy()` propagates down.

```typescript
// StressTestScene.ts / GameScene.ts
public destroy() {
    this.uiManager.destroy(); // Propagate to HUD/Shop
    super.destroy();          // Cleanup base scene logic
}
```

---

## 🚨 Common Pitfalls

1. **"As Any" Casting**: Avoid `(window as any)`. Use explicit interfaces (`IGameScene`) to access generic systems.
2. **Double Binding**: If you don't clean up listeners, restarting a scene will bind a *second* listener. Clicking a button will then fire *twice*.
3. **Ghost UI**: If you manipulate a DOM element that was removed from the document, nothing happens (but no error). If you try to read from it, you might get nulls.

---

## 📘 IGameScene Interface

The `IGameScene` interface is the contract that allows UI components to talk to the game state without depending on concrete implementations (`GameScene` vs `StressTestScene`).

**Rules:**

- UI components should take `IGameScene` in their constructor, not `GameScene`.
- If a Scene is missing a system (e.g., `StressTestScene` lacking `WaveManager`), it should implement a **Mock** or **Null Object** version to satisfy the contract, preventing crashes.
