import { describe, it, expect } from 'vitest';
import { resolveAllowedCards, migrateMapData, IMapData } from '../src/MapData';
import { CONFIG } from '../src/Config';

describe('MapData Helpers', () => {
    describe('resolveAllowedCards', () => {
        it('returns undefined when given undefined or null', () => {
            expect(resolveAllowedCards(undefined)).toBeUndefined();
            expect(resolveAllowedCards(null)).toBeUndefined();
        });

        it('returns undefined when given a non-array', () => {
            expect(resolveAllowedCards('FIRE')).toBeUndefined();
            expect(resolveAllowedCards({ fire: true })).toBeUndefined();
        });

        it('removes duplicates and invalid keys', () => {
            const raw = ['FIRE', 'GARBAGE_KEY', 'FIRE', 'ICE'];
            const result = resolveAllowedCards(raw);
            expect(result).toEqual(['FIRE', 'ICE']);
        });

        it('returns undefined if all valid keys are provided', () => {
            const allKeys = Object.keys(CONFIG.CARD_TYPES);
            expect(resolveAllowedCards([...allKeys, 'GARBAGE_KEY'])).toBeUndefined();
        });

        it('returns undefined if the resulting array is empty (fallback to all)', () => {
            expect(resolveAllowedCards([])).toBeUndefined();
            expect(resolveAllowedCards(['GARBAGE_KEY'])).toBeUndefined();
        });

        it('returns the subset array if valid subset is provided', () => {
            expect(resolveAllowedCards(['FIRE', 'ICE'])).toEqual(['FIRE', 'ICE']);
        });
    });

    describe('migrateMapData', () => {
        it('preserves allowedCards if it is a valid subset', () => {
            const raw: Partial<IMapData> = {
                width: 10, height: 10,
                tiles: [[0]],
                waypoints: [],
                allowedCards: ['FIRE', 'ICE']
            };
            const migrated = migrateMapData(raw);
            expect(migrated.allowedCards).toEqual(['FIRE', 'ICE']);
        });

        it('normalizes allowedCards to undefined if empty or invalid', () => {
            const raw: Partial<IMapData> = {
                width: 10, height: 10,
                tiles: [[0]],
                waypoints: [],
                allowedCards: ['GARBAGE_KEY']
            };
            const migrated = migrateMapData(raw);
            expect(migrated.allowedCards).toBeUndefined();
        });
    });
});
