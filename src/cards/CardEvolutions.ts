/**
 * Card Evolution System — DRAMATICALLY DIFFERENT PATHS
 * 
 * Design Philosophy:
 * - Each path is a COMPLETELY different playstyle
 * - Not "slightly better X" but "X vs Y trade-off"
 * - Clear when to pick each path
 */

import { IUpgradeCard } from './CardType';

// ============================================================================
// Evolution Path Metadata
// ============================================================================

export interface IEvolutionPath {
    id: string;
    name: string;
    icon: string;
    description: string;
    playstyle: string;  // One-word descriptor
}

export interface IEvolutionChoice {
    cardTypeId: string;
    sourceLevel: number;
    sourceEvolution?: string;
    pathA: IEvolutionPath;
    pathB: IEvolutionPath;
}

// ============================================================================
// EVOLUTION UPGRADES — Dramatic Differences
// ============================================================================

export const EVOLUTION_UPGRADES: Record<string, Record<number, IUpgradeCard>> = {

    // =========================================================================
    // 🔥 FIRE EVOLUTIONS
    // =========================================================================

    // INFERNO — AoE NUKE: Huge splash, slow attack, obliterates groups
    'inferno': {
        2: {
            level: 2,
            modifiers: {
                damage: 35,                    // HIGH burst
                attackSpeedMultiplier: 0.65,   // VERY slow
            },
            effects: [{ type: 'splash', splashRadius: 120 }],  // HUGE AoE
            visualOverrides: { projectileType: 'fire', projectileColor: '#ff3d00' }
        },
    },

    // NAPALM — DOT MASTER: Low upfront, massive burn damage
    'napalm': {
        2: {
            level: 2,
            modifiers: {
                damage: 8,                     // LOW upfront
                attackSpeedMultiplier: 1.10,   // FASTER than base!
            },
            effects: [
                { type: 'splash', splashRadius: 35 },
                { type: 'burn', burnDps: 8, burnDuration: 4 }  // 32 total DoT!
            ],
            visualOverrides: { projectileType: 'fire', projectileColor: '#ff9100' }
        },
    },

    // Level 3 from INFERNO
    'meteor': {
        3: {
            level: 3,
            modifiers: {
                damage: 65,                    // MASSIVE
                attackSpeedMultiplier: 0.50,   // VERY slow
            },
            effects: [{ type: 'splash', splashRadius: 160 }],  // GIANT
            visualOverrides: { projectileType: 'fire', projectileColor: '#d50000' }
        },
    },
    'hellfire': {
        3: {
            level: 3,
            modifiers: {
                damage: 40,
                attackSpeedMultiplier: 0.75,
            },
            effects: [
                { type: 'splash', splashRadius: 100 },
                { type: 'explodeOnDeath', explosionDamagePercent: 0.75, explosionRadius: 60 }
            ],
            visualOverrides: { projectileType: 'fire', projectileColor: '#c51162' }
        },
    },

    // Level 3 from NAPALM
    'magma': {
        3: {
            level: 3,
            modifiers: {
                damage: 12,
                attackSpeedMultiplier: 1.0,
            },
            effects: [
                { type: 'splash', splashRadius: 45 },
                { type: 'burn', burnDps: 12, burnDuration: 5 }  // 60 DoT!
            ],
            visualOverrides: { projectileType: 'fire', projectileColor: '#ff6d00' }
        },
    },
    'scorch': {
        3: {
            level: 3,
            modifiers: {
                damage: 5,
                attackSpeedMultiplier: 1.25,   // FAST
            },
            effects: [
                { type: 'splash', splashRadius: 25 },
                { type: 'burn', burnDps: 6, burnDuration: 8 }  // 48 DoT, stacking
            ],
            visualOverrides: { projectileType: 'fire', projectileColor: '#ffab00' }
        },
    },

    // =========================================================================
    // ❄️ ICE EVOLUTIONS
    // =========================================================================

    // FROST — PURE CONTROL: Maximum slow, zero damage focus
    'frost': {
        2: {
            level: 2,
            modifiers: {
                damage: 0,                     // NO damage bonus
                rangeMultiplier: 0.70,         // Short range
            },
            effects: [{ type: 'slow', slowPower: 0.70, slowDuration: 6 }],  // 70%!
            visualOverrides: { projectileType: 'ice', projectileColor: '#40c4ff' }
        },
    },

    // SHATTER — ICE ASSASSIN: Damage dealer with execute
    'shatter': {
        2: {
            level: 2,
            modifiers: {
                damage: 15,                    // HIGH damage
                rangeMultiplier: 1.0,          // Normal range
            },
            effects: [{ type: 'slow', slowPower: 0.25, slowDuration: 2, damageToSlowed: 1.60 }],  // +60%!
            visualOverrides: { projectileType: 'ice', projectileColor: '#18ffff' }
        },
    },

    // Level 3 from FROST
    'absolutezero': {
        3: {
            level: 3,
            modifiers: {
                damage: 0,
                rangeMultiplier: 0.60,
            },
            effects: [{ type: 'slow', slowPower: 0.85, slowDuration: 8 }],  // 85% FROZEN
            visualOverrides: { projectileType: 'ice', projectileColor: '#00b0ff' }
        },
    },
    'blizzard': {
        3: {
            level: 3,
            modifiers: {
                damage: 3,
                rangeMultiplier: 0.75,
            },
            effects: [
                { type: 'slow', slowPower: 0.55, slowDuration: 5 },
                { type: 'chainSlowOnDeath', chainRadius: 100 }  // AoE control
            ],
            visualOverrides: { projectileType: 'ice', projectileColor: '#00e5ff' }
        },
    },

    // Level 3 from SHATTER
    'permafrost': {
        3: {
            level: 3,
            modifiers: {
                damage: 25,
                rangeMultiplier: 1.0,
            },
            effects: [{ type: 'slow', slowPower: 0.30, slowDuration: 2, damageToSlowed: 1.80 }],  // +80%!
            visualOverrides: { projectileType: 'ice', projectileColor: '#64ffda' }
        },
    },
    'glacier': {
        3: {
            level: 3,
            modifiers: {
                damage: 18,
                rangeMultiplier: 1.10,         // Extended range
            },
            effects: [
                { type: 'slow', slowPower: 0.35, slowDuration: 3, damageToSlowed: 1.50 },
                { type: 'chainSlowOnDeath', chainRadius: 70 }
            ],
            visualOverrides: { projectileType: 'ice', projectileColor: '#84ffff' }
        },
    },

    // =========================================================================
    // 🎯 SNIPER EVOLUTIONS
    // =========================================================================

    // PRECISION — BOSS KILLER: Extreme single-target, very slow
    'precision': {
        2: {
            level: 2,
            modifiers: {
                damage: 40,                    // HIGH
                range: 180,
                attackSpeedMultiplier: 0.25,   // VERY slow
                critChance: 0.30,              // 30% crit
            },
            effects: [],
            visualOverrides: { projectileType: 'sniper', projectileColor: '#76ff03' }
        },
    },

    // PENETRATOR — LINE CLEARER: Pierce many, faster shots
    'penetrator': {
        2: {
            level: 2,
            modifiers: {
                damage: 12,                    // Lower per hit
                range: 200,
                attackSpeedMultiplier: 0.55,   // Faster
                critChance: 0.10,
            },
            effects: [{ type: 'pierce', pierceCount: 3, pierceDamageLoss: 0.10 }],
            visualOverrides: { projectileType: 'sniper', projectileColor: '#b2ff59' }
        },
    },

    // Level 3 from PRECISION
    'executor': {
        3: {
            level: 3,
            modifiers: {
                damage: 70,                    // MASSIVE
                range: 220,
                attackSpeedMultiplier: 0.20,   // SNAIL
                critChance: 0.40,              // 40% crit x3.0
            },
            effects: [],
            visualOverrides: { projectileType: 'sniper', projectileColor: '#64dd17' }
        },
    },
    'headhunter': {
        3: {
            level: 3,
            modifiers: {
                damage: 55,
                range: 200,
                attackSpeedMultiplier: 0.30,
                critChance: 0.25,
            },
            effects: [],  // +100% vs >70% HP targets (handled in damage system)
            visualOverrides: { projectileType: 'sniper', projectileColor: '#aeea00' }
        },
    },

    // Level 3 from PENETRATOR
    'railgun': {
        3: {
            level: 3,
            modifiers: {
                damage: 18,
                range: 300,                    // EXTREME range
                attackSpeedMultiplier: 0.50,
                critChance: 0.10,
            },
            effects: [{ type: 'pierce', pierceCount: 6, pierceDamageLoss: 0.05 }],  // Pierce 6!
            visualOverrides: { projectileType: 'sniper', projectileColor: '#eeff41' }
        },
    },
    'marksman': {
        3: {
            level: 3,
            modifiers: {
                damage: 30,
                range: 240,
                attackSpeedMultiplier: 0.45,
                critChance: 0.20,
            },
            effects: [{ type: 'pierce', pierceCount: 4, pierceDamageLoss: 0.08 }],
            visualOverrides: { projectileType: 'sniper', projectileColor: '#c6ff00' }
        },
    },

    // =========================================================================
    // 💥 MULTISHOT EVOLUTIONS
    // =========================================================================

    // BARRAGE — SPRAY AND PRAY: Many projectiles, wide spread
    'barrage': {
        2: {
            level: 2,
            modifiers: {
                damageMultiplier: 0.40,        // Low per projectile
            },
            effects: [],  // 4 projectiles, 60° spread
        },
    },

    // SPREAD — FOCUSED MULTI: Fewer but stronger projectiles
    'spread': {
        2: {
            level: 2,
            modifiers: {
                damageMultiplier: 0.85,        // High per projectile
            },
            effects: [],  // 2 projectiles, 20° spread, slight homing
        },
    },

    // Level 3 from BARRAGE
    'storm': {
        3: {
            level: 3,
            modifiers: {
                damageMultiplier: 0.30,
            },
            effects: [],  // 6 projectiles, 90° spread
        },
    },
    'volley': {
        3: {
            level: 3,
            modifiers: {
                damageMultiplier: 0.45,
                attackSpeedMultiplier: 1.30,   // FAST reload
            },
            effects: [],  // 4 projectiles
        },
    },

    // Level 3 from SPREAD
    'homing': {
        3: {
            level: 3,
            modifiers: {
                damageMultiplier: 0.70,
            },
            effects: [],  // 3 projectiles, full homing
        },
    },
    'twin': {
        3: {
            level: 3,
            modifiers: {
                damageMultiplier: 1.0,         // Full damage each
                attackSpeedMultiplier: 0.80,
            },
            effects: [],  // 2 projectiles, each hits TWICE
        },
    },

    // =========================================================================
    // ⚡ MINIGUN EVOLUTIONS
    // =========================================================================

    // CHAINGUN — QUICK BURSTER: Fast ramp, short sustained
    'chaingun': {
        2: {
            level: 2,
            modifiers: {
                damageMultiplier: 0.60,
                attackSpeedMultiplier: 3.0,    // VERY fast
            },
            effects: [{
                type: 'spinup',
                spinupDamagePerSecond: 8,      // FAST ramp
                maxSpinupSeconds: 3,           // Short window
                overheatDuration: 0.5,         // Quick recovery
            }],
            visualOverrides: { projectileType: 'minigun', projectileColor: '#e0e0e0' }
        },
    },

    // GATLING — SUSTAINED BEAST: Slow ramp, massive sustained
    'gatling': {
        2: {
            level: 2,
            modifiers: {
                damageMultiplier: 0.55,
                attackSpeedMultiplier: 2.60,
            },
            effects: [{
                type: 'spinup',
                spinupDamagePerSecond: 4,      // Slow ramp
                maxSpinupSeconds: 10,          // LONG sustain!
                overheatDuration: 2.5,         // Painful recovery
            }],
            visualOverrides: { projectileType: 'minigun', projectileColor: '#bdbdbd' }
        },
    },

    // Level 3 from CHAINGUN
    'autocannon': {
        3: {
            level: 3,
            modifiers: {
                damageMultiplier: 0.75,
                attackSpeedMultiplier: 2.8,
            },
            effects: [{
                type: 'spinup',
                spinupDamagePerSecond: 6,
                maxSpinupSeconds: 999,         // NO OVERHEAT!
                overheatDuration: 0,
            }],
            visualOverrides: { projectileType: 'minigun', projectileColor: '#90a4ae' }
        },
    },
    'rotary': {
        3: {
            level: 3,
            modifiers: {
                damageMultiplier: 0.55,
                attackSpeedMultiplier: 3.5,    // INSANE speed
            },
            effects: [{
                type: 'spinup',
                spinupDamagePerSecond: 10,     // FAST ramp
                spinupCritPerSecond: 0.05,     // 5% crit per second!
                maxSpinupSeconds: 2.5,
                overheatDuration: 0.3,
            }],
            visualOverrides: { projectileType: 'minigun', projectileColor: '#ff8a80' }
        },
    },

    // Level 3 from GATLING
    'devastator': {
        3: {
            level: 3,
            modifiers: {
                damageMultiplier: 0.70,
                attackSpeedMultiplier: 2.5,
            },
            effects: [{
                type: 'spinup',
                spinupSteps: [
                    { threshold: 2, damage: 10 },
                    { threshold: 4, damage: 25 },
                    { threshold: 6, damage: 45 },
                    { threshold: 8, damage: 70 },
                    { threshold: 10, damage: 100 },  // MASSIVE at max
                ],
                spinupCritPerSecond: 0.02,
                maxSpinupSeconds: 12,
                overheatDuration: 4,
            }],
            visualOverrides: { projectileType: 'minigun', projectileColor: '#ffab40' }
        },
    },
    'suppressor': {
        3: {
            level: 3,
            modifiers: {
                damageMultiplier: 0.60,
                attackSpeedMultiplier: 2.8,
            },
            effects: [{
                type: 'spinup',
                spinupDamagePerSecond: 5,
                maxSpinupSeconds: 8,
                overheatDuration: 2,
                // At max spinup: 20% slow to targets (handled in damage system)
            }],
            visualOverrides: { projectileType: 'minigun', projectileColor: '#ce93d8' }
        },
    },
};

