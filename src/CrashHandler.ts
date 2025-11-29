export class CrashHandler {
    constructor() {
        this.init();
    }

    private init() {
        window.onerror = (message, source, lineno, colno, error) => {
            this.showBSOD(message as string, source, lineno, error);
            return true; // Предотвращает стандартный вывод в консоль (иногда)
        };

        window.addEventListener('unhandledrejection', (event) => {
            this.showBSOD(event.reason, "Promise", 0, null);
        });
    }

    private showBSOD(msg: string, source: string | undefined, line: number, error: any) {
        // Останавливаем игру (удаляем канвас визуально)
        const canvas = document.getElementById('game-canvas');
        if (canvas) canvas.style.display = 'none';

        const ui = document.getElementById('ui-layer');
        if (ui) ui.style.display = 'none';

        // Создаем экран смерти
        const bsod = document.createElement('div');
        Object.assign(bsod.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: '#800000', color: '#fff', fontFamily: 'monospace',
            padding: '40px', zIndex: '999999', overflow: 'auto', display: 'flex', flexDirection: 'column'
        });

        bsod.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px;">CRITICAL ERROR :(</h1>
            <p style="font-size: 24px;">Something went wrong and the game crashed.</p>
            <hr style="width: 100%; border: 1px solid #ff4444; margin: 20px 0;">
            <div style="background: #000; padding: 20px; border-radius: 5px; border: 1px solid #ff0000;">
                <p style="color: #ffaaaa;">Error: ${msg}</p>
                <p>Source: ${source}:${line}</p>
                <pre style="color: #ccc; margin-top: 10px;">${error?.stack || 'No stack trace'}</pre>
            </div>
            <button id="copy-crash-btn" style="margin-top: 30px; padding: 15px; font-size: 20px; background: #fff; color: #800000; border: none; cursor: pointer; font-weight: bold;">
                📋 COPY REPORT FOR DEVELOPER
            </button>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 15px; font-size: 20px; background: #444; color: #fff; border: none; cursor: pointer;">
                🔄 RELOAD PAGE
            </button>
        `;

        document.body.appendChild(bsod);

        document.getElementById('copy-crash-btn')!.onclick = () => {
            const report = `CRASH REPORT:\nError: ${msg}\nLoc: ${source}:${line}\nStack:\n${error?.stack || ''}\nUA: ${navigator.userAgent}`;
            navigator.clipboard.writeText(report).then(() => alert("Copied!"));
        };
    }
}