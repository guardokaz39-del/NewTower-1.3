---
description: Project coding conventions, architecture rules, and performance guidelines for NewTower 1.4
---

# NewTower — Coding Conventions & Architecture Rules

## 1. Язык и стиль кода

- **Язык комментариев:** русский или английский — допустимы оба; в одном блоке следует придерживаться одного языка.
- **Именование:** camelCase для переменных/методов, PascalCase для классов/интерфейсов/типов.
- **Интерфейсы:** `I`-префикс (`IEnemyConfig`, `ICard`, `IGameScene`).
- **Константы конфига:** `UPPER_CASE` внутри объекта `CONFIG`.

---

## 2. Performance: Hot-Loop Rules (КРИТИЧЕСКИ ВАЖНО)

> Эти правила применяются ко ВСЕМУ коду, который вызывается внутри `update()` или `draw()` каждый кадр.

### 2.1 Запрещено в hot-loop

| Запрещено | Почему | Что делать вместо |
|:---|:---|:---|
| `new Object()` / `{ ... }` литералы | GC-спайки каждые 2-3 секунды | Переиспользуй static/field объект |
| `Array.splice(i, 1)` для удаления | O(n) — двигает весь хвост массива | Swap-and-pop (`arr[i] = arr[arr.length-1]; arr.length--`) |
| `Array.filter()` / `.map()` / `.reduce()` | Создают новый массив каждый кадр | `for` / `while` loop с мутацией |
| `ctx.shadowBlur` / CSS-фильтры | Performance killer на 500+ сущностей | Предзапечённые спрайты через `AssetCache` |
| `ctx.createRadialGradient()` в render | Аллокация + CPU overhead каждый кадр | Кэширование в `AssetCache.getGlow()` |
| Строковые конкатенации в ключах | GC-давление | Шаблонные литералы с кэшированием |

### 2.2 Обязательно в hot-loop

- **`Math.round(x)` для координат** `drawImage()` — предотвращает sub-pixel blur.
- **`Math.max`/`Math.min` bounds** — защита от NaN/Infinity в конце расчётов.
- **`isAlive()` guard** перед любой операцией с сущностью из пула.
- **Reverse loop или swap-and-pop** для удаления из массива.

### 2.3 `EffectSystem` — правильное использование

```typescript
// ❌ НЕПРАВИЛЬНО: создаёт анонимный объект (GC pressure)
this.effects.add({ type: 'particle', x, y, vx, vy, life: 0.5, radius: 3, color: '#ff0' });

// ✅ ПРАВИЛЬНО: использует object pool
this.effects.spawnParticle('particle', x, y, vx, vy, 0.5, 3, '#ff0');

// ✅ ПРАВИЛЬНО: для взрывов
this.effects.spawnExplosion(x, y, radius, life, color);

// ⚠️ ДОПУСТИМО: spawn() с объектом — пул переиспользуется, но объект-конфиг всё равно создаётся
this.effects.spawn({ type: 'debris', x, y, vx, vy, life: 0.4, size: 5, color: '#f00', gravity: 400 });
```

Приоритет вызовов: `spawnParticle()` > `spawnExplosion()` > `spawn({...})` > `add({...})`.

---

## 3. Canvas State Management

### Правило: «Кто открыл — тот и закрыл»

```typescript
// ❌ НЕПРАВИЛЬНО: утечка состояния
render(ctx) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(img, x, y);
    // globalAlpha "протекает" в следующий рендер-вызов!
}

// ✅ ПРАВИЛЬНО: ручной откат (дешевле save/restore)
render(ctx) {
    const oldAlpha = ctx.globalAlpha;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(img, Math.round(x), Math.round(y));
    ctx.globalAlpha = oldAlpha;
}

// ✅ ПРАВИЛЬНО: save/restore ТОЛЬКО для transform/composite
render(ctx) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(img, -w/2, -h/2);
    ctx.restore();
}
```

**Когда использовать `save`/`restore`:**

