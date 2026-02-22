# UI & Event System Architecture

This document describes the architecture for User Interface components and the Event System in NewTower, focusing on lifecycle management, strict cleanup patterns, design tokens, and visual systems.

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
    private unsubEvent: () => void = () => {};
    private boundClick: () => void;

    constructor() {
        this.boundClick = () => this.onClick();
        btn.addEventListener('click', this.boundClick);
        
        // Store Unsubscribe Function
        this.unsubEvent = EventBus.getInstance().on(Events.MONEY_CHANGED, this.onEvent);
    }

    destroy() {
        // Remove DOM Listener
        btn.removeEventListener('click', this.boundClick);
        
        // Call Unsubscribe Function
        this.unsubEvent();
    }
}
```

---

## 📡 EventBus System

We use a singleton `EventBus` for decoupled communication between Systems and UI.

### Unsubscribe Functions

The `EventBus.on()` method returns a **function** `() => void`. **You must store this function** and call it to unsubscribe later.

**Why?**
This eliminates the need to manage numeric IDs or track function references manually. It is cleaner and prevents "dangling ID" bugs.

**API:**

```typescript
// Subscribe
const unsub = EventBus.getInstance().on(Events.MONEY_CHANGED, (amt) => update(amt));

// Unsubscribe
unsub();
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

### UI Modes

The `UIManager` now controls the high-level state of the interface via `setMode(mode: UIMode)`.

- **`'menu'`**: Hides Game HUD, Shop, Game Over. Shows Main Menu (managed by MenuScene).
- **`'game'`**: Shows Game HUD, Shop. Hides Game Over.
- **`'gameOver'`**: Shows Game Over overlay on top of the Game HUD.

Always use `ui.setMode()` instead of manually toggling elements when switching states.

### Scene Integration

Scenes should expose their UI components via `UIManager` or direct properties, but **must** ensure `destroy()` propagates down.

```typescript
// StressTestScene.ts / GameScene.ts
public destroy() {
    this.uiManager.destroy(); // Propagate to HUD/Shop
    super.destroy();          // Cleanup base scene logic
}
```

### Strict Initialization Order

To prevent `null` reference crashes (e.g. `document.getElementById` returning null), Systems that rely on Dynamic UI layers must be initialized **after** `UIManager` has built the DOM.

**✅ GOOD Pattern:**

```typescript
// GameScene.init()
this.uiManager = new UIManager(this); // Builds #hand-container, etc.
this.cardSystem = new CardSystem(this);
this.cardSystem.initUI(); // Safe to access DOM
```

**❌ BAD Pattern:**

```typescript
// GameScene.init()
this.cardSystem = new CardSystem(this);
this.cardSystem.initUI(); // CRASH: #hand-container doesn't exist yet!
this.uiManager = new UIManager(this);
```

### Double-Transition Bugs (Click Handlers)

When dealing with simple UI buttons that transition states (e.g. `startButton`), avoid `element.addEventListener('click', handler)` because scene restarts can cause the listener to be bound twice if `destroy()` misses it.

**Preferred Approach for Single-Action Buttons:**

```typescript
// Overwrites any previous listener safely
this.startButton.onclick = () => {
    EventBus.getInstance().emit(Events.WAVE_START_REQUESTED);
};
```

---

## 🎨 Design Token System (`src/design/`)

All UI styling must reference the project's design tokens rather than hardcoded values. This ensures visual consistency across all components.

### Token Files

| File | Exports | Key Values |
|------|---------|------------|
| `colors.ts` | `UI_COLORS` | Primary, status colors, `glass.bg` (`rgba(30,30,40,0.85)`), `glass.border` (`rgba(255,255,255,0.1)`) |
| `spacing.ts` | `UI_SPACING` | `xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32` |
| `borders.ts` | `UI_BORDERS` | `radius.sm: 4`, `radius.md: 8`, `radius.lg: 12` |
| `shadows.ts` | `UI_SHADOWS` | `shadow.sm`, `shadow.lg`, `shadow.glass` |
| `transitions.ts` | `UI_TRANSITIONS` | `duration.fast: 150ms`, `duration.normal: 300ms`, `presets.*` |
| `fonts.ts` | `UI_FONTS` | Font families, sizes, weights |

### Usage Rule

When writing CSS in `index.html` or inline styles in TypeScript, add a comment referencing the token:

```css
border-radius: 12px; /* = UI_BORDERS.radius.lg */
background: rgba(30, 30, 40, 0.85); /* = UI_COLORS.glass.bg */
transition: all 0.15s; /* = UI_TRANSITIONS.duration.fast */
```

---

## 🪟 Glassmorphism Panel System

All major UI panels (Shop, Forge, Hand) share a unified glassmorphism style:

```css
.ui-panel {
    padding: 12px;
    border-radius: 12px;                       /* UI_BORDERS.radius.lg */
    background: rgba(30, 30, 40, 0.85);         /* UI_COLORS.glass.bg */
    border: 1px solid rgba(255, 255, 255, 0.1);  /* UI_COLORS.glass.border */
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    width: 270px;
}
```

> **Global Reset:** `*, *::before, *::after { box-sizing: border-box; }` is applied globally.

---

## 🃏 Hand Fan System

The card hand (`#hand`) uses a dynamic fan/overlap mechanic to handle variable card counts:

### Mechanism

