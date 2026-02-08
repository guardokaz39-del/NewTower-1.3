/**
 * Event Bus Module
 * Decouples game systems using the Observer pattern.
 */

export type EventCallback<T = any> = (data: T) => void;

interface IEventSubscription {
    id: number;
    event: string;
    callback: EventCallback;
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
     * @param event Event name (use constants from Events object)
     * @param callback Function to call when event is emitted
     * @returns Subscription ID (can be used to unsubscribe)
     */
    public on<T = any>(event: string, callback: EventCallback<T>): number {
        const id = this.nextId++;
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)!.push({ id, event, callback });
        return id;
    }

    /**
     * Unsubscribe using the ID returned by on()
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
    public emit<T = any>(event: string, data?: T): void {
        const subs = this.subscribers.get(event);
        if (!subs) return;
        // Use for loop instead of forEach for hot path
        for (let i = 0; i < subs.length; i++) {
            subs[i].callback(data);
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
export const Events = {
    // Economy
    MONEY_CHANGED: 'MONEY_CHANGED', // data: number (new amount)
    LIVES_CHANGED: 'LIVES_CHANGED', // data: number (new amount)

    // Wave
    WAVE_STARTED: 'WAVE_STARTED',   // data: number (wave index)
    WAVE_COMPLETED: 'WAVE_COMPLETED', // data: number (wave index)

    // Game State
    GAME_OVER: 'GAME_OVER',         // data: number (final wave)
    GAME_RESTART: 'GAME_RESTART',   // void

    // UI
    TOGGLE_PAUSE: 'TOGGLE_PAUSE',   // data: boolean (isPaused)
    ENEMY_IMMUNE: 'ENEMY_IMMUNE',   // data: { x: number, y: number }
    ENEMY_DIED: 'ENEMY_DIED',       // data: { enemy: Enemy }
    ENEMY_SPAWNED: 'ENEMY_SPAWNED', // data: string (enemyType)
    SPAWN_PUDDLE: 'SPAWN_PUDDLE',   // data: { x: number, y: number }
};
