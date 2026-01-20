import { CONFIG } from './Config';
import { VISUALS } from './VisualConfig';

/**
 * ObjectRenderer - programmatic rendering for map objects
 * Supports 5 object types: stone, rock, tree, wheat, flowers
 * Designed to be easily replaced with asset-based rendering later
 */

export type ObjectType = 'stone' | 'rock' | 'tree' | 'wheat' | 'flowers';

export class ObjectRenderer {
    /**
     * Draw an object at specified pixel coordinates
     * @param ctx Canvas rendering context
     * @param type Object type
     * @param x Pixel x coordinate
     * @param y Pixel y coordinate
     * @param size Tile size (1 for most objects, 2-3 for rocks)
     */
    static draw(ctx: CanvasRenderingContext2D, type: ObjectType, x: number, y: number, size: number = 1): void {
        const TS = CONFIG.TILE_SIZE;

        switch (type) {
            case 'stone':
                this.drawStone(ctx, x, y, TS);
                break;
            case 'rock':
                this.drawRock(ctx, x, y, TS, size);
                break;
            case 'tree':
                this.drawTree(ctx, x, y, TS);
                break;
            case 'wheat':
                this.drawWheat(ctx, x, y, TS);
                break;
            case 'flowers':
                this.drawFlowers(ctx, x, y, TS);
                break;
        }
    }

