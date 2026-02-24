import { BaseComponent } from './BaseComponent';
import { WaveModel } from '../WaveModel';
import { EnemyRegistry } from '../EnemyRegistry';

interface WaveTimelineProps {
    waveIndex: number;
    model: WaveModel;
}

/**
 * Canvas-based timeline visualization for a wave.
 * Shows colored blocks per group, gray gaps for delays,
 * and a time scale.
 *
 * NOTE: We do NOT store a separate `canvas` field because
 * ES2022 class field initializers run AFTER super() returns,
 * which would overwrite anything set in createRootElement().
 * Instead we use `this.element` (which IS the canvas) and cast it.
 */
export class WaveTimeline extends BaseComponent<WaveTimelineProps> {

    protected createRootElement(): HTMLElement {
        const canvas = document.createElement('canvas');
        canvas.className = 'we-timeline-canvas';
        canvas.height = 40;
        return canvas;
    }

    public render(): void {
        const canvas = this.element as HTMLCanvasElement;
        const { waveIndex, model } = this.data;
        const wave = model.getWave(waveIndex);
        if (!wave) return;

        // Measure actual width from CSS layout
        // On first mount the element may not be in DOM yet, so fallback to a safe default
        const rect = canvas.getBoundingClientRect();
        const canvasWidth = rect.width > 0 ? rect.width : 600;
        const dpr = window.devicePixelRatio || 1;
        const canvasH = 40;

        canvas.width = canvasWidth * dpr;
        canvas.height = canvasH * dpr;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasH + 'px';

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(dpr, dpr);

        // Calculate total duration
        const totalDuration = model.getEstimatedDuration(waveIndex);
        if (totalDuration <= 0) return;

        const pxPerSec = canvasWidth / totalDuration;
        let x = 0;
        const barH = 24;
        const barY = 4;

        // Clear
        ctx.clearRect(0, 0, canvasWidth, canvasH);

        // Start delay
        const startDelay = wave.startDelay ?? 0;
        if (startDelay > 0) {
            const w = startDelay * pxPerSec;
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
            ctx.fillRect(x, barY, w, barH);
            ctx.fillStyle = '#666';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`⏱${startDelay}s`, x + w / 2, barY + barH / 2 + 3);
            x += w;
        }

        // Each group
        wave.enemies.forEach(group => {
            // Delay before
            const delay = group.delayBefore ?? 0;
            if (delay > 0) {
                const w = delay * pxPerSec;
                ctx.fillStyle = 'rgba(100, 100, 100, 0.25)';
                ctx.fillRect(x, barY, w, barH);
                x += w;
            }

            // Group block
            const interval = group.baseInterval ?? 0.66;
            const groupDuration = group.count * interval;
            const w = groupDuration * pxPerSec;

            // Color from EnemyRegistry
            const typeConfig = EnemyRegistry.getType(group.type);
            const color = typeConfig?.color || '#888';
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(x, barY, Math.max(w, 2), barH);
            ctx.globalAlpha = 1;

            // Border
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, barY, Math.max(w, 2), barH);

            // Label inside
            if (w > 30) {
                const symbol = typeConfig?.symbol || '?';
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${symbol} ×${group.count}`, x + w / 2, barY + barH / 2 + 4);
            }

            x += w;
        });

        // Time scale at bottom
        ctx.fillStyle = '#555';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        const interval = totalDuration > 20 ? 5 : totalDuration > 10 ? 2 : 1;
        for (let t = 0; t <= totalDuration; t += interval) {
            const tx = t * pxPerSec;
            ctx.fillRect(tx, barY + barH + 2, 1, 4);
            ctx.fillText(`${t}s`, tx, canvasH - 1);
        }
    }
}
