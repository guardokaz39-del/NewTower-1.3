# Implementation Plan - Ink Style Evolution (Visual Upgrade)

**Status:** PLANNING
**Goal:** Evolve the current "Ink on Paper" style into a polished, high-quality "Living Illustration" aesthetic (Watercolor, Dynamic Hatching, Paper UI) without breaking existing functionality.

## 1. Core Principles (Roadmap)

1. **Strict Backward Compatibility:**
    * `CONFIG.VISUAL_STYLE` controls the engine. `INK_EVO` mode is added as a new option (or replaces `INK` while keeping `SPRITE` fallback).
    * All new renderers must check this flag.
2. **Performance First:**
    * Heavy effects (watercolor generation, hatching) are cached on canvas layers, not drawn every frame.
    * Particles are pooled.
3. **Modular Evolution:**
    * Changes are split into isolated phases (Environment, Object Volume, Particles, UI).

---

## Phase 1: Environment & Watercolor (Atmosphere)

**Goal:** Transform the static paper background into a living, textured surface with watercolor washes for context (grass, path, special zones).

### 1.1 `InkConfig.ts` Update

* **Add:** `WATERCOLOR_PALETTE` (transparent RGBA colors for washes).
* **Add:** `PAPER_NOISE_CONFIG` (settings for procedural grain).

### 1.2 `InkMapRenderer.ts` Upgrade

* **Dynamic Paper Texture:**
  * Implement `generatePaperTexture(ctx, width, height)`: Adds subtle grain/noise and vignette to the base layer.
* **Watercolor Zones:**
  * Update `draw` method to render "Biomes" (Grass, Water/Ice) using a "Wet Brush" technique.
  * *Technique:* Draw multiple overlapping polygons with low opacity and `simplex` noise offset for organic edges.

### 1.3 Path & Grid Refinement

* **Path:** Replace the solid ink fill with a "Coffee Stain" or "Wash" effect (darker edges, lighter center).
* **Grid:** Ensure grid lines look like faint pencil sketches (reduce opacity, add slight breaks).

---

## Phase 2: Structures & Volume (Dynamic Hatching)

**Goal:** Give 3D volume to 2D towers using algorithmic cross-hatching (shading) that reacts to the global light direction.

### 2.1 `InkUtils.ts` - New Logic

* **Add:** `drawHatching(ctx, shape, lightDir, density)`
  * Algorithm: Calculates which side of a circle/rect is away from light.
  * Draws angled parallel lines in that area.
  * Uses masking (clipping) to keep lines inside the object.

### 2.2 `InkTowerRenderer.ts` Update

* **Tower Volumetric pass:**
  * Instead of just outlines, call `drawHatching` for the tower body.
  * Cast shadows: Draw a slanted "ink smudge" shadow on the ground layer (cached).

---

## Phase 3: Living Ink (Particles & Effects)

**Goal:** Make the action feel "juicy". Explosions and impacts should look like ink splattering on the paper.

### 3.1 `InkEffectRenderer.ts`

* **Ink Splatters:**
  * When an enemy dies, spawn 3-5 "Ink Blot" particles.
  * *Behavior:* They scale up quickly, then "dry" (fade out) slowly over 5-10 seconds.
  * *Visual:* Irregular black shapes.
* **Projectile Trails:**
  * Add a `TrailRenderer` that draws a fading ink stroke behind fast projectiles.

### 3.2 Enemy Visuals Consistency

* Ensure all enemies (even sprites) have an "Ink Filter" applied or strictly use the Ink render path.
* *Optimization:* If using sprite sheets, apply a "Threshold" filter or "Edge Detection" once at startup to generate specific ink versions. (Or just stick to the current vector drawing for consistency).

---

## Phase 4: UI Immersion (Paper Notes)

**Goal:** Integrate the floating DOM elements into the paper world.

### 4.1 CSS & Asset Reskin

* **Mains:**
  * `#game-ui`, `#shop-container`, `#card-hand`.
* **Style Changes:**
  * **Backgrounds:** Use a repeatable "torn paper" texture or CSS `mask-image` to create ragged edges.
  * **Pins:** Add visual "Push Pins" (svg/img) to the corners of UI elements.
  * **Fonts:** Switch headers to `Amatic SC` or similar handwritten font (if available/loadable), keep body text readable.
  * **Shadows:** Add `box-shadow` to simulate paper lifting off the table.

### 4.2 `ShopUI.ts` & `CardSystem.ts`

* Update card rendering to look like "Sketch Cards" (rough borders, monochrome icons with one accent color).

---

## Verification Plan

1. **Toggle Check:** Verify `CONFIG.VISUAL_STYLE = 'SPRITE'` still looks 100% like the old version.
2. **Performance:** Check FPS on wave 10+ with many ink particles. (Target > 50 FPS).
3. **Visual Audit:** Compare screen capture with the Concept Art (review.md).

## New File Structure (Partial)

* `src/graphics/InkWatercolor.ts` (New module for wash logic)
* `src/graphics/InkHatching.ts` (New module for shading)
* `assets/paper_texture.png` (Optional, or generated procedurally)
