# Правила Оптимизации и Производительности

> Этот документ устанавливает стандарты производительности для проекта NewTower.  
> **Все изменения кода должны соответствовать этим правилам.**

---

## 🚨 Запрещённые Паттерны в Hot Path

### 1. Canvas Shadows

```typescript
// ❌ ЗАПРЕЩЕНО в render loops
ctx.shadowBlur = 10;
ctx.shadowColor = '#ff0000';

// ✅ ПРАВИЛЬНО: Pre-baked glow спрайты
const glowSprite = Assets.get('enemy_glow');
ctx.drawImage(glowSprite, x, y);
```

### 2. CSS Filters

```typescript
// ❌ ЗАПРЕЩЕНО
ctx.filter = 'brightness(150%) sepia(100%)';

// ✅ ПРАВИЛЬНО: globalAlpha или tinted sprites
ctx.globalAlpha = 1.5; // Для яркости (ограничено 0-1)
// Или предварительно сгенерированные тонировки
```

### 3. Создание объектов

```typescript
// ❌ ЗАПРЕЩЕНО в update/draw
const position = { x: entity.x, y: entity.y };
const gradient = ctx.createRadialGradient(...);
const color = `rgba(${r}, ${g}, ${b}, ${a})`;

// ✅ ПРАВИЛЬНО: Переиспользование объектов
private static tempPos = { x: 0, y: 0 };
Entity.tempPos.x = entity.x;
Entity.tempPos.y = entity.y;
```

### 3a. Zero-Allocation (Vectors) [NEW]

Для движения юнитов (50+ врагов) **ЗАПРЕЩЕНО** возвращать новые объекты векторов.

```typescript
// ❌ ЗАПРЕЩЕНО (Allocates {x,y} every call)
public getVector(x, y): {x, number, y: number} {
    return { x: 1, y: 0 };
}

// ✅ ПРАВИЛЬНО (Reuse output object)
public getVector(x, y, out: {x: number, y: number}): void {
    out.x = 1;
    out.y = 0;
}

// В цикле:
flowField.getVector(this.x, this.y, this._moveVector);
```

### 4. Array filter в update

```typescript
// ❌ ЗАПРЕЩЕНО
this.entities = this.entities.filter(e => e.alive);

// ✅ ПРАВИЛЬНО: In-place обратная итерация
for (let i = this.entities.length - 1; i >= 0; i--) {
    if (!this.entities[i].alive) {
        this.entities[i] = this.entities[this.entities.length - 1];
        this.entities.pop();
    }
}
```

### 5. forEach в render loops

```typescript
// ❌ НЕ РЕКОМЕНДУЕТСЯ в критических путях
enemies.forEach(e => e.draw(ctx));

// ✅ ПРЕДПОЧТИТЕЛЬНО
for (let i = 0; i < enemies.length; i++) {
    enemies[i].draw(ctx);
}
```

---

## ✅ Обязательные Паттерны

### Object Pool для частых объектов

class EffectPool {
    private pool: IEffect[] = [];

    acquire(): IEffect {
        return this.pool.pop() || this.createNew();
    }
    
    release(effect: IEffect): void {
        effect.reset();
        this.pool.push(effect);
    }
}

```

**Важно для Pool.reset():**

- **Deep Reset**: Очищайте ВСЕ поля (включая флаги, таймеры, ссылки).
- **No-Alloc**: `this.array.length = 0`, но `this.effects = STATIC_EMPTY_ARRAY`.
- **Remove Order**: `reset()` -> `pool.push()` -> `swapRemove()`. Это предотвращает использование "грязных" объектов при ошибках индексов.

### Dirty Flag Caching (Stat Calculation)

Для сложных вычислений, зависящих от редких событий (например, статы башни зависят от карт):

```typescript
class Tower {
    private statsDirty = true;
    private cachedStats = null;

    invalidateCache() { 
        this.statsDirty = true; 
    }

