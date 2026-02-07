/**
 * Death Animation System
 * 
 * Модульная система анимаций смерти врагов по архетипам.
 * Использует существующий EffectSystem для рендеринга.
 * 
 * Структура готова к масштабированию:
 * - Аниматоры можно выносить в /animators/*.ts
 * - Хелперы переиспользуются между аниматорами
 */

import { EffectSystem } from '../EffectSystem';
import { Enemy } from '../Enemy';
import { IEnemyTypeConfig } from '../types';
import { IDeathAnimator } from './types';

// ============================================
// РЕЕСТР АНИМАТОРОВ
// ============================================

const ANIMATORS: Record<string, IDeathAnimator> = {
    SKELETON: playBoneScatter,
    SKELETON_COMMANDER: playGoldBones,
    HELLHOUND: playFireBurst,
    ORC: playHeavyDebris,
    WRAITH: playGhostDissolve,
    GOBLIN: playSmallDebris,
    SPIDER: playAcidPop,
    TROLL: playIceShatter,
    MAGMA: playLavaPop,
    RAT: playDefaultDeath,
    WOLF: playDefaultDeath,
};

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================

/**
 * Воспроизвести анимацию смерти врага.
 * Выбирает аниматор по архетипу из конфига.
 */
export function playDeathAnimation(
    effects: EffectSystem,
    enemy: Enemy,
    config: IEnemyTypeConfig | undefined
): void {
    const archetype = config?.archetype || 'SKELETON';
    const animator = ANIMATORS[archetype] || playDefaultDeath;

    // Создаём fallback конфиг если не передан
    const safeConfig: IEnemyTypeConfig = config || {
        id: enemy.typeId,
        name: 'Unknown',
        symbol: '?',
        hpMod: 1,
        speed: 60,
        reward: 5,
        color: '#888888',
        desc: '',
    };

    animator(effects, enemy.x, enemy.y, safeConfig);
}

// ============================================
// АНИМАТОРЫ (готовы к выносу в отдельные файлы)
// ============================================

/** Базовая анимация — обломки по цвету врага */
function playDefaultDeath(e: EffectSystem, x: number, y: number, c: IEnemyTypeConfig) {
    addDebris(e, x, y, 5, c.color || '#888', 200, 120);
}

/** Скелет — белые кости + пыль */
function playBoneScatter(e: EffectSystem, x: number, y: number, _c: IEnemyTypeConfig) {
    addDebris(e, x, y, 6, '#e0d0b0', 280, 180); // Кости
    addDust(e, x, y, 3, 'rgba(180,160,140,0.5)');
}

/** Командир скелетов — золотые кости + сияние */
function playGoldBones(e: EffectSystem, x: number, y: number, _c: IEnemyTypeConfig) {
    addDebris(e, x, y, 5, '#ffd700', 260, 160);
    addDust(e, x, y, 2, 'rgba(255,215,0,0.3)');
}

/** Адская гончая — огонь + угли */
function playFireBurst(e: EffectSystem, x: number, y: number, _c: IEnemyTypeConfig) {
    addDebris(e, x, y, 5, '#ff6d00', 200, 120);
    addEmbers(e, x, y, 5, '#ffab00');
}

/** Орк — тяжёлые крупные обломки */
function playHeavyDebris(e: EffectSystem, x: number, y: number, c: IEnemyTypeConfig) {
    addDebris(e, x, y, 5, c.color || '#558b2f', 160, 80, 4);
}

/** Призрак — души улетают вверх */
function playGhostDissolve(e: EffectSystem, x: number, y: number, _c: IEnemyTypeConfig) {
    addSoulOrbs(e, x, y, 6, '#7c4dff');
}

/** Гоблин — мелкие обломки */
function playSmallDebris(e: EffectSystem, x: number, y: number, c: IEnemyTypeConfig) {
    addDebris(e, x, y, 4, c.color || '#689f38', 150, 100, 2);
}

/** Паук — кислотные брызги */
function playAcidPop(e: EffectSystem, x: number, y: number, _c: IEnemyTypeConfig) {
    addDebris(e, x, y, 3, '#76ff03', 120, 60, 2);
    addDust(e, x, y, 2, 'rgba(118,255,3,0.3)');
}

/** Тролль — ледяные осколки */
function playIceShatter(e: EffectSystem, x: number, y: number, _c: IEnemyTypeConfig) {
    addDebris(e, x, y, 5, '#90caf9', 220, 140);
}

/** Магма — лава + дым остывания */
function playLavaPop(e: EffectSystem, x: number, y: number, _c: IEnemyTypeConfig) {
    addDebris(e, x, y, 4, '#ff3d00', 180, 100);
    addDust(e, x, y, 2, 'rgba(50,50,50,0.5)');
}

// ============================================
// ХЕЛПЕРЫ
// ============================================

/**
 * Добавить разлетающиеся обломки
 */
function addDebris(
    e: EffectSystem,
    x: number,
    y: number,
    count: number,
    color: string,
    vxRange: number,
    vyBase: number,
    size = 4
) {
    for (let i = 0; i < count; i++) {
        e.add({
            type: 'debris',
            x,
            y,
            vx: (Math.random() - 0.5) * vxRange * 1.5,
            vy: -(Math.random() * vyBase + vyBase * 0.8),
            life: 0.5 + Math.random() * 0.2,
            size: size + Math.random() * 3,
            color,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 15,
            gravity: 500,
        });
    }
}

/**
 * Добавить пыль/дым (мягкие частицы)
 */
function addDust(
    e: EffectSystem,
    x: number,
    y: number,
    count: number,
    color: string
) {
    for (let i = 0; i < count; i++) {
        e.add({
            type: 'particle',
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 15,
            vx: (Math.random() - 0.5) * 50,
            vy: -20 - Math.random() * 40,
            life: 0.4 + Math.random() * 0.2,
            radius: 6 + Math.random() * 6,
            color,
        });
    }
}

/**
 * Добавить угли/искры (огненные частицы)
 */
function addEmbers(
    e: EffectSystem,
    x: number,
    y: number,
    count: number,
    color: string
) {
    for (let i = 0; i < count; i++) {
        e.add({
            type: 'particle',
            x,
            y,
            vx: (Math.random() - 0.5) * 120,
            vy: -(Math.random() * 100 + 60),
            life: 0.5 + Math.random() * 0.3,
            radius: 3 + Math.random() * 2,
            color,
        });
    }
}

/**
 * Добавить души/орбы (призрачные частицы вверх)
 */
function addSoulOrbs(
    e: EffectSystem,
    x: number,
    y: number,
    count: number,
    color: string
) {
    for (let i = 0; i < count; i++) {
        e.add({
            type: 'particle',
            x: x + (Math.random() - 0.5) * 30,
            y,
            vx: (Math.random() - 0.5) * 60,
            vy: -(Math.random() * 120 + 80),
            life: 0.7 + Math.random() * 0.3,
            radius: 5 + Math.random() * 3,
            color,
        });
    }
}
