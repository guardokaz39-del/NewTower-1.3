import { mapSaveEnvelopeSchema, schemaVersion } from '../src/modules/persistence/schemas';

describe('persistence schemas', () => {
    it('validates a valid map save envelope', () => {
        const result = mapSaveEnvelopeSchema.safeParse({
            id: 'map-1',
            namespace: 'maps',
            updatedAt: new Date().toISOString(),
            schemaVersion,
            data: {
                width: 2,
                height: 2,
                tiles: [[0, 1], [1, 0]],
                waypoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                objects: [],
            },
        });

        expect(result.success).toBe(true);
    });

    it('rejects invalid save envelope', () => {
        const result = mapSaveEnvelopeSchema.safeParse({
            id: '',
            namespace: 'maps',
            updatedAt: new Date().toISOString(),
            schemaVersion,
            data: { width: 2 },
        });

        expect(result.success).toBe(false);
    });
});
