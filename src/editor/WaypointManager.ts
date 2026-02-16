import { CONFIG } from '../Config';

export class WaypointManager {
    private start: { x: number; y: number } | null = null;
    private waypoints: { x: number; y: number }[] = [];
    private end: { x: number; y: number } | null = null;

    /**
     * Strict ordering: Start → WP1 → WP2 → ... → End
     */

    public setStart(pos: { x: number; y: number }): void {
        this.start = pos;
    }

    public setEnd(pos: { x: number; y: number }): void {
        this.end = pos;
    }

    public canAddWaypoint(): boolean {
        // Can only add waypoints if Start is set
        return this.start !== null;
    }

    public addWaypoint(pos: { x: number; y: number }): void {
        if (!this.canAddWaypoint()) {
            console.warn('Cannot add waypoint: Start point not set');
            return;
        }

        this.waypoints.push(pos);
    }

    public removeLastWaypoint(): void {
        this.waypoints.pop();
    }

    public clearAll(): void {
        this.start = null;
        this.waypoints = [];
        this.end = null;
    }

    public clearWaypoints(): void {
        this.waypoints = [];
    }

    public getStart(): { x: number; y: number } | null {
        return this.start;
    }

    public getEnd(): { x: number; y: number } | null {
        return this.end;
    }

    public getWaypoints(): { x: number; y: number }[] {
        return [...this.waypoints];
    }

    /**
     * Get full path: Start → WP1 → WP2 → ... → End
     */
    public getFullPath(): { x: number; y: number }[] {
        const path: { x: number; y: number }[] = [];

        if (this.start) path.push(this.start);
        path.push(...this.waypoints);
        if (this.end) path.push(this.end);

        return path;
    }

    public isValid(): boolean {
        // Valid if at least Start and End are set
        return this.start !== null && this.end !== null;
    }

    /**
     * Draw waypoints with lines and arrows
     */
    public draw(ctx: CanvasRenderingContext2D): void {
        const fullPath = this.getFullPath();

        if (fullPath.length < 2) {
            // Draw only start/end markers if they exist
            if (this.start) this.drawMarker(ctx, this.start, '🏁', '#00bcd4', 0);
            if (this.end) this.drawMarker(ctx, this.end, '🛑', '#e91e63', -1);
            return;
        }

        // Draw connecting lines with arrows
        ctx.strokeStyle = '#00ff00';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.lineWidth = 3;

        ctx.beginPath();
        for (let i = 0; i < fullPath.length; i++) {
            const wp = fullPath[i];
            const wpX = wp.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            const wpY = wp.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

            if (i === 0) {
                ctx.moveTo(wpX, wpY);
            } else {
                ctx.lineTo(wpX, wpY);
            }
        }
        ctx.stroke();

        // Draw arrows between points
        for (let i = 0; i < fullPath.length - 1; i++) {
            const from = fullPath[i];
            const to = fullPath[i + 1];
            this.drawArrow(ctx, from, to);
        }

        // Draw numbered waypoint markers
        fullPath.forEach((wp, idx) => {
            let label: string;
            let color: string;

            if (idx === 0) {
                // Start
                label = '🏁';
                color = '#00bcd4';
            } else if (idx === fullPath.length - 1) {
                // End
                label = '🛑';
                color = '#e91e63';
            } else {
                // Waypoint
                label = idx.toString();
                color = '#9c27b0';
            }

            this.drawMarker(ctx, wp, label, color, idx);
        });
    }

    private drawMarker(
        ctx: CanvasRenderingContext2D,
        pos: { x: number; y: number },
        label: string,
        color: string,
        index: number,
    ): void {
        const wpX = pos.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const wpY = pos.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        // Circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(wpX, wpY, 14, 0, Math.PI * 2);
        ctx.fill();

        // White border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, wpX, wpY);
    }

    private drawArrow(
        ctx: CanvasRenderingContext2D,
        from: { x: number; y: number },
        to: { x: number; y: number },
    ): void {
        const fromX = from.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const fromY = from.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const toX = to.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const toY = to.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        // Calculate angle
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // Arrow position (midpoint)
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;

        // Arrow size
        const arrowSize = 12;

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);

        // Draw arrow head
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize, -arrowSize / 2);
        ctx.lineTo(-arrowSize, arrowSize / 2);
        ctx.closePath();
        ctx.fill();

        // Arrow outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}
