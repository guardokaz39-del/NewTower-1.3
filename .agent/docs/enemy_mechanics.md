# 👾 Enemy Mechanics & Special Abilities

## 1. Общая Концепция

Враги имеют **уникальные механики** в зависимости от архетипа. Это делает каждого врага стратегически важным и добавляет глубину геймплею.

---

## 2. Базовые Параметры

Все враги имеют следующие характеристики:

| Параметр | Описание | Расчет |
|----------|----------|--------|
| **HP** | Здоровье | `BASE_HP * hpMod * (HP_GROWTH ^ wave)` |
| **Speed** | Скорость движения | Пикселей/секунду (config) |
| **Armor** | Броня | Уменьшает урон на фиксированное значение |
| **Reward** | Награда за убийство | Золото |
| **Scale** | Визуальный масштаб | Множитель размера (0.9 - 1.5) |

**Формула HP роста:**

```typescript
const HP = baseHP * enemy.hpMod * Math.pow(hpGrowth, waveNumber);
```

---

## 2a. Логика Передвижения (Flow Field)

Начиная с версии 1.4, враги используют **Vector Flow Field** вместо поиска пути A*.

### Особенности

1. **Zero-Allocation Movement**: Векторы движения читаются из глобального поля, не создавая мусора (GC friendly).
2. **Steering Behaviors**: Враги плавно поворачивают и стремятся держаться центра тайла.
3. **Soft Collisions**: Враги могут слегка отталкиваться друг от друга (опционально, Phase 8+).

### Урон по Базе

Враг наносит урон базе **только** при достижении центра целевого тайла (`distance < 5px`).
Если враг застрял на границе базы, срабатывает механика принудительного дотягивания (`forceCenter`).

```typescript
// Enemy.ts
if (dist < 5) {
    this.finished = true; // Наносит урона
} else if (onTargetTile) {
    // Принудительное движение к центру, даже если вектор поля = 0
    moveToCenter();
}
```

---

## 3. Статус-Эффекты

### 🧊 SLOW (Замедление)

**Источник:** ICE карты

| Параметр | Описание |
|----------|----------|
| `slowPower` | Процент замедления (0.3 = 30%) |
| `slowDuration` | Длительность (секунды) |
| `damageToSlowed` | Бонусный урон к замедленным |

**Механика:**

```typescript
effectiveSpeed = baseSpeed * (1 - slowPower);
// Пример: 90 speed * (1 - 0.7) = 27 speed
```

**Стакинг:** Только самое сильное замедление активно (не складываются)

---

### 🔥 BURN (Горение)

**Источник:** FIRE карты (Napalm, Magma эволюции — через `CollisionSystem.ts`)

| Параметр | Значение |
|----------|----------|
| Урон | `burnDamage` DPS (из `IStatus.damage`) |
| Применение | `CollisionSystem` вызывает `enemy.applyStatus({ type: 'burn', ... })` |
| Тик | `Enemy.update(dt)` уменьшает HP каждый кадр |

**Механика (Реализовано):**

```typescript
// В Enemy.ts update(dt)
const burnStatus = this.statuses.find(s => s.type === 'burn');
if (burnStatus && burnStatus.damage) {
    this.currentHealth -= burnStatus.damage * dt;
}
```

**Стакинг:** Только последний примененный burn активен (перезаписывает предыдущий)

**Визуальный эффект:** Огненные частицы вокруг врага

---

## 4. Специальные Способности

### 👻 BOSS — Spectral Shift (Призрак Пустоты)

**Концепция:** Становится неуязвимым на определенных порогах HP

**Механика:**

| HP порог | Длительность щита | Эффект |
|----------|-------------------|--------|
| 80% | 3 секунды | Invulnerable |
| 50% | 5 секунд | Invulnerable |
| 20% | 8 секунд | Invulnerable |

**Реализация:**

```typescript
// В Enemy.ts
if (currentHpPercent <= threshold && !thresholdUsed) {
    this.isInvulnerable = true;
    this.shieldTimer = duration;
    // Visual: "BLOCKED" text
}

// В takeDamage()
if (this.isInvulnerable) {
    EventBus.emit(Events.ENEMY_IMMUNE, { x, y });
    return; // No damage
}
```

**Контрплей:**

- Ждать окончания щита
- Переключиться на других врагов

---

### 🌋 MAGMA_KING — Molten Armor Shedding

**Концепция:** Сбрасывает куски брони при получении урона, превращается в статую при смерти

**Механика:**

| HP порог | Событие |
|----------|---------|
| 75% | Spawn 1x MAGMA_STATUE |
| 50% | Spawn 1x MAGMA_STATUE |
| 25% | Spawn 1x MAGMA_STATUE |

**Реализация:**

