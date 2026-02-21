import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, Events } from '../src/EventBus';

describe('EventBus Mechanics', () => {
    beforeEach(() => {
        EventBus.getInstance().clear();
    });

    it('should correctly subscribe, emit and unsubscribe without leaking handlers', () => {
        const bus = EventBus.getInstance();
        let triggerCount = 0;

        const handler = () => { triggerCount++; };

        // Subscribe 10 times
        const unsubs = [];
        for (let i = 0; i < 10; i++) {
            unsubs.push(bus.on(Events.ENEMY_DIED, handler));
        }

        bus.emit(Events.ENEMY_DIED, {} as any);
        expect(triggerCount).toBe(10);

        // Unsubscribe all
        unsubs.forEach(unsub => unsub());

        triggerCount = 0;
        bus.emit(Events.ENEMY_DIED, {} as any);
        expect(triggerCount).toBe(0); // No leaks
    });
});