- **>5 cards:** Cards overlap using `margin-left: -12px`. On hover, a card lifts (`translateY(-12px)`) and pushes neighbors aside (`margin: 4px`).
- **≤5 cards:** Normal layout with `gap: 8px` (no overlap). Controlled via CSS `:has()` selector.

```css
/* Overlap mode (default) */
#hand .card { margin-left: -12px; z-index: 1; }
#hand .card:hover { transform: translateY(-12px); margin: 0 4px; z-index: 10; }

/* Normal mode (5 or fewer cards) */
#hand:has(.card:nth-child(-n+5):last-child) .card { margin-left: 0; }
#hand:has(.card:nth-child(-n+5):last-child) { gap: 8px; }
```

> ⚠️ **Browser Compatibility:** The `:has()` selector requires modern browsers (Chrome 105+, Safari 15.4+, Firefox 121+).

---

## 🎰 Slot System

Slots are containers (`80×112px`) that visually hold cards. Cards inside slots are automatically scaled down.

### Card Scaling

```css
.slot .card {
    transform: scale(0.8);    /* Card appears smaller than full-size */
    transform-origin: center center;
}
```

### Slot Variants

| Class | Purpose | Border Color |
|-------|---------|--------------|
| `.slot` | Base slot | `rgba(255,255,255,0.12)` (dashed) |
| `.slot.shop-slot` | Shop purchase slot | `rgba(255,215,0,0.25)` (gold) |
| `.slot.forge-slot` | Forge input slot | `rgba(255,152,0,0.2)` (orange) |
| `.slot.forge-slot.slot-empty` | Empty forge slot | Shows "+" and "Карта" via `::before`/`::after` |

### Forge Slot Empty State

Empty forge slots display placeholder text via CSS pseudo-elements. The `slot-empty` class is toggled by `ForgeSystem.render()`:

```typescript
// ForgeSystem.ts render()
if (slotCard) {
    el.classList.remove('slot-empty');
    // ... append card element
} else {
    el.classList.add('slot-empty');
}
```

---

## ✋ Drag & Drop Feedback

### Dragging Placeholder

When a card is being dragged, the original position shows a faded placeholder:

```css
.card.dragging-placeholder {
    opacity: 0.25;
    transform: scale(0.95) !important;
    filter: grayscale(0.6);
    pointer-events: none;
}
```

### Drag Ghost

The dragged card ghost is visually elevated:

```css
#drag-ghost {
    transform: scale(1.08);
    filter: brightness(1.1) drop-shadow(0 8px 20px rgba(0,0,0,0.5));
}
```

---

## 💓 HUD Micro-Animations

The HUD provides instant visual feedback via CSS animations on state changes:

### Lives — Danger Pulse

When the player loses HP, the lives counter pulses red:

```css
@keyframes hud-danger-pulse {
    0%, 100% { color: inherit; }
    50% { color: #f44336; text-shadow: 0 0 8px rgba(244,67,54,0.6); }
}
.hud-pulse-danger { animation: hud-danger-pulse 0.4s ease-in-out 2; }
```

### Gold — Glow

When the player gains gold, the counter glows:

```css
@keyframes hud-gold-glow {
    0%, 100% { text-shadow: none; }
    50% { text-shadow: 0 0 10px rgba(255,215,0,0.8); }
}
.hud-glow-gold { animation: hud-gold-glow 0.35s ease-in-out; }
```

### Triggering (GameHUD.ts)

Animations are triggered by toggling CSS classes with a reflow trick to allow replaying:

```typescript
el.classList.remove('hud-glow-gold');
void el.offsetWidth; // Force reflow to restart animation
el.classList.add('hud-glow-gold');
el.addEventListener('animationend', () => el.classList.remove('hud-glow-gold'), { once: true });
```

---

## 🚨 Common Pitfalls

1. **"As Any" Casting**: Avoid `(window as any)`. Use explicit interfaces (`IGameScene`) to access generic systems.
2. **Double Binding**: If you don't clean up listeners, restarting a scene will bind a *second* listener. Clicking a button will then fire *twice*.
3. **Ghost UI**: If you manipulate a DOM element that was removed from the document, nothing happens (but no error). If you try to read from it, you might get nulls.
4. **Inline Styles**: Avoid setting `style.border`, `style.boxShadow`, etc. directly in TypeScript. Prefer CSS classes and class toggling. Inline styles override CSS specificity and break the design token system.
5. **Box-Sizing**: Never add `box-sizing: content-box` — the global reset enforces `border-box` everywhere.

---

## 📘 IGameScene Interface

The `IGameScene` interface is the contract that allows UI components to talk to the game state without depending on concrete implementations (`GameScene` vs `StressTestScene`).

**Rules:**

- UI components should take `IGameScene` in their constructor, not `GameScene`.
- If a Scene is missing a system (e.g., `StressTestScene` lacking `WaveManager`), it should implement a **Mock** or **Null Object** version to satisfy the contract, preventing crashes.

---

## 📑 Key UI Files

| File | Role |
|------|------|
| `index.html` | All CSS styles + HTML structure for UI panels |
| `src/ui/GameHUD.ts` | HUD: Lives, Money, Wave, Enemy counter, Forge button |
| `src/ui/ShopUI.ts` | Shop: Slot rendering, Buy/Reroll, selection logic |
| `src/ForgeSystem.ts` | Forge: Slot management, drag drop, evolution modal |
| `src/CardSystem.ts` | Hand rendering, card creation, drag ghost |
| `src/design/*.ts` | Design tokens (colors, spacing, borders, shadows, transitions, fonts) |