// ============================================================================
// Evolution Choice Registry
// ============================================================================

export const EVOLUTION_CHOICES: IEvolutionChoice[] = [
    // === FIRE ===
    {
        cardTypeId: 'fire',
        sourceLevel: 1,
        pathA: { id: 'inferno', name: 'Инферно', icon: '🌋', description: 'Огромный AoE взрыв', playstyle: 'НЮКА' },
        pathB: { id: 'napalm', name: 'Напалм', icon: '🔥', description: 'Горение 32 урона', playstyle: 'DOT' },
    },
    {
        cardTypeId: 'fire',
        sourceLevel: 2,
        sourceEvolution: 'inferno',
        pathA: { id: 'meteor', name: 'Метеор', icon: '☄️', description: 'Гигантский взрыв 160px', playstyle: 'MEGA' },
        pathB: { id: 'hellfire', name: 'Адское пламя', icon: '👹', description: 'Враги взрываются', playstyle: 'CHAIN' },
    },
    {
        cardTypeId: 'fire',
        sourceLevel: 2,
        sourceEvolution: 'napalm',
        pathA: { id: 'magma', name: 'Магма', icon: '🌊', description: '60 DoT урона', playstyle: 'BURN' },
        pathB: { id: 'scorch', name: 'Выжигание', icon: '🔥', description: 'Быстрый стакающийся DoT', playstyle: 'STACK' },
    },

    // === ICE ===
    {
        cardTypeId: 'ice',
        sourceLevel: 1,
        pathA: { id: 'frost', name: 'Мороз', icon: '❄️', description: '70% замедление', playstyle: 'КОНТРОЛЬ' },
        pathB: { id: 'shatter', name: 'Раскол', icon: '💎', description: '+60% урон по slow', playstyle: 'УБИЙЦА' },
    },
    {
        cardTypeId: 'ice',
        sourceLevel: 2,
        sourceEvolution: 'frost',
        pathA: { id: 'absolutezero', name: 'Абс. Ноль', icon: '🧊', description: '85% СТОП', playstyle: 'FREEZE' },
        pathB: { id: 'blizzard', name: 'Буран', icon: '🌨️', description: 'Цепной slow', playstyle: 'AOE CC' },
    },
    {
        cardTypeId: 'ice',
        sourceLevel: 2,
        sourceEvolution: 'shatter',
        pathA: { id: 'permafrost', name: 'Вечная мерзлота', icon: '💠', description: '+80% урон!', playstyle: 'EXECUTE' },
        pathB: { id: 'glacier', name: 'Ледник', icon: '🏔️', description: 'Дальность + chain', playstyle: 'HYBRID' },
    },

    // === SNIPER ===
    {
        cardTypeId: 'sniper',
        sourceLevel: 1,
        pathA: { id: 'precision', name: 'Точность', icon: '🎯', description: '30% крит, медленно', playstyle: 'БОСС' },
        pathB: { id: 'penetrator', name: 'Пробивание', icon: '🔫', description: 'Pierce 3 врагов', playstyle: 'ЛИНИЯ' },
    },
    {
        cardTypeId: 'sniper',
        sourceLevel: 2,
        sourceEvolution: 'precision',
        pathA: { id: 'executor', name: 'Палач', icon: '⚔️', description: '40% крит x3.0', playstyle: 'DELETE' },
        pathB: { id: 'headhunter', name: 'Охотник', icon: '🎭', description: '+100% vs здоровых', playstyle: 'PRIORITY' },
    },
    {
        cardTypeId: 'sniper',
        sourceLevel: 2,
        sourceEvolution: 'penetrator',
        pathA: { id: 'railgun', name: 'Рельсотрон', icon: '⚡', description: 'Pierce 6, дальность', playstyle: 'LASER' },
        pathB: { id: 'marksman', name: 'Стрелок', icon: '🏹', description: 'Pierce 4 + крит', playstyle: 'BALANCED' },
    },

    // === MULTISHOT ===
    {
        cardTypeId: 'multi',
        sourceLevel: 1,
        pathA: { id: 'barrage', name: 'Шквал', icon: '💥', description: '4 снаряда, веер', playstyle: 'SPREAD' },
        pathB: { id: 'spread', name: 'Рассеивание', icon: '🎯', description: '2 мощных снаряда', playstyle: 'FOCUS' },
    },
    {
        cardTypeId: 'multi',
        sourceLevel: 2,
        sourceEvolution: 'barrage',
        pathA: { id: 'storm', name: 'Шторм', icon: '🌪️', description: '6 снарядов!', playstyle: 'CHAOS' },
        pathB: { id: 'volley', name: 'Залп', icon: '🎆', description: 'Быстрая перезарядка', playstyle: 'SPAM' },
    },
    {
        cardTypeId: 'multi',
        sourceLevel: 2,
        sourceEvolution: 'spread',
        pathA: { id: 'homing', name: 'Самонаведение', icon: '🎯', description: '3 наводящихся', playstyle: 'TRACK' },
        pathB: { id: 'twin', name: 'Близнецы', icon: '👯', description: '2 x двойной удар', playstyle: 'DOUBLE' },
    },

    // === MINIGUN ===
    {
        cardTypeId: 'minigun',
        sourceLevel: 1,
        pathA: { id: 'chaingun', name: 'Цепная пушка', icon: '⚡', description: 'Быстрый разгон 3с', playstyle: 'BURST' },
        pathB: { id: 'gatling', name: 'Гатлинг', icon: '💪', description: 'Долгий огонь 10с', playstyle: 'SUSTAIN' },
    },
    {
        cardTypeId: 'minigun',
        sourceLevel: 2,
        sourceEvolution: 'chaingun',
        pathA: { id: 'autocannon', name: 'Автопушка', icon: '🔧', description: 'БЕЗ перегрева!', playstyle: 'INFINITE' },
        pathB: { id: 'rotary', name: 'Ротор', icon: '🌀', description: '3.5x скорость + крит', playstyle: 'SPEED' },
    },
    {
        cardTypeId: 'minigun',
        sourceLevel: 2,
        sourceEvolution: 'gatling',
        pathA: { id: 'devastator', name: 'Опустошитель', icon: '💀', description: '+100 урон на макс', playstyle: 'RAMPAGE' },
        pathB: { id: 'suppressor', name: 'Подавитель', icon: '🛡️', description: 'Slow на макс разгоне', playstyle: 'CONTROL' },
    },
];

// ============================================================================
// Display Config for Cards
// ============================================================================

export const EVOLUTION_STATS_DISPLAY: Record<string, { primary: string; secondary: string; color: string }> = {
    // Fire
    'inferno': { primary: '💥 x120 AoE', secondary: '-35% скорость', color: '#ff3d00' },
    'napalm': { primary: '🔥 32 DoT', secondary: '+10% скорость', color: '#ff9100' },
    'meteor': { primary: '☄️ x160 MEGA', secondary: '-50% скорость', color: '#d50000' },
    'hellfire': { primary: '👹 Взрыв', secondary: '75% урона', color: '#c51162' },
    'magma': { primary: '🌊 60 DoT', secondary: '12 dps x 5s', color: '#ff6d00' },
    'scorch': { primary: '🔥 СТАКИ', secondary: '+25% скорость', color: '#ffab00' },

    // Ice
    'frost': { primary: '❄️ 70% СТОП', secondary: '0 урона', color: '#40c4ff' },
    'shatter': { primary: '💎 +60%', secondary: 'vs замедл.', color: '#18ffff' },
    'absolutezero': { primary: '🧊 85% FREEZE', secondary: '0 урона', color: '#00b0ff' },
    'blizzard': { primary: '🌨️ Цепь', secondary: '100px радиус', color: '#00e5ff' },
    'permafrost': { primary: '💠 +80%!', secondary: 'Казнь врагов', color: '#64ffda' },
    'glacier': { primary: '🏔️ Дальность', secondary: '+10% range', color: '#84ffff' },

    // Sniper
    'precision': { primary: '🎯 30% крит', secondary: 'x2.5 множитель', color: '#76ff03' },
    'penetrator': { primary: '🔫 Pierce 3', secondary: '-10% за цель', color: '#b2ff59' },
    'executor': { primary: '⚔️ 40% крит', secondary: 'x3.0 DELETE', color: '#64dd17' },
    'headhunter': { primary: '🎭 +100%', secondary: 'vs >70% HP', color: '#aeea00' },
    'railgun': { primary: '⚡ Pierce 6', secondary: '300 range', color: '#eeff41' },
    'marksman': { primary: '🏹 Pierce 4', secondary: '20% крит', color: '#c6ff00' },

    // Multishot
    'barrage': { primary: '💥 4 снаряда', secondary: '60° веер', color: '#ea80fc' },
    'spread': { primary: '🎯 2 мощных', secondary: '85% урон', color: '#b388ff' },
    'storm': { primary: '🌪️ 6 снарядов', secondary: '90° хаос', color: '#e040fb' },
    'volley': { primary: '🎆 +30% APS', secondary: '4 снаряда', color: '#d500f9' },
    'homing': { primary: '🎯 Наведение', secondary: '3 снаряда', color: '#7c4dff' },
    'twin': { primary: '👯 x2 удар', secondary: '100% урон', color: '#651fff' },

    // Minigun
    'chaingun': { primary: '⚡ 3с огонь', secondary: '+8 dps/с', color: '#e0e0e0' },
    'gatling': { primary: '💪 10с огонь', secondary: '+4 dps/с', color: '#bdbdbd' },
    'autocannon': { primary: '🔧 ∞ ОГОНЬ', secondary: 'Без перегрева', color: '#90a4ae' },
    'rotary': { primary: '🌀 x3.5 speed', secondary: '+5% крит/с', color: '#ff8a80' },
    'devastator': { primary: '💀 +100 урон', secondary: 'На макс', color: '#ffab40' },
    'suppressor': { primary: '🛡️ 20% slow', secondary: 'На макс', color: '#ce93d8' },
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getEvolutionChoice(cardTypeId: string, sourceLevel: number, sourceEvolution?: string): IEvolutionChoice | null {
    const evo = sourceEvolution || 'classic';

    return EVOLUTION_CHOICES.find(choice =>
        choice.cardTypeId === cardTypeId &&
        choice.sourceLevel === sourceLevel &&
        (choice.sourceEvolution === undefined || choice.sourceEvolution === evo)
    ) || null;
}

export function getEvolutionUpgrade(evolutionPath: string | undefined, level: number): IUpgradeCard | null {
    if (!evolutionPath || evolutionPath === 'classic') {
        return null;
    }
    return EVOLUTION_UPGRADES[evolutionPath]?.[level] || null;
}

export function getEvolutionMeta(evolutionPath: string): IEvolutionPath | null {
    for (const choice of EVOLUTION_CHOICES) {
        if (choice.pathA.id === evolutionPath) return choice.pathA;
        if (choice.pathB.id === evolutionPath) return choice.pathB;
    }
    return null;
}

export function getEvolutionDisplay(evolutionPath: string): { primary: string; secondary: string; color: string } | null {
    return EVOLUTION_STATS_DISPLAY[evolutionPath] || null;
}
