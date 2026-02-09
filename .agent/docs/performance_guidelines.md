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

```typescript
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
            this.cache.set(key, Pathfinder.calculate(start, end));
        }
        return this.cache.get(key)!;
    }
    
    invalidate(): void {
        this.cache.clear();
    }
}
```

---

## 📊 Метрики и Бенчмарки

### Целевые показатели

| Метрика | Цель | Критический уровень |
|---------|------|---------------------|
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

*Последнее обновление: 2026-02-08*
