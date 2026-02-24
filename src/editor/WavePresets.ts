import { IWaveConfig } from '../MapData';

export interface IWavePreset {
    id: string;
    name: string;
    description: string;
    waves: IWaveConfig[];
}

const BUILTIN_PRESETS: IWavePreset[] = [
    {
        id: 'early_game',
        name: '🌱 Ранняя игра',
        description: '3 лёгкие волны',
        waves: [
            { enemies: [{ type: 'GRUNT', count: 5, pattern: 'normal', baseInterval: 0.8 }] },
            { enemies: [{ type: 'GRUNT', count: 7, pattern: 'normal', baseInterval: 0.7 }] },
            { enemies: [{ type: 'GRUNT', count: 8, pattern: 'normal', baseInterval: 0.6 }] }
        ]
    },
    {
        id: 'mid_game',
        name: '⚔️ Средняя игра',
        description: '5 волн, микс типов',
        waves: [
            { enemies: [{ type: 'GRUNT', count: 10, pattern: 'normal', baseInterval: 0.6 }] },
            { enemies: [{ type: 'SCOUT', count: 5, pattern: 'normal', baseInterval: 0.5 }] },
            { enemies: [{ type: 'GRUNT', count: 8, pattern: 'normal', baseInterval: 0.5 }, { type: 'SCOUT', count: 4, pattern: 'normal', baseInterval: 0.5, delayBefore: 2 }] },
            { enemies: [{ type: 'TANK', count: 2, pattern: 'normal', baseInterval: 0.8 }] },
            { enemies: [{ type: 'GRUNT', count: 15, pattern: 'swarm', baseInterval: 0.4 }] }
        ]
    },
    {
        id: 'boss_rush',
        name: '👑 Босс-раш',
        description: '3 волны с боссами',
        waves: [
            { waitForClear: true, bonusReward: 50, enemies: [{ type: 'boss', count: 1, pattern: 'normal', baseInterval: 1 }] },
            { waitForClear: true, bonusReward: 100, enemies: [{ type: 'TANK', count: 3, pattern: 'normal', baseInterval: 1 }, { type: 'boss', count: 1, pattern: 'normal', baseInterval: 1, delayBefore: 2 }] },
            { waitForClear: true, bonusReward: 200, enemies: [{ type: 'boss', count: 2, pattern: 'normal', baseInterval: 1.5 }] }
        ]
    },
    {
        id: 'swarm',
        name: '🐝 Рой',
        description: '4 волны быстрых врагов',
        waves: [
            { enemies: [{ type: 'SCOUT', count: 10, pattern: 'swarm', baseInterval: 0.15 }] },
            { enemies: [{ type: 'SCOUT', count: 15, pattern: 'swarm', baseInterval: 0.15 }] },
            { startDelay: 3, enemies: [{ type: 'SCOUT', count: 20, pattern: 'swarm', baseInterval: 0.15 }] },
            { startDelay: 3, enemies: [{ type: 'SCOUT', count: 25, pattern: 'swarm', baseInterval: 0.15 }] }
        ]
    },
    {
        id: 'endurance',
        name: '💀 Выживание',
        description: '8 нарастающих волн',
        waves: [
            { shuffleMode: 'none', enemies: [{ type: 'GRUNT', count: 10, pattern: 'normal', baseInterval: 0.6 }] },
            { shuffleMode: 'none', enemies: [{ type: 'SCOUT', count: 5, pattern: 'normal', baseInterval: 0.5 }] },
            { shuffleMode: 'none', enemies: [{ type: 'GRUNT', count: 15, pattern: 'normal', baseInterval: 0.5 }] },
            { shuffleMode: 'none', enemies: [{ type: 'TANK', count: 3, pattern: 'normal', baseInterval: 0.8 }] },
            { startDelay: 5, shuffleMode: 'none', enemies: [{ type: 'SCOUT', count: 15, pattern: 'swarm', baseInterval: 0.2 }] },
            { shuffleMode: 'none', enemies: [{ type: 'TANK', count: 5, pattern: 'normal', baseInterval: 0.7 }] },
            { shuffleMode: 'none', enemies: [{ type: 'boss', count: 1, pattern: 'normal', baseInterval: 1 }] },
            { shuffleMode: 'none', enemies: [{ type: 'GRUNT', count: 30, pattern: 'swarm', baseInterval: 0.2 }] }
        ]
    }
];

const CUSTOM_PRESETS_KEY = 'NEWTOWER_WAVE_PRESETS';

export function getBuiltinPresets(): IWavePreset[] {
    return JSON.parse(JSON.stringify(BUILTIN_PRESETS));
}

export function loadCustomPresets(): IWavePreset[] {
    try {
        const data = localStorage.getItem(CUSTOM_PRESETS_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to load custom presets', e);
    }
    return [];
}

export function saveCustomPreset(name: string, waves: IWaveConfig[]): void {
    const custom = loadCustomPresets();
    const id = 'custom_' + Date.now();

    // Ограничиваем длину имени
    const safeName = name.substring(0, 50);

    const preset: IWavePreset = {
        id,
        name: safeName,
        description: `Кастомный пресет (${waves.length} волн)`,
        waves: JSON.parse(JSON.stringify(waves))
    };
    custom.push(preset);

    try {
        localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(custom));
    } catch (e) {
        console.error('Failed to save to localStorage (quota exceeded?)', e);
        alert('Не удалось сохранить пресет. Не хватает памяти в localStorage.');
    }
}

export function deleteCustomPreset(id: string): void {
    const custom = loadCustomPresets();
    const filtered = custom.filter(p => p.id !== id);
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(filtered));
}
