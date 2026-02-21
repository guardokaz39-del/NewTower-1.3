import { describe, test, expect } from 'vitest';
import { Card, CardType } from '../src/Card';

describe('Card System', () => {
    const testConfig = {
        id: 't1',
        name: 'Test Tower',
        description: 'Desc',
        cost: 100,
        type: CardType.TOWER,
        value: 10
    };

    test('Upgrade mechanic works', () => {
        const card = new Card(testConfig);
        card.upgrade();
        expect(card.level).toBe(2);
        expect(card.cost).toBe(150); // 100 * 1.5
    });
});