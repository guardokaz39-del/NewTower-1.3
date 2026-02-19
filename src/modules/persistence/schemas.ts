import { z } from './zodLite';

export const schemaVersion = 1;

export const waypointSchema = z.object({
    x: z.number(),
    y: z.number(),
});

export const waveEnemySchema = z.object({
    type: z.string(),
    count: z.number(),
    baseInterval: z.number().optional(),
    pattern: z.enum(['normal', 'random', 'swarm'] as const).optional(),
    spawnRate: z.enum(['fast', 'medium', 'slow'] as const).optional(),
    spawnPattern: z.enum(['normal', 'random', 'swarm'] as const).optional(),
    speed: z.number().optional(),
});

export const waveConfigSchema = z.object({
    enemies: z.array(waveEnemySchema),
});

export const mapObjectSchema = z.object({
    type: z.string(),
    x: z.number(),
    y: z.number(),
    properties: z.record(z.string(), z.unknown()).optional(),
    size: z.number().optional(),
});

export const mapSaveDataSchema = z.object({
    width: z.number(),
    height: z.number(),
    tiles: z.array(z.array(z.number())),
    waypoints: z.array(waypointSchema).optional(),
    route: z.object({
        controlPoints: z.array(waypointSchema),
    }).optional(),
    objects: z.array(mapObjectSchema),
    waves: z.array(waveConfigSchema).optional(),
    startingMoney: z.number().optional(),
    startingLives: z.number().optional(),
    manualPath: z.boolean().optional(),
    waypointsMode: z.enum(['ENDPOINTS', 'FULLPATH'] as const).optional(),
    fogData: z.array(z.number()).optional(),
    schemaVersion: z.number().optional(),
});

export const saveMetaSchema = z.object({
    id: z.string().min(1),
    namespace: z.string().min(1),
    updatedAt: z.string(),
    schemaVersion: z.number(),
});

export const mapSaveEnvelopeSchema = z.object({
    id: z.string().min(1),
    namespace: z.string().min(1),
    updatedAt: z.string(),
    schemaVersion: z.number(),
    data: mapSaveDataSchema,
});