- `ctx.translate()` / `ctx.rotate()` / `ctx.scale()` — **всегда save/restore**
- `ctx.globalCompositeOperation` — **всегда save/restore**
- `ctx.globalAlpha` / `ctx.fillStyle` / `ctx.strokeStyle` — **ручной откат**
- `ctx.setLineDash([])` — сбросить после использования

---

## 4. Entity Lifecycle & Object Pool

### Правила пула

1. **Получение:** `pool.obtain()` → `entity.init(config)`.
2. **Возвращение:** `entity.reset()` → `pool.free(entity)`.
3. **Reset обязан** обнулить ВСЕ поля, включая: таймеры, ссылки на цели, EventBus-подписки, визуальные состояния.
4. **isAlive() guard обязателен** перед: нанесением урона, назначением целью, чтением позиции.

### Zombie References

```typescript
// ❌ Башня может держать ссылку на мёртвого врага
if (this.target) { this.fireAt(this.target); }

// ✅ Zombie guard
if (this.target && (!this.target.isAlive() || this.target.finished)) {
    this.target = null;
}
```

---

## 5. AssetCache — Правила кэширования

1. **Все ключи:** `key.toLowerCase()` — защита от cache bouncing.
2. **Hard limit:** 4096 записей → полный `clear()` при переполнении (не LRU — слишком дорого для JS).
3. **Создание спрайтов:** фабричная функция рисует 1 раз, результат кэшируется навсегда (до clear).
4. **Градиенты запрещены в рендере** — только предзапечённые через `AssetCache.getGlow()`.

---

## 6. Архитектурные контракты

### Разделение Domain / Visual

| Слой | Что хранит | Примеры файлов |
|:---|:---|:---|
| **Domain (Симуляция)** | Позиция, HP, скорость, кулдауны, армор | `Enemy.ts`, `Tower.ts`, `Projectile.ts` |
| **Systems** | Коллизии, таргетинг, оружие | `CollisionSystem.ts`, `TargetingSystem.ts`, `WeaponSystem.ts` |
| **View (Рендер)** | Спрайты, анимации, визуальные таймеры | `renderers/`, `EffectSystem.ts`, `FogSystem.ts` |
| **Orchestration** | Связка слоёв, UI, ввод | `GameScene.ts`, `GameController.ts`, `UIManager.ts` |

**Исключение (допустимое):** `hitFlashTimer` в `Enemy.ts` — визуальный таймер в домене. Это **1 строка**, не влияет на симуляцию, вынос создаст больше кода, чем решит проблем.

### AoE / Chain Reaction Safety

Любой метод, который наносит урон в цикле по врагам (взрывы, цепные реакции), **обязан** иметь depth guard:

```typescript
private explosionDepth = 0;
private static readonly MAX_EXPLOSION_DEPTH = 3;

triggerExplosion(...) {
    if (this.explosionDepth >= MAX_EXPLOSION_DEPTH) return;
    this.explosionDepth++;
    // ... damage logic
    this.explosionDepth--;
}
```

---

## 7. Swap-and-Pop Pattern (удаление из массива)

```typescript
// ✅ O(1) удаление — используй когда порядок не важен (враги)
enemies[i] = enemies[enemies.length - 1];
enemies.length--;
// Не инкрементируй i — на позиции i теперь новый элемент!

// ❌ НЕ используй для: towers[] (порядок отрисовки важен)
// ❌ НЕ используй для: effects[] (если z-order имеет значение)
```

---

## 8. dt Clamp & Sub-stepping

```typescript
// Game.ts — глобальный clamp (Phase 2.1)
const safeDt = Math.min(dt, 1 / 30); // максимум 33ms за кадр

// EntityManager — sub-step для move() (Phase 2.1)
const MAX_MOVE_STEP = 1 / 60;
let remaining = dt;
while (remaining > 0) {
    const step = remaining < MAX_MOVE_STEP ? remaining : MAX_MOVE_STEP;
    enemy.move(step, flowField);
    remaining -= step;
}
// update() (таймеры) — вызывать 1 раз с полным dt
enemy.update(dt);
```
