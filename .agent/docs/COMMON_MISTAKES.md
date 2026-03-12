---
description: Common mistakes, anti-patterns, and lessons learned from NewTower development
---

# Common Mistakes & Anti-Patterns

> Этот документ — накопленный опыт ошибок. Каждый пункт здесь — реальная ошибка, совершённая при разработке. Перед написанием кода **обязательно** просмотри этот список.

---

## 🔴 CRITICAL: Ошибки, которые ломают игру

### 1. Division by Zero & Empty Array Randomness (Math Crashes)

**Ошибка:** Обращение к элементам по модулю `i % arr.length` или случайный выбор `arr[Math.floor(Math.random() * arr.length)]` без проверки на пустоту массива (`length === 0`).

**Признак:** `NaN` при вычислении индекса, `undefined` при доступе к элементу, крах движка или UI-потока. Особенно актуально для динамически формируемых пулов (например, разрешенные карты), которые могут оказаться пустыми из-за бага сохранения/редактора.

**Решение:**

1. Для случайного выбора: Абсолютный fallback-guard.

```typescript
if (pool.length === 0) pool = fallbackPool; 
```

1. Для модуля `%`: Защита от деления на 0 через `Math.max`.

```typescript
const item = arr[i % Math.max(1, arr.length)];
```

---

### 2. Splice в hot-loop (GC-шторм)

**Ошибка:** Использование `Array.splice(i, 1)` для удаления мёртвых врагов.

```typescript
// ❌ O(n) на каждое удаление, GC-спайки при массовой смерти
for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].isAlive()) enemies.splice(i, 1);
}
```

**Решение:** Swap-and-pop (O(1)), forward iteration:

```typescript
let i = 0;
while (i < enemies.length) {
    if (!enemies[i].isAlive()) {
        enemies[i] = enemies[enemies.length - 1];
        enemies.length--;
    } else {
        i++;
    }
}
```

**Когда НЕ применять swap-and-pop:** Когда порядок массива важен (towers, UI-элементы).

---

### 2. effects.add() вместо spawn/spawnParticle

**Ошибка:** Создание нового объекта-конфига при каждом вызове эффекта в hot-path.

```typescript
// ❌ Создаёт новый object literal каждый раз
this.effects.add({ type: 'particle', x, y, vx, vy, life: 0.5, radius: 3, color: '#ff0' });
```

**Решение:** Использовать примитивные методы `spawnParticle()` / `spawnExplosion()`:

```typescript
// ✅ Zero-allocation через object pool
this.effects.spawnParticle('particle', x, y, vx, vy, 0.5, 3, '#ff0');
this.effects.spawnExplosion(x, y, radius, life, '#ff6600');
```

---

### 3. Каскадные взрывы без очереди задержки (Deferred Event Queue)

**Ошибка:** Взрыв убивает врага → враг при смерти взрывается → убивает ещё → ... (Вызывает ошибку CallStack Depth)

```typescript
// ❌ Бесконечная рекурсия при группе взрывных врагов
triggerExplosion(x, y, r, dmg) {
    for (const enemy of enemies) {
        if (dist(enemy, x, y) < r) enemy.takeDamage(dmg);
        // → enemy dies → emits ENEMY_DIED → listener calls triggerExplosion → ∞
    }
}
```

**Решение:** Использовать `CollisionSystem.explosionQueue` (Deferred Event Queue Pattern) для выноса эффектов взрыва из синхронного пайплайна:

```typescript
// ✅ Отложенный взрыв
CollisionSystem.explosionQueue.push(x, y, radius, damage, sourceId);
```

---

### 4. Zombie target — башня стреляет в мёртвого

**Ошибка:** Башня хранит ссылку `this.target` на врага. Враг умирает → возвращается в пул → переиспользуется. Башня стреляет в «призрака» или в нового врага на другом конце карты.

**Решение:** Проверять ОБА условия:

```typescript
if (this.target && (!this.target.isAlive() || this.target.finished)) {
    this.target = null;
}
```

---

## 🟡 HIGH: Ошибки производительности

### 5. ctx.shadowBlur в render loop

**Ошибка:** Использование `ctx.shadowBlur`, `ctx.shadowColor` для свечения — убивает FPS на 500+ объектов.

**Решение:** Предзапечённые glow-спрайты через `AssetCache.getGlow(color, size)`.

---

### 6. Утечка Canvas state

**Ошибка:** Установить `ctx.globalAlpha = 0.5` и забыть вернуть обратно.

**Признак:** Случайная прозрачность, мерцание UI, «фантомные» визуальные артефакты.

**Решение:** Ручной откат для простых свойств, save/restore только для transform.

