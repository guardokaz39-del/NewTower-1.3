import { detectLegacyWaypointType } from '../legacyWaypoints';

describe('legacy waypoint type detection', () => {
    it('detects fullpath when all steps are adjacent', () => {
        const points = [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 3, y: 2 },
        ];

        expect(detectLegacyWaypointType(points)).toBe('LEGACY_FULLPATH');
    });

    it('detects control points when path has jumps', () => {
        const points = [
            { x: 1, y: 1 },
            { x: 5, y: 1 },
            { x: 7, y: 6 },
        ];

        expect(detectLegacyWaypointType(points)).toBe('LEGACY_CONTROL_POINTS');
    });
});
