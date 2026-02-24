# Wave System & Determinism

Документ описывает систему волн, форматы данных и рантайм-контракты Wave Editor + WaveManager.

---

## 1. Детерминированная Симуляция

Для корректности лидербордов и реплеев симуляция ДОЛЖНА быть **детерминированной**. Один seed → один результат.

### Mulberry32 (PRNG)

`Math.random()` заменён на **Mulberry32** (32-bit seeded PRNG).

- **Scope:** ТОЛЬКО для симуляционной логики (спавн, крит, дроп, арбитраж таргетинга).
- **Визуальные эффекты** (частицы, тряска) могут использовать `Math.random()`.

```typescript
// ❌ Плохо
if (Math.random() < 0.5) spawnOrc();

// ✅ Хорошо
if (GameSession.rng.nextFloat() < 0.5) spawnOrc();
```

---

## 2. Форматы данных волн

### `IWaveConfig` (Хранение: `MapData.ts`)

```typescript
interface IWaveConfig {
    enemies: IWaveGroupRaw[];
    // Волновые метаданные (все опциональные для backward compat)
    name?: string;                              // «Волна Босса!»
    startDelay?: number;                        // Задержка перед стартом (сек)
    waitForClear?: boolean;                     // Блокировать стакинг волн
    bonusReward?: number;                       // Доп. золото за зачистку
    shuffleMode?: 'none' | 'within_group' | 'all'; // Контроль порядка спавна
}
```

### `IWaveGroupRaw` (Хранение: `MapData.ts`)

```typescript
interface IWaveGroupRaw {
    type: string;                   // ID врага ('GRUNT', 'boss', ...)
    count: number;                  // Количество
    baseInterval?: number;          // Интервал между спавнами (сек), default: 0.66
    pattern?: SpawnPattern;         // 'normal' | 'random' | 'swarm'
    delayBefore?: number;           // Пауза перед этой группой (сек)
    // Legacy (backward compat)
    spawnRate?: 'fast' | 'medium' | 'slow';
    spawnPattern?: SpawnPattern;    // Алиас для pattern
    speed?: number;                 // Устаревший множитель
}
```

### `IWaveGroup` (Рантайм: нормализованный)

WaveManager конвертирует `IWaveGroupRaw` → `IWaveGroup` через `normalizeWaveGroup()`. Все legacy-поля (`spawnRate`, `speed`) маппятся на канонические.

---

## 3. Нормализация: Контракт

### `normalizeWaveConfig()` — `Utils.ts`

> [!CAUTION]
> КРИТИЧНО: эта функция ОБЯЗАНА сохранять ВСЕ поля `IWaveConfig` и `IWaveGroupRaw`.
> Несохранённые поля УНИЧТОЖАЮТСЯ при save/load. См. pitfall #9.

При добавлении нового поля:

1. `IWaveConfig` / `IWaveGroupRaw` в `MapData.ts`
2. `normalizeWaveConfig()` в `Utils.ts` — preserve + clamp
3. `migrateMapData()` в `MapData.ts` — sanitize
4. Юнит-тест round-trip в `WaveModel.test.ts`

### `normalizeWaveGroup()` — `WaveManager.ts`

Конвертирует `IWaveGroupRaw` → `IWaveGroup` с жёсткими дефолтами:

| Поле | Дефолт | Источник |
|------|--------|----------|
| `baseInterval` | 0.66 | `spawnRate` маппинг или raw |
| `pattern` | `'normal'` | `pattern` или `spawnPattern` |
| `count` | 1 | clamp ≥ 1 |

---

## 4. Рантайм: `WaveManager.ts`

### DELAY_MARKER

Специальная запись в `spawnQueue` с `type = '__DELAY__'`. НЕ спавнит врага — только потребляет свой `interval`.

Используется для:

- `startDelay` (задержка перед всей волной)
- `delayBefore` (пауза перед группой)

### `shuffleMode`

| Значение | Поведение | Дефолт для |
|----------|-----------|-----------|
| `'all'` | Перемешать всю волну (RNG) | Старые карты (backward compat) |
| `'none'` | Группы спавнятся по порядку | Новые карты из WaveEditor |
| `'within_group'` | Перемешать внутри группы | Редко |

### `waitForClear`

Если `true` — `startWave()` игнорируется (стакинг заблокирован). UI должен дизейблить кнопку.

### `bonusReward`

Доп. золото при `endWave()`. Применяется к последней волне стека (Variant A).

### `WAVE_STARTED` Event

```typescript
// Тип payload: { wave: number; name?: string }
EventBus.getInstance().emit(Events.WAVE_STARTED, {
    wave: this.scene.wave,
    name: emitConfig?.name
});
```

Подписчики ОБЯЗАНЫ деструктурировать объект, а не принимать `number`:

- `GameHUD.ts` → `data.wave`
- `NotificationSystem.ts` → `data.wave`, `data.name`

---

## 5. Threat-модель

`ThreatService.ts` рассчитывает «Уровень Угрозы» каждой группы/волны:

```
Threat = (PowerRating × count) × patternMultiplier × densityMultiplier
```

- **DensityMultiplier:** зависит от `baseInterval` (короткий → выше угроза)
- **PatternMultiplier:** `normal: 1.0`, `random: 1.1`, `swarm: 1.5`
- **PowerRating:** `HP × SpeedFactor` из `EnemyRegistry`

Цвета: `<300` 🟢 → `<800` 🟡 → `<1500` 🟠 → `<2500` 🔴 → `>2500` 🟣