    getStats() {
        // Tier 1: Полный пересчёт только при изменении карт
        if (this.statsDirty || !this.cachedStats) {
            this.cachedStats = this.calculateExpensiveStats(); // mergeCardsWithStacking, etc.
            // Кэшируем _baseDamage, _baseCrit, _baseCd для Tier 2
            this.statsDirty = false;
        }

        // Tier 2: Лёгкий оверлей spinup (каждый кадр для Minigun, ~3 арифм. операции)
        if (spinupEffect && this.spinupTime > 0) {
            cached.dmg = _baseDamage + bonusDamage;
            cached.critChance = _baseCrit + bonusCrit;
            cached.cd = _baseCd / (_baseSpeedMult + spinupSpeedBonus);
        }
        return this.cachedStats;
    }
}
```

> ⚠️ **Двухуровневый кэш**: Если значение зависит от данных, меняющихся каждый кадр (spinupTime), **НЕ** пересчитывайте весь кэш. Разделите на дорогую часть (Tier 1: dirty flag) и дешёвый оверлей (Tier 2: арифметика поверх базовых кэшированных значений).

**Важно для Pool.reset():**

- Очищайте массивы через `.length = 0`, а не `[]` (создание нового объекта).
- Сохраняйте ссылки на существующие объекты где возможно.
- Сбрасывайте примитивы (bool, number).

### Entity IDs

- **ЗАПРЕЩЕНО:** Использовать `string` / `UUID` для идентификации сущностей в игре (Enemy, Projectile).
- **ОБЯЗАТЕЛЬНО:** Использовать `number` и статический инкрементальный счетчик (`static nextId`).
  - Строки создают нагрузку на GC (Garbage Collector).
  - Числа (Smi) обрабатываются движком V8 намного быстрее.

### Event Listener Cleanup

```typescript
// Всегда регистрировать через BaseScene
this.registerListener(element, 'click', handler);
// Автоматический cleanup в onExit()

// Или хранить ссылку для ручного удаления
private boundHandler = this.onKeyDown.bind(this);
window.addEventListener('keydown', this.boundHandler);
// В destroy():
window.removeEventListener('keydown', this.boundHandler);
```

### Кеширование статических данных

```typescript
// Кешировать результаты дорогих вычислений
class PathCache {
    private cache: Map<string, Path> = new Map();
    
    getPath(start: Point, end: Point): Path {
        const key = `${start.x},${start.y}-${end.x},${end.y}`;
        if (!this.cache.has(key)) {
            // [NEW] Hard limit check
            if (this.cache.size > 512) this.cache.clear(); 
            this.cache.set(key, Pathfinder.calculate(start, end));
        }
        return this.cache.get(key)!;
    }
    
    invalidate(): void {
        this.cache.clear();
    }
}
```

### 11. AssetCache Constraints [NEW]

- **Hard Limit**: `AssetCache` и любые другие кэши (Pathfinding, FlowField) **ОБЯЗАНЫ** иметь лимит размера (напр. 512 элементов).
- **Overflow Strategy**: При переполнении — полный сброс (`clear()`). LRU слишком дорог для JS.

---

## 📊 Метрики и Бенчмарки

### Целевые показатели

| Метрика | Цель | Критический уровень |
| :--- | :--- | :--- |
| FPS | ≥ 60 | < 45 |
| Frame Time | ≤ 16ms | > 20ms |
| GC Pause | ≤ 5ms | > 10ms |
| Memory Usage | Стабильно | Рост > 10MB/min |

### Стресс-тест условия

- 100+ врагов на экране
- 20+ активных башен
- 50+ эффектов одновременно

---

## 🚀 Новые Стандарты (Phase 7-8)

### 1. Spawn Performance Tracking

Каждый спавн врага должен занимать **< 1.0ms**.

- Используйте `PerformanceMonitor.startTimer('Spawn')` в фабриках.
- Если таймер > 1.0ms, Smart HUD покажет предупреждение ⚠️.
- **Решение:** Кэшировать сложные вычисления в `Assets.ts` при загрузке.

### 2. Boss Rendering Optimization

Для Боссов и Командиров (Units с glow/aura):

- **ЗАПРЕЩЕНО:** Использовать процедурные градиенты (`createRadialGradient`) каждый кадр.
- **ЗАПРЕЩЕНО:** Использовать `shadowBlur` для динамических объектов.
- **ОБЯЗАТЕЛЬНО:** Генерировать текстуры эффектов (Aura, Eyes, Glow) в `Assets.ts` и рисовать через `drawImage`.

```typescript
// ❌ ПЛОХО (каждый кадр):
const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 20);
ctx.fillStyle = grad;
ctx.fill();

