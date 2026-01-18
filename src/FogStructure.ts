/**
 * Fog Structure - represents a connected region of fog tiles
 */
export interface FogTile {
    x: number;
    y: number;
    density: number; // 0-5
}

export interface FogStructure {
    id: number;
    tiles: FogTile[];
    bounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
    // Animation state
    noiseOffsetX: number;
    noiseOffsetY: number;
    noiseOffsetRot: number;
}

/**
 * Build fog structures using flood-fill algorithm
 */
export function buildFogStructures(
    fogData: number[],
    width: number,
    height: number
): FogStructure[] {
    const structures: FogStructure[] = [];
    const visited = new Set<number>();
    let structureId = 0;

    const getIndex = (x: number, y: number) => y * width + x;
    const isValid = (x: number, y: number) =>
        x >= 0 && x < width && y >= 0 && y < height;

    // Flood fill from a starting point
    const floodFill = (startX: number, startY: number): FogTile[] => {
        const tiles: FogTile[] = [];
        const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
        const startIndex = getIndex(startX, startY);
        visited.add(startIndex);

        while (queue.length > 0) {
            const { x, y } = queue.shift()!;
            const density = fogData[getIndex(x, y)];

            tiles.push({ x, y, density });

            // Check 4 neighbors (N, S, E, W)
            const neighbors = [
                { x: x, y: y - 1 },
                { x: x, y: y + 1 },
                { x: x + 1, y: y },
                { x: x - 1, y: y },
            ];

            for (const neighbor of neighbors) {
                if (!isValid(neighbor.x, neighbor.y)) continue;

                const nIndex = getIndex(neighbor.x, neighbor.y);
                if (visited.has(nIndex)) continue;
                if (fogData[nIndex] === 0) continue; // No fog

                visited.add(nIndex);
                queue.push(neighbor);
            }
        }

        return tiles;
    };

    // Find all structures
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = getIndex(x, y);
            if (visited.has(index)) continue;
            if (fogData[index] === 0) continue; // No fog

            const tiles = floodFill(x, y);
            if (tiles.length === 0) continue;

            // Calculate bounds
            let minX = Infinity,
                maxX = -Infinity;
            let minY = Infinity,
                maxY = -Infinity;

            for (const tile of tiles) {
                minX = Math.min(minX, tile.x);
                maxX = Math.max(maxX, tile.x);
                minY = Math.min(minY, tile.y);
                maxY = Math.max(maxY, tile.y);
            }

            structures.push({
                id: structureId++,
                tiles,
                bounds: { minX, maxX, minY, maxY },
                noiseOffsetX: Math.random() * 1000,
                noiseOffsetY: Math.random() * 1000,
                noiseOffsetRot: Math.random() * 1000,
            });
        }
    }

    return structures;
}
