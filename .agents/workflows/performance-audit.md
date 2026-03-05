---
description: Workflow for performance audit — identifying and fixing CPU, memory, and GC issues
---

# Performance Audit Workflow

// turbo-all

## Когда запускать

- Перед каждым крупным релизом
- После добавления нового типа врага/башни
- При жалобах на фризы/лаги
- При добавлении нового визуального эффекта

---

## Шаги

### 1. Автоматический поиск hot-loop нарушений

```powershell
# Поиск анонимных объектов в update/render
cd src
npx grep -rn "\.add({" --include="*.ts" | findstr /V "test"
```

```powershell
# Поиск splice в горячих путях
npx grep -rn "\.splice(" --include="*.ts" | findstr /V "editor test Card Wave"
```

```powershell
# Поиск shadowBlur
npx grep -rn "shadowBlur" --include="*.ts"
```

```powershell
# Поиск createRadialGradient в render-путях
npx grep -rn "createRadialGradient" --include="*.ts" | findstr /V "AssetCache SpriteBaker"
```

### 2. Проверка AssetCache

```powershell
# Убедиться что все ключи используют toLowerCase
npx grep -rn "AssetCache\.get\|AssetCache\.has\|AssetCache\.peek" --include="*.ts"
```

Проверить:

- [ ] Все ключи дискретизированы (нет float-значений в ключах)
- [ ] Hard limit 4096 на месте
- [ ] `toLowerCase()` применяется

### 3. Проверка canvas state

```powershell
# Найти globalAlpha без восстановления
npx grep -rn "globalAlpha\s*=" --include="*.ts" | findstr /V "test"
```

```powershell
# Найти setLineDash без сброса
npx grep -rn "setLineDash" --include="*.ts"
```

Для каждого найденного файла проверить:

- [ ] `globalAlpha` восстанавливается (ручной откат или restore)
- [ ] `setLineDash([])` вызывается после использования
- [ ] `save()`/`restore()` используется для transform/composite

### 4. Проверка dt safety

```powershell
# Найти прямое использование dt без clamp
npx grep -rn "\.move(dt" --include="*.ts"
```

Проверить:

- [ ] dt clamped в Game.ts (safeDt ≤ 1/30)
- [ ] move() sub-stepped в EntityManager (MAX_MOVE_STEP = 1/60)

### 5. Проверка zombie references

```powershell
# Найти сохранение ссылок на сущности
npx grep -rn "this\.target\b" --include="*.ts" | findstr /V "test"
```

Проверить:

- [ ] Каждая ссылка на target имеет `isAlive()` + `finished` guard
- [ ] При возврате в пул (`reset()`) все ссылки обнуляются

### 6. Профилирование в браузере

```powershell
npm run dev
```

В Chrome DevTools:

1. **Performance tab** → Record 30 секунд на волне 10+
   - [ ] p95 frame < 16ms (desktop)
   - [ ] Нет GC-спайков > 5ms
2. **Memory tab** → Heap snapshot до и после 5 волн
   - [ ] Нет линейного роста (утечки)
   - [ ] AssetCache.size < 4096

### 7. Документирование результатов

При обнаружении проблемы:

1. Добавить в `.agents/COMMON_MISTAKES.md` с кодом до/после
2. Исправить по `/refactoring` workflow
