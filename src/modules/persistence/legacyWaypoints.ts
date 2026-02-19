export type LegacyWaypointType = 'LEGACY_FULLPATH' | 'LEGACY_CONTROL_POINTS';

export function detectLegacyWaypointType(points: { x: number; y: number }[]): LegacyWaypointType {
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (dist !== 1) {
            return 'LEGACY_CONTROL_POINTS';
        }
    }
    return 'LEGACY_FULLPATH';
}