// ✅ ХОРОШО (один раз в Assets.ts + drawImage):
const aura = Assets.get('fx_boss_aura');
ctx.drawImage(aura, x, y);
```

---

## 🛠 DevConsole Performance Tools

При добавлении нового функционала обязательно:

1. **Добавить метрики** в `PerformanceMonitor`
2. **Создать стресс-тест** в DevConsole для нового компонента
3. **Профилировать** изменения с Chrome DevTools

---

## 📝 Чеклист для Code Review

При review производительно-критичного кода проверить:

- [ ] Нет `shadowBlur` в render loop
- [ ] Нет `ctx.filter` в render loop
- [ ] Нет `new Object/Array` в update/draw
- [ ] Нет `.filter()` для массивов сущностей
- [ ] Event listeners имеют cleanup
- [ ] Градиенты кешируются
- [ ] Использован Object Pool для частых объектов

---

### 6. Logic / Visual Decoupling [NEW]

Физика и Визуал должны быть **полностью разделены**.

- **Damage Logic**: Происходит мгновенно (в кадре события).
- **Visual Effect**: Спавнится и живет своей жизнью ("Fire and Forget").
- **Запрещено**: Использовать снаряды (Projectile) для визуализации взрывов (создавать объект с `life`, который наносит урон через N кадров).
- **Правильно**:

  ```typescript
  // Frame 0:
  CollisionSystem.applyAreaDamage(x, y, radius); // Instant Logic
  EffectSystem.spawnExplosion(x, y); // Visual only
  ```

### 7. SpatialGrid для AOE [NEW]

Для любых эффектов по площади (Splash, Explosion, Aura) **ОБЯЗАТЕЛЬНО** использовать `SpatialGrid`.

- **Запрещено**: `enemies.forEach(e => dist(e, target))` (O(N))
- **Обязательно**: `grid.getNearby(x, y, r)` (O(1))

### 8. Rendering: Sprites vs Vectors [NEW]

Для частых эффектов (Particles, Explosions, Projectiles):

- **Запрещено**: `ctx.arc`, `ctx.lineTo`, `ctx.stroke` в каждом кадре.
- **Обязательно**:
  - **Particles**: `ctx.fillRect` (для r < 3).
  - **Complex Effects**: Pre-rendered Canvas (Sprite).
  - **Glow**: Cached Gradients.

### 9. Text Rendering [NEW]

- **Запрещено**: `ctx.strokeText` для обычного текста (Damage numbers). Это очень дорого.
- **Разрешено**: Только для редких событий (Critical Hit, Level Up).

- **Разрешено**: Только для редких событий (Critical Hit, Level Up).

### 10. High-DPI & Resolution [NEW]

- **DPR Capping**: `DevicePixelRatio` ограничен значением **2.0**.
  - На экранах 3x/4x (Retina, Modern Mobile) рендеринг в полном разрешении убивает FPS.
  - Визуальная разница между 2x и 3x мала, а нагрузка на GPU растет в 2.25 раза.
- **Canvas Resizing**:
  - `canvas.width` = `clientWidth * dpr`
  - `ctx.scale(dpr, dpr)`
  - Логика игры всегда работает в **CSS Pixels** (`game.width`).

---

*Последнее обновление: 2026-02-09 (Optimization Phase 2)*