```typescript
// В Enemy.takeDamage()
if (currentHpPercent <= threshold) {
    EventBus.emit('ENEMY_SPLIT', { enemy: this, threshold });
    // GameScene spawns MAGMA_STATUE at enemy position
}
```

**Характеристики статуи:**

- HP: 8.0x modifier (очень прочная)
- Speed: 1 (почти не двигается)
- Armor: 15 (высокая защита)
- Reward: 0 (не дает награды)
- `isHidden: true` (не показывается в Wave Editor)

**Визуальный эффект:** Остывшая лавовая кора отваливается

---

### 🗿 MAGMA_STATUE — Maximum Threat Priority

**Концепция:** Остывшая оболочка босса, имеет **максимальный приоритет** для башен

**Механика:**

```typescript
this.threatPriority = 999; // Towers prioritize this enemy

// In Tower targeting logic
enemies.sort((a, b) => b.threatPriority - a.threatPriority);
```

**Эффект:** Все башни **обязаны** стрелять по статуе, игнорируя других врагов

**Контрплей:**

- Построить достаточно башен, чтобы убить статую и других врагов одновременно

---

### 🧟 FLESH_COLOSSUS — Death Spawns (Троянский Конь)

**Концепция:** При смерти из тела вырываются враги

**Механика:**

```typescript
// В Enemies.ts
FLESH_COLOSSUS: {
    ...
    deathSpawns: ['GRUNT', 'GRUNT', 'SCOUT']
}

// При смерти
if (enemy.deathSpawns) {
    for (const spawnId of enemy.deathSpawns) {
        spawnEnemy(spawnId, enemy.x, enemy.y);
    }
}
```

**Награда:**

- Colossus сам не дает награды (`reward: 0`)
- Награды идут от spawned врагов (2 скелета + 1 гончая)

**Визуальный эффект:** Тело разрывается, враги вываливаются наружу

---

### 👑 SKELETON_COMMANDER — Strength from Fallen

**Концепция:** Становится сильнее, когда рядом умирают союзники

**Механика (TO BE IMPLEMENTED):**

```typescript
// Идея:
onAllyDeath(allyPosition) {
    if (distance(this, ally) < 200) {
        this.damageModifier += 0.1; // +10% урон за каждую смерть
        // Visual: Soul absorption effect
    }
}
```

**Текущий статус:** Визуальная модель готова, механика не реализована

---

### 🕷️ SPIDER_POISON — Healing Pool on Death

**Концепция:** Оставляет лечащую лужу после смерти

**Механика (TO BE IMPLEMENTED):**

```typescript
// Идея:
onDeath() {
    createHealingPool({
        x: this.x,
        y: this.y,
        radius: 80,
        healPerSecond: 5,
        duration: 8 // seconds
    });
}
```

**Эффект:** Враги, проходящие через лужу, восстанавливают HP

**Контрплей:**

- Убивать паука вдали от пути других врагов
- Быстро убивать врагов, пока они в луже

---

### 🐀 RAT (SAPPER_RAT) — Suicide Bomber

**Концепция:** Взрывается при смерти, нанося урон **ВСЕМ** (включая врагов и башни)

**Механика (TO BE IMPLEMENTED):**

```typescript
onDeath() {
    const explosion = {
        x: this.x,
        y: this.y,
        radius: 120,
        damage: 50 // Flat damage
    };
    
    // Damage ALL enemies in radius
    for (const enemy of nearbyEnemies) {
        enemy.takeDamage(explosion.damage);
    }
    
    // Damage ALL towers in radius
    for (const tower of nearbyTowers) {
        tower.takeDamage(explosion.damage);
    }
}
```

**Визуальный эффект:**

- Горящий фитиль при движении
- Большой взрыв при смерти (particles, shockwave)

**Контрплей:**

- Убивать вдали от башен
- Использовать дальнобойные снайперы

---

### 👺 GOBLIN — Loot Carrier

**Концепция:** Несет мешок с бонусами

**Механика (TO BE IMPLEMENTED):**

```typescript
onDeath() {
    const bonusGold = this.reward * 2; // Double reward
    // OR
    dropCard(); // Chance to drop extra card
}
```

**Визуальный признак:** Мешок на спине

---

## 5. Паттерны Спавна

Определены в `WaveManager.ts`:

### NORMAL — Стандартный спавн

```typescript
spawnInterval = 1.5 seconds
// Равномерный поток врагов
```

### RANDOM — Случайные волны

```typescript
spawnInterval = random(0.5, 3.0) seconds
// Непредсказуемые промежутки
```

### SWARM — Рой

```typescript
spawnInterval = 0.3 seconds
// Быстрая массовая атака
```

---

## 6. Балансировка

### Формула сложности врага

```typescript
difficulty = (HP * Speed * (1 + Armor/10)) / Reward
```

### Примеры

