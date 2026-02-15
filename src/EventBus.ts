/**
 * Event Bus Module
 * Decouples game systems using the Observer pattern.
 */

export interface EventPayloadMap {
    // Economy
    MONEY_CHANGED: number;
    LIVES_CHANGED: number;

    // Wave
    WAVE_STARTED: number;
    WAVE_COMPLETED: number;

    // Game State
    GAME_OVER: number;
    GAME_RESTART: void;
    TOGGLE_PAUSE: boolean;

    // Entities
    ENEMY_IMMUNE: { x: number; y: number };
    ENEMY_DIED: { enemy: any }; // Using any to avoid circular dependency with Enemy for now, or use interface
    ENEMY_SPAWNED: string;
    SPAWN_PUDDLE: { x: number; y: number };

    // Boss Mechanics
    ENEMY_SPLIT: { enemy: any; threshold: number };
    ENEMY_DEATH_SPAWN: { enemy: any; spawns: string[] };

    // Cards (Phase 6.C)
    CARD_DROPPED: { card: any; x: number; y: number; actionId?: string }; // card is ICard
}

export type EventCallback<T> = (data: T) => void;

interface IEventSubscription {
    id: number;
    event: string;
    callback: EventCallback<any>;
}

export class EventBus {
    private static instance: EventBus;
    private subscribers: Map<string, IEventSubscription[]> = new Map();
    private nextId: number = 0;

    private constructor() { }

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /**
     * Subscribe to an event
     * @returns Unsubscribe function
     */
    public on<K extends keyof EventPayloadMap>(event: K, callback: EventCallback<EventPayloadMap[K]>): () => void {
        const id = this.nextId++;
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)!.push({ id, event, callback });

        // Return unsubscribe function
        return () => this.off(id);
    }

    /**
     * Unsubscribe using the ID (Deprecated, use returned function from on())
     */
    public off(id: number): void {
        // Optimized: iterate with for loop instead of forEach
        const events = this.subscribers.keys();
        for (const event of events) {
            const subs = this.subscribers.get(event)!;
            for (let i = 0; i < subs.length; i++) {
                if (subs[i].id === id) {
                    subs.splice(i, 1);
                    return; // Found and removed, exit early
                }
            }
        }
    }

    /**
     * Emit an event with data
     */
    public emit<K extends keyof EventPayloadMap>(event: K, data: EventPayloadMap[K]): void {
        const subs = this.subscribers.get(event);
        if (!subs) return;
        // Use for loop instead of forEach for hot path
        // Clone array to avoid issues if subscribers remove themselves during emit
        const safeSubs = [...subs];
        for (let i = 0; i < safeSubs.length; i++) {
            safeSubs[i].callback(data);
        }
    }

    /**
     * Clear all subscribers (useful for scene transitions)
     */
    public clear(): void {
        this.subscribers.clear();
    }
}

// Define Event Constants for type safety type feeling
// Legacy Events object kept for reference if needed, but prefer string literals with types
export const Events = {
    MONEY_CHANGED: 'MONEY_CHANGED',
    LIVES_CHANGED: 'LIVES_CHANGED',
    WAVE_STARTED: 'WAVE_STARTED',
    WAVE_COMPLETED: 'WAVE_COMPLETED',
    GAME_OVER: 'GAME_OVER',
    GAME_RESTART: 'GAME_RESTART',
    TOGGLE_PAUSE: 'TOGGLE_PAUSE',
    ENEMY_IMMUNE: 'ENEMY_IMMUNE',
    ENEMY_DIED: 'ENEMY_DIED',
    ENEMY_SPAWNED: 'ENEMY_SPAWNED',
    SPAWN_PUDDLE: 'SPAWN_PUDDLE',
    ENEMY_SPLIT: 'ENEMY_SPLIT',
    ENEMY_DEATH_SPAWN: 'ENEMY_DEATH_SPAWN',
    CARD_DROPPED: 'CARD_DROPPED'
} as const;
