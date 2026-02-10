import { Tower, SlotState } from '../Tower';
import { CONFIG } from '../Config';
import { VISUALS } from '../VisualConfig';
import { Assets } from '../Assets';

export class TowerMenu {
    // Configuration
    private static readonly RADIUS = 32;
    private static readonly SAT_SIZE = 14;

    // Satellite positions (relative to center)
    private static readonly ANGLES = [
        -Math.PI / 2,       // -90 deg (Top)
        Math.PI / 6,        // 30 deg (Bottom Right)
        Math.PI * 5 / 6     // 150 deg (Bottom Left)
    ];

    public static draw(ctx: CanvasRenderingContext2D, tower: Tower) {
        if (!tower) return;

        // Draw connecting lines first
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        this.ANGLES.forEach((angle, index) => {
            const sx = tower.x + Math.cos(angle) * this.RADIUS;
            const sy = tower.y + Math.sin(angle) * this.RADIUS;

            ctx.beginPath();
            ctx.moveTo(tower.x, tower.y);
            ctx.lineTo(sx, sy);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        // Draw Satellites
        this.ANGLES.forEach((angle, index) => {
            const sx = tower.x + Math.cos(angle) * this.RADIUS;
            const sy = tower.y + Math.sin(angle) * this.RADIUS;
            const slot = tower.slots.find(s => s.id === index);

            this.drawSatellite(ctx, sx, sy, slot, index, tower.selectedSlotId === index);
        });
    }

    private static drawSatellite(ctx: CanvasRenderingContext2D, x: number, y: number, slot: SlotState | undefined, index: number, isSelected: boolean) {
        const r = this.SAT_SIZE;

        // Background
        ctx.fillStyle = isSelected ? '#444' : '#222';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = isSelected ? '#0f0' : (slot?.isLocked ? '#666' : '#fff');
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();

        // Content
        if (slot?.isLocked) {
            // LOCK ICON
            this.drawLock(ctx, x, y, r); // Pass radius for scaling

            // Price Tag
            const price = CONFIG.ECONOMY.SLOT_UNLOCK_COST[index];
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${price}`, x, y + r + 10);
        } else if (slot?.card) {
            // CARD ICON
            const color = slot.card.type.color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Level indicator
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.fillText(`${slot.card.level}`, x, y);
        } else {
            // EMPTY (Plus or dashed?)
            ctx.strokeStyle = isSelected ? '#0f0' : '#666';
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    private static drawLock(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
        const w = r * 0.5;
        const h = r * 0.4;

        ctx.fillStyle = '#ccc';
        // Body
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        // Shackle
        ctx.beginPath();
        ctx.arc(x, y - h / 2, w / 3, Math.PI, 0);
        ctx.stroke();
    }

    public static getClickedAction(tower: Tower, clickX: number, clickY: number): { type: 'UNLOCK' | 'CLICK_SLOT', slotId: number } | null {
        for (let i = 0; i < this.ANGLES.length; i++) {
            const angle = this.ANGLES[i];
            const sx = tower.x + Math.cos(angle) * this.RADIUS;
            const sy = tower.y + Math.sin(angle) * this.RADIUS;

            // Check Hit
            const dx = clickX - sx;
            const dy = clickY - sy;
            const distSq = dx * dx + dy * dy;

            const HIT_SIZE = this.SAT_SIZE + 5;

            if (distSq <= HIT_SIZE * HIT_SIZE) {
                const slot = tower.slots.find(s => s.id === i);
                if (!slot) return null;

                if (slot.isLocked) {
                    return { type: 'UNLOCK', slotId: i };
                } else {
                    // For both Empty and Card slots, we return CLICK_SLOT
                    // The Controller decides whether to select or remove/interact
                    return { type: 'CLICK_SLOT', slotId: i };
                }
            }
        }
        return null;
    }
}