---

### 7. Sub-pixel blur в drawImage

**Ошибка:** Передача дробных координат в `ctx.drawImage(sprite, 10.7, 20.3, ...)`.

**Признак:** «Мыло» — размытие спрайтов, особенно на HD-экранах.

**Решение:** `Math.round(x)` для всех координат в `drawImage`.

---

### 8. Бесконтрольный рост кэша спрайтов

**Ошибка:** Ключ кэша содержит непрерывное значение (угол `45.101`, dpr `1.375`) → бесконечное число уникальных записей.

**Признак:** OOM-краш после долгой сессии, особенно на мобильных.

**Решение:**

- Дискретизация ключей (`Math.floor(angle / 22.5) % 16`)
- DPR-бакеты (`rawDpr >= 2 ? 2 : 1`)
- Hard limit (4096) + полный `clear()` при переполнении
- Все ключи через `.toLowerCase()`

---

## 🟢 MEDIUM: Архитектурные и UI Ошибки

### 9. Пересоздание сложных DOM-деревьев (DOM Thrashing)

**Ошибка:** Использование `innerHTML = ''` и создание элементов с нуля при каждом переключении вкладок или выборе элемента (например, рендер деталей врага по клику).

```typescript
// ❌ Пересобирает правую панель и левый список каждую итерацию
private renderEnemies() {
    this.elEnemiesView.innerHTML = '';
    const list = createList();
    const details = createDetails();
    // ...
}
```

**Признак:** Неоправданное создание и удаление мусорных визуальных узлов, что приводит к "микрофризам" при частых переключениях.

**Решение:** Разделяйте сборку статичного каркаса и обновление изменяемых данных. Обновляйте только нужную часть (например, выделив `renderEnemyDetails()` отдельно от `renderEnemiesList()`).

---

### 10. Memory Leaks через Inline Closures в UI

**Ошибка:** Навешивание обработчиков событий прямо на свойства DOM-элемента (inline functions) при динамическом создании интерфейсов без последующей очистки.

```typescript
// ❌ Создает замыкание на `this`
this.elOverlay.onclick = () => this.hide(); 
// ...
public destroy() {
    this.elOverlay.remove(); // Удалили элемент из DOM, но не из памяти
}
```

**Признак:** Скрытые detached DOM-деревья в Heap Snapshot'ах (память постепенно растет), краши OOM после долгой игры из-за того, что замыкание функции удерживало класс (и связанные с ним тяжелые ресурсы, например `GameSession`).

**Решение:** Принудительно разрывайте замыкания в методе `destroy()`.

```typescript
// ✅ Разрыв ссылки на функцию перед удалением элемента
public destroy() {
    this.elOverlay.onclick = null;
    this.elOverlay.remove();
}
```

---

### 11. Перезапись пользовательских настроек при пересчёте статов

**Ошибка (реальная, из Tower.ts):**

```typescript
// ❌ Каждый пересчёт статов сбрасывает ручной выбор игрока!
this.targetingMode = mergedMods.targetingMode || 'first';
```

**Решение:**

```typescript
// ✅ Применять ТОЛЬКО если карта явно задаёт режим
if (mergedMods.targetingMode) this.targetingMode = mergedMods.targetingMode;
```

---

### 10. Object.freeze / spread в конфигурации vs hot-loop

**Не ошибка:** `Object.freeze` и spread (`{...config}`) в инициализации — это нормально (исполняется 1 раз).

**Ошибка:** Те же операции внутри `update()`/`render()` — создают GC-давление.

**Правило:** Если код вызывается 60 раз в секунду — никаких аллокаций.

---

### 11. dt из requestAnimationFrame напрямую в физику

**Ошибка:** `enemy.move(dt, ...)` с dt = 2000ms после tab-switch → враг телепортируется через полкарты.

**Решение:**

1. Глобальный clamp: `safeDt = Math.min(dt, 1/30)` в `Game.ts`
2. Sub-step для move: дробить на шаги по 1/60s в `EntityManager.updateEnemies()`

---

## 📋 Чеклист перед коммитом

- [ ] В hot-loop нет `new`, `{ }`, `.filter()`, `.map()`, `.splice()`?
- [ ] Canvas state откатывается? (globalAlpha, lineDash, fillStyle)
- [ ] `isAlive()` проверяется перед обращением к пул-объекту?
- [ ] Координаты drawImage округлены через `Math.round()`?
- [ ] Эффекты создаются через `spawn*()`, а не `add()`?
- [ ] dt ограничен? Нет tunneling при низком FPS?
- [ ] Каскадные операции (AoE, цепные реакции) используют очередь задержки (explosionQueue)?
