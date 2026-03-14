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

### 12. AssetCache.getGlow с динамическим цветом (Cache-Bouncing)

**Ошибка:** Передача вычисляемого RGB-цвета в `AssetCache.getGlow()` — ключ `glow_${color}_${size}` формируется каждый кадр с новым значением → бесконечный рост кэша → hard limit 4096 → полный `clear()` → GC spike.

```typescript
// ❌ Interpolated color = бесконечные ключи
const r = Math.floor(livesRatio * 255);
const glow = AssetCache.getGlow(`rgba(${r},0,0,1)`, 128);
```

**Решение:** Дискретная палитра (фиксированные ключи, max N записей в кэше):

```typescript
// ✅ Max 4 записи в кэше
const PALETTE = ['rgba(0,120,255,1)', 'rgba(120,120,255,1)', 'rgba(255,160,80,1)', 'rgba(255,60,60,1)'];
const stage = Math.min(3, Math.floor((1 - ratio) * 4));
const glow = AssetCache.getGlow(PALETTE[stage], 128);
```

---

### 13. EventBus подписки без lifecycle-очистки

**Ошибка:** `EventBus.getInstance().on(...)` без сохранения unsubscribe-функции → подписка живёт вечно → при рестарте уровня дублируется → listener count растёт.

```typescript
// ❌ Утечка: новая подписка при каждом рестарте
EventBus.getInstance().on(Events.LIVES_CHANGED, (lives) => {...});
```

**Решение:** Все подписки ОБЯЗАНЫ идти через `this.unsubs.push(...)`, очистка в `onExitImpl()`:

```typescript
// ✅ Паттерн из GameScene
this.unsubs.push(EventBus.getInstance().on(Events.LIVES_CHANGED, (lives: number) => {
    this.map.setLivesRatio(lives / this.gameState.startingLives);
}));

// onExitImpl()
this.unsubs.forEach(u => u());
this.unsubs = [];
```

**Тест:** Рестарт уровня 3 раза → DevTools → EventListeners count не растёт.

---

### 14. Phantom Freeze: Event без подписчика

**Ошибка:** Эмиссия критического игрового события (`GAME_OVER`, `WAVE_START`), на которое никто не подписан.

**Признак:** Игра "зависает" без ошибок в консоли. Например, `GameState.loseLife()` ставит `isRunning = false` и шлёт `GAME_OVER`, но если сцена его не слушает, цикл `update` останавливается, а UI конца игры не появляется.

**Решение:** Каждое системное событие, меняющее `isRunning`, ОБЯЗАНО иметь активного подписчика в текущей сцене.

---

### 15. Double State Trigger (Race Condition)

**Ошибка:** Вызов тяжелой логики (Save, Show UI, Transition) без проверки флага завершения, когда несколько сущностей триггерят одно условие в один кадр.

**Признак:** 3 врага зашли в базу в один кадр -> 3 вызова `saveProgress()`, 3 вызова `ui.showGameOver()`.

**Решение:** Локальный флаг-гард (`gameEnded: boolean`) в методе-обработчике.

```typescript
// ✅ Правильно
public gameOver() {
    if (this.gameEnded) return;
    this.gameEnded = true;
    // ... logic
}
```

---

## 📋 Чеклист перед коммитом

- [ ] В hot-loop нет `new`, `{ }`, `.filter()`, `.map()`, `.splice()`?
- [ ] Canvas state откатывается? (globalAlpha, lineDash, fillStyle)
- [ ] `isAlive()` проверяется перед обращением к пул-объекту?
- [ ] Координаты drawImage округлены через `Math.round()`?
- [ ] Эффекты создаются через `spawn*()`, а не `add()`?
- [ ] dt ограничен? Нет tunneling при низком FPS?
- [ ] Каскадные операции (AoE, цепные реакции) используют очередь задержки (explosionQueue)?
- [ ] `AssetCache.getGlow()` вызывается ТОЛЬКО с фиксированными цветами (палитра)?
- [ ] Каждая `EventBus.on(...)` обёрнута в `this.unsubs.push(...)`?
- [ ] При добавлении рендера в `Map.ts` — обновлены ОБЕ сцены (GameScene + EditorScene)?
