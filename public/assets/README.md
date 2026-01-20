# Asset Integration Guide

## 📁 Folder Structure

Assets should be placed in the following directories:

```
public/assets/images/
├── tiles/          # Environment tiles (grass, path, fog, decorations)
├── towers/         # Tower bases and turrets
├── modules/        # Tower upgrade modules
├── enemies/        # Enemy sprites
├── props/          # Enemy props (shields, weapons, etc.)
├── projectiles/    # Projectile sprites
└── effects/        # Visual effects (kept procedural for now)
```

---

## 🎨 Asset Naming Convention

### Basic Assets

Use the exact name from the game (see list below):

```
grass.png
path.png
turret_ice.png
enemy_skeleton.png
```

### Multi-Variant Assets (for randomization)

To add multiple variants of the same asset, use `_1`, `_2`, `_3`, etc.:

```
grass.png        # Main variant (always required)
grass_1.png      # Variant 1 (optional, will be randomly chosen)
grass_2.png      # Variant 2 (optional)
grass_3.png      # Variant 3 (optional)
```

**The system will:**

1. Try to load the main file (grass.png)
2. Then try loading variants (grass_1.png, grass_2.png, ... up to grass_5.png)
3. Randomly select one variant each time `Assets.get('grass')` is called

**Max variants:** Configured per asset (see below)

---

## 📋 Complete Asset List

### Environment Tiles (folder: `tiles/`)

| Asset Name | Variants Support | Max Variants | Description |
|------------|------------------|--------------|-------------|
| `grass.png` | ✅ Yes | 5 | Ground grass tile |
| `path.png` | ✅ Yes | 3 | Road/path tile |
| `fog_0.png` ... `fog_15.png` | ❌ No | 0 | Fog tiles (16 bitmask variants) |
| `tree.png` | ✅ Yes | 3 | Tree decoration |
| `rock.png` | ✅ Yes | 5 | Large rock decoration |
| `stone.png` | ✅ Yes | 3 | Small stones |
| `wheat.png` | ✅ Yes | 2 | Wheat field |
| `flowers.png` | ✅ Yes | 3 | Flowering grass |

**Note:** Fog tiles are numbered 0-15 for bitmask system. DO NOT add variants for  fog tiles.

---

### Towers (folder: `towers/`)

| Asset Name | Variants | Description |
|------------|----------|-------------|
| `base.png` | No | Tower platform (old name) |
| `base_default.png` | No | Tower platform |
| `gun.png` | No | Basic gun (old name) |
| `turret_standard.png` | No | Standard turret |
| `turret_ice.png` | No | Ice turret |
| `turret_fire.png` | No | Fire/Mortar turret |
| `turret_sniper.png` | No | Sniper turret |
| `turret_split.png` | No | Multishot turret |
| `turret_minigun.png` | No | Minigun turret |

---

### Modules (folder: `modules/`)

| Asset Name | Description |
|------------|-------------|
| `ice.png` | Ice module overlay |
| `fire.png` | Fire module overlay |
| `sniper.png` | Sniper module overlay |
| `split.png` | Split module overlay |
| `minigun.png` | Minigun module overlay |

---

### Enemies (folder: `enemies/`)

| Asset Name | Variants Support | Max Variants | Description |
|------------|------------------|--------------|-------------|
| `skeleton.png` | ✅ Yes | 3 | Skeleton enemy |
| `wolf.png` | ✅ Yes | 2 | Wolf enemy |
| `troll.png` | ✅ Yes | 2 | Troll enemy |
| `spider.png` | ✅ Yes | 2 | Spider boss |

---

### Enemy Props (folder: `props/`)

| Asset Name | Description |
|------------|-------------|
| `shield.png` | Shield prop |
| `helmet.png` | Helmet prop |
| `weapon.png` | Weapon prop |
| `barrier.png` | Energy barrier prop |

---

### Projectiles (folder: `projectiles/`)

| Asset Name | Description |
|------------|-------------|
| `standard.png` | Standard projectile |
| `ice.png` | Ice shard projectile |
| `fire.png` | Fireball projectile |
| `sniper.png` | Sniper bullet |
| `split.png` | Multishot pellet |
| `minigun.png` | Minigun tracer |

---

### Effects (folder: `effects/`)

**Note:** Effects are kept procedural for performance. PNG loading disabled for these.

---

## 🔄 How It Works

### 1. Loading Priority

1. **Try PNG**: System attempts to load PNG from `/assets/images/`
2. **Fallback**: If PNG not found, generates procedural texture
3. **Variants**: If multiple variants exist, stores all for random selection

### 2. Variant Example

If you have:

```
public/assets/images/tiles/
  ├── grass.png       # Will be loaded ✓
  ├── grass_1.png     # Will be loaded as variant ✓
  ├── grass_2.png     # Will be loaded as variant ✓
  └── grass_3.png     # Will be loaded as variant ✓
```

Result: `Assets.get('grass')` will randomly return one of  4 variants

### 3. Missing Assets

If `grass.png` is missing, the system will:

1. Log: `"grass.png not found, will use procedural fallback"`
2. Generate procedural grass texture automatically
3. Game continues running normally

---

## 🎯 Asset Specifications

See `graphics_report.md` for detailed specifications of each asset:

- Exact dimensions (64x64px, 48x48px, etc.)
- Color schemes
- Visual style guidelines
- Generation prompts for AI tools

---

## 🚀 Getting Started

### Minimal Setup (Test hybrid system)

Just add these 3 files to test:

```
public/assets/images/tiles/grass.png
public/assets/images/enemies/skeleton.png
public/assets/images/projectiles/standard.png
```

The rest will use procedural fallback.

### Full Art Pass

Generate all assets from `graphics_report.md` and place them in respective folders.

---

## 🔧 Configuration

### Enable/Disable PNG Loading

In `Assets.ts` line 13:

```typescript
private static USE_EXTERNAL_ASSETS = true;  // Use PNG files
private static USE_EXTERNAL_ASSETS = false; // Only procedural
```

### Change Max Variants

In `Assets.ts` `loadExternalAssets()` method, modify the numbers:

```typescript
loadTasks.push(this.loadImage('grass', 'tiles/grass.png', 5));  // 5 = up to 5 variants
loadTasks.push(this.loadImage('grass', 'tiles/grass.png', 10)); // Change to 10
```

---

## 📊 Loading Statistics

The console will display loading stats:

```
Assets: External loading complete! Loaded: 42, Failed: 14
Assets: Found 4 variants for "grass"
Assets: Found 2 variants for "enemy_skeleton"
Assets: Loading complete! Total: 180 assets (42 PNG, 138 procedural)
```

---

## ✅ Testing

1. Start the game: `npm run dev`
2. Check browser console for asset loading logs
3. Missing assets will use procedural fallback (game won't break)
4. Any errors will be visible in console

---

## 📝 Notes

- **File format:** PNG with transparency (alpha channel)
- **Sizes:** Must match specifications in `graphics_report.md`
- **Direction:** Turrets should face **RIGHT** (East) in the image
- **Tiles:** Must be seamless/tileable for grass, path
- **Naming:** Case-sensitive, use exact names from lists above

---

**Status:** Hybrid system active ✓  
**Fallback:** Procedural generation enabled ✓  
**Variants:** Multi-variant randomization supported ✓