    /**
     * Draw small stones (1 tile)
     * Phase 5: Uses global light direction from VISUALS.LIGHTING
     */
    private static drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number): void {
        const centerX = x + TS / 2;
        const centerY = y + TS / 2;

        // Draw 2-3 small gray stones
        const stoneCount = 2 + Math.floor((x + y) % 2);

        for (let i = 0; i < stoneCount; i++) {
            const offsetX = ((x + i * 17) % 30) - 15;
            const offsetY = ((y + i * 23) % 30) - 15;
            const radius = 6 + ((x + y + i) % 4);

            // Stone shadow (uses global light direction)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Slightly darker
            ctx.beginPath();
            ctx.ellipse(
                centerX + offsetX + VISUALS.LIGHTING.SHADOW_OFFSET_X,
                centerY + offsetY + VISUALS.LIGHTING.SHADOW_OFFSET_Y,
                radius, radius * 0.8, 0, 0, Math.PI * 2
            );
            ctx.fill();

            // Stone body
            ctx.fillStyle = '#757575';
            ctx.beginPath();
            ctx.ellipse(centerX + offsetX, centerY + offsetY, radius, radius * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Highlight (opposite direction from shadow)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Brighter
            ctx.beginPath();
            ctx.ellipse(
                centerX + offsetX + VISUALS.LIGHTING.HIGHLIGHT_OFFSET_X,
                centerY + offsetY + VISUALS.LIGHTING.HIGHLIGHT_OFFSET_Y,
                radius * 0.4, radius * 0.3, 0, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    /**
     * Draw large rocks (2-3 tiles) with varied shapes
     * Phase 5: Uses global light direction
     */
    private static drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number, size: number): void {
        const width = size * TS;
        const height = size * TS;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // More varied vertices based on size and position
        const vertices = 5 + (size - 1) + ((x + y) % 3);

        // Create pseudo-random but deterministic variations
        const seed = x * 73 + y * 137;

        // Shadow with varied shape
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        for (let i = 0; i < vertices; i++) {
            const angle = (i / vertices) * Math.PI * 2;
            const variance = ((seed + i * 43) % 20) - 10; // -10 to +10
            const radius = width * 0.35 + variance;
            const angleOffset = ((seed + i * 23) % 30 - 15) * 0.01; // Small angle variation
            const px = centerX + Math.cos(angle + angleOffset) * radius + 4;
            const py = centerY + Math.sin(angle + angleOffset) * radius + 4;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Rock body with varied color
        const grayVariance = ((seed % 30) - 15);
        const grayValue = 97 + grayVariance; // Around #616161
        ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
        ctx.beginPath();
        for (let i = 0; i < vertices; i++) {
            const angle = (i / vertices) * Math.PI * 2;
            const variance = ((seed + i * 43) % 20) - 10;
            const radius = width * 0.35 + variance;
            const angleOffset = ((seed + i * 23) % 30 - 15) * 0.01;
            const px = centerX + Math.cos(angle + angleOffset) * radius;
            const py = centerY + Math.sin(angle + angleOffset) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Add varied texture lines
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 1 + (size - 1) * 0.5;
        const lineCount = 2 + ((seed % 4));
        for (let i = 0; i < lineCount; i++) {
            const startAngle = ((seed + i * 67) % 360) * Math.PI / 180;
            const endAngle = startAngle + (Math.PI / 4) + ((seed + i) % 20) * 0.05;
            const r1 = width * (0.1 + ((seed + i * 13) % 10) * 0.01);
            const r2 = width * (0.25 + ((seed + i * 17) % 15) * 0.01);
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(startAngle) * r1, centerY + Math.sin(startAngle) * r1);
            ctx.lineTo(centerX + Math.cos(endAngle) * r2, centerY + Math.sin(endAngle) * r2);
            ctx.stroke();
        }

        // Varied highlight position
        const highlightX = centerX - width * 0.15 + ((seed % 20) - 10);
        const highlightY = centerY - height * 0.15 + ((seed % 15) - 7);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(highlightX, highlightY, width * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw tree (1 tile)
     * Phase 5: Uses global light direction, gradient trunk, layered foliage
     */
    private static drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number): void {
        const centerX = x + TS / 2;
        const bottomY = y + TS - 5;

        // Trunk shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(centerX - 6, bottomY - 25, 14, 28);

        // Trunk
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(centerX - 5, bottomY - 25, 10, 25);

        // Foliage shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(centerX + 3, bottomY - 20, 18, 0, Math.PI * 2);
        ctx.fill();

        // Foliage (3 circles for depth)
        const foliageColors = ['#1b5e20', '#2e7d32', '#388e3c'];
        const foliageOffsets = [
            { x: -5, y: -5, r: 14 },
            { x: 5, y: -3, r: 16 },
            { x: 0, y: -10, r: 15 }
        ];

        foliageOffsets.forEach((offset, i) => {
            ctx.fillStyle = foliageColors[i];
            ctx.beginPath();
            ctx.arc(centerX + offset.x, bottomY - 20 + offset.y, offset.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Draw wheat field (1 tile)
     */
    private static drawWheat(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number): void {
        // Background (darker gold)
        ctx.fillStyle = '#f9a825';
        ctx.fillRect(x, y, TS, TS);

        // Wheat stalks pattern
        ctx.strokeStyle = '#fbc02d';
        ctx.lineWidth = 2;

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const stalkX = x + col * (TS / 4) + (TS / 8);
                const stalkY = y + row * (TS / 4) + (TS / 8);
                const offset = ((row + col) % 2) * 3;

                // Stalk
                ctx.beginPath();
                ctx.moveTo(stalkX, stalkY + 10);
                ctx.lineTo(stalkX + offset, stalkY - 2);
                ctx.stroke();

                // Wheat head
                ctx.fillStyle = '#ffeb3b';
                ctx.beginPath();
                ctx.ellipse(stalkX + offset, stalkY - 4, 3, 5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Border for definition
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TS, TS);
    }

    /**
     * Draw flowering grass (1 tile) - grass colored with varied flowers
     */
    private static drawFlowers(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number): void {
        // Grass background (SAME as normal grass - no yellow!)
        ctx.fillStyle = '#8bc34a';
        ctx.fillRect(x, y, TS, TS);

        // Subtle grid like grass tiles
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TS, TS);

        // Deterministic seed for this tile
        const seed = x * 73 + y * 137;

        // More flowers with varied sizes
        const flowerColors = ['#e91e63', '#9c27b0', '#2196f3', '#ff9800', '#f44336', '#fff'];
        const flowerCount = 10 + (seed % 8); // 10-17 flowers

        for (let i = 0; i < flowerCount; i++) {
            const fx = x + ((seed * 7 + i * 13) % TS);
            const fy = y + ((seed * 11 + i * 19) % TS);
            const colorIdx = (seed + i * 3) % flowerColors.length;
            const flowerSize = 1.5 + ((seed + i * 7) % 10) * 0.15; // Varied sizes

            // Flower petals (4-6 petals randomly)
            const petalCount = 4 + ((seed + i) % 3);
            ctx.fillStyle = flowerColors[colorIdx];
            for (let p = 0; p < petalCount; p++) {
                const angle = (p / petalCount) * Math.PI * 2;
                const petalDist = 2 + flowerSize;
                const petalX = fx + Math.cos(angle) * petalDist;
                const petalY = fy + Math.sin(angle) * petalDist;
                ctx.beginPath();
                ctx.arc(petalX, petalY, flowerSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // Center (varied color - yellow or white)
            ctx.fillStyle = ((seed + i) % 2 === 0) ? '#ffd54f' : '#fff';
            ctx.beginPath();
            ctx.arc(fx, fy, flowerSize * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