| Враг | HP | Speed | Armor | Reward | Difficulty |
|------|-----|-------|-------|--------|------------|
| GRUNT | 30 | 90 | 0 | 4 | 675 |
| SCOUT | 21 | 168 | 0 | 2 | 1764 |
| TANK | 91 | 68 | 0 | 10 | 619 |
| BOSS | 750 | 40 | 0 | 300 | 100 |

**Цель:** Все враги должны иметь схожую "difficulty per reward"

---

## 7. Технические Детали

### Структура Enemy

```typescript
class Enemy {
    // Base stats
    currentHealth: number;
    maxHealth: number;
    baseSpeed: number;
    armor: number;
    reward: number;
    
    // Status effects
    statuses: IStatus[];
    damageModifier: number;
    
    // Boss mechanics
    isInvulnerable: boolean;
    shieldTimer: number;
    thresholds: { p: number, d: number, used: boolean }[];
    
    // Magma mechanics
    threatPriority: number;
    spawnThresholds: number[];
    
    // Death tracking
    killedByProjectile: Projectile | null;
}
```

### Инициализация механик

```typescript
// В Enemy.setType()
if (id === 'boss') {
    this.thresholds = [
        { p: 0.8, d: 3.0, used: false },
        { p: 0.5, d: 5.0, used: false },
        { p: 0.2, d: 8.0, used: false }
    ];
} else if (id === 'magma_king') {
    this.spawnThresholds = [0.75, 0.5, 0.25];
} else if (id === 'magma_statue') {
    this.threatPriority = 999;
}
```

---

## 8. Event System

Враги используют EventBus для триггеров:

### События

| Событие | Когда | Данные |
|---------|-------|--------|
| `ENEMY_DEATH` | При смерти | `{ enemy, killedBy }` |
| `ENEMY_SPLIT` | Magma spawn | `{ enemy, threshold }` |
| `ENEMY_IMMUNE` | Заблокирован урон | `{ x, y }` |
| `ENEMY_REACHED_END` | Дошел до базы | `{ enemy }` |

**Пример:**

```typescript
EventBus.getInstance().emit(Events.ENEMY_DEATH, {
    enemy: this,
    killedBy: this.killedByProjectile
});
```

---

## 9. Визуальные Индикаторы

### Hit Flash (мигание при уроне)

```typescript
this.hitFlashTimer = 0.15; // seconds

// In render:
if (hitFlashTimer > 0) {
    ctx.globalAlpha = 0.5 + Math.sin(t * 30) * 0.5;
}
```

### Invulnerability Shield

```typescript
if (isInvulnerable) {
    // Purple glow
    ctx.shadowColor = '#9c27b0';
    ctx.shadowBlur = 20;
    
    // Shield ring animation
    drawShieldRing(ctx, x, y, t);
}
```

### Status Icons

```typescript
// Slow effect
if (hasSlowStatus) {
    drawIcon(ctx, '❄️', x, y - 20);
}

// Burn effect
if (hasBurnStatus) {
    drawFireParticles(ctx, x, y);
}
```

---

## 10. Планируемые Механики

### TODO: Реализовать

| Враг | Механика | Приоритет |
|------|----------|-----------|
| SKELETON_COMMANDER | Soul absorption | Средний |
| SPIDER_POISON | Healing pool | Средний |
| SAPPER_RAT | Suicide explosion | Высокий |
| GOBLIN | Bonus loot | Низкий |
| TROLL_ARMORED | Damage reduction | Средний |

### TODO: Визуальные эффекты

- [ ] Shield break animation
- [ ] Statue spawn effect (lava shedding)
- [ ] Explosion shockwave визуализация
- [ ] Healing pool (green particles)
- [ ] Soul absorption effect

---

## 11. Примеры Стратегий

### Against BOSS (Wraith)

1. Фокус урона в безопасные периоды (между щитами)
2. АоЕ башни для других врагов во время щита
3. Приготовиться к финальному 8-сек щиту на 20% HP

### Against MAGMA_KING

1. Высокий burst damage, чтобы не дать spawned статуям
2. Sniper башни для быстрого убийства статуй
3. Fire башни для AoE на группу статуй

### Against FLESH_COLOSSUS

1. Убить **до** того, как дойдет до базы
2. Подготовить башни на spawned врагов (2 скелета + гончая)
3. Ice tower для замедления перед смертью

---

## 12. Код-Референсы

### Ключевые файлы

| Файл | Назначение |
|------|------------|
| `Enemy.ts` | Базовый класс врага |
| `config/Enemies.ts` | Конфигурация типов |
| `WaveManager.ts` | Спавн логика |
| `GameScene.ts` | Обработка событий |

### Ключевые методы

```typescript
// Enemy.ts
takeDamage(amount, projectile?)
applyStatus(status: IStatus)
activateShield(duration)
update(dt: number)

// WaveManager.ts
spawnWave(waveNumber)
getEnemyConfigForWave(enemyId, wave)
```
