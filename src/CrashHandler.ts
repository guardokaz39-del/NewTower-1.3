import { Logger, LogChannel, LogLevel } from './utils/Logger';
import { SafeJson } from './utils/SafeJson';

export class CrashHandler {
    constructor() {
        this.init();
        Logger.info(LogChannel.SYSTEM, 'CrashHandler initialized');
    }

    private init() {
        window.onerror = (message, source, lineno, colno, error) => {
            this.handleError(message as string, source, lineno, colno, error);
            return true; // Prevent default browser console spam if we handle it
        };

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason ? event.reason.toString() : 'Unhandled Rejection', 'Promise', 0, 0, event.reason);
        });
    }

    private handleError(msg: string, source: string | undefined, line: number, col: number | undefined, error: any) {
        // 1. Log to our internal logger immediately (so it's in history)
        Logger.error(LogChannel.SYSTEM, `CRASH: ${msg}`, { source, line, stack: error?.stack });

        // 2. Stop Game Loop (Global hack or try to find game instance)
        // We can't easily stop requestAnimationFrame from here without reference, but we can cover the screen.

        // 3. Show BSOD
        this.showBSOD(msg, source || 'unknown', line, error);
    }

    private showBSOD(msg: string, source: string, line: number, error: any) {
        // Stop interaction
        const ui = document.getElementById('ui-layer');
        if (ui) ui.style.display = 'none';

        // Create BSOD
        const bsod = document.createElement('div');
        Object.assign(bsod.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(50, 0, 0, 0.96)', color: '#fff', fontFamily: 'Consolas, monospace',
            padding: '40px', zIndex: '999999', overflow: 'auto', display: 'flex', flexDirection: 'column',
            backdropFilter: 'blur(5px)'
        });

        const report = this.createFullReport(msg, source, line, error);

        bsod.innerHTML = `
            <h1 style="color: #ff5555; margin: 0 0 20px 0;">☠️ CRITICAL FAILURE</h1>
            <p style="font-size: 16px; color: #ffaaaa; margin-bottom: 30px;">
                The game encountered an unrecoverable error.
            </p>
            
            <div style="background: #220000; padding: 20px; border: 1px solid #ff4444; border-radius: 6px; margin-bottom: 20px;">
                <div style="color: #ff5555; font-weight: bold; margin-bottom: 10px;">EPOCH ERROR: ${msg}</div>
                <div style="color: #999; font-size: 12px;">${source}:${line}</div>
                <pre style="color: #ccc; margin-top: 15px; font-size: 12px; overflow-x: auto;">${error?.stack || 'No stack trace available'}</pre>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="btn-copy-report" style="padding: 12px 24px; background: #fff; color: #800; border: none; font-weight: bold; cursor: pointer; border-radius: 4px;">
                    📋 COPY FULL DEBUG REPORT
                </button>
                <button onclick="location.reload()" style="padding: 12px 24px; background: #444; color: #fff; border: none; cursor: pointer; border-radius: 4px;">
                    🔄 RELOAD GAME
                </button>
            </div>
            
            <p style="margin-top: 20px; color: #666; font-size: 12px;">
                Please send this report to the developer.
            </p>
        `;

        document.body.appendChild(bsod);

        document.getElementById('btn-copy-report')!.onclick = () => {
            navigator.clipboard.writeText(report).then(() => {
                const btn = document.getElementById('btn-copy-report')!;
                btn.innerText = '✅ COPIED!';
                btn.style.background = '#4f4';
                btn.style.color = '#000';
            });
        };
    }

    private createFullReport(msg: string, source: string, line: number, error: any): string {
        const report = {
            timestamp: new Date().toISOString(),
            error: {
                message: msg,
                source: `${source}:${line}`,
                stack: error?.stack,
            },
            system: {
                ua: navigator.userAgent,
                resolution: `${window.innerWidth}x${window.innerHeight}`,
                time: performance.now().toFixed(2) + 'ms'
            },
            logs: Logger.getHistory(), // Last 200 logs
            // Ideally we would dump GameState here, but we lack reference. 
            // The logs should contain enough info if properly instrumented.
        };

        return JSON.stringify(report, null, 2);
    }
}
