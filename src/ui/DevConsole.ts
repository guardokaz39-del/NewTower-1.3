import { GameScene } from '../scenes/GameScene';
import { Logger, LogLevel, LogChannel, LogEntry } from '../utils/Logger';
import { SafeJson } from '../utils/SafeJson';

export class DevConsole {
    private scene: GameScene;
    private container!: HTMLElement;
    private contentLog!: HTMLElement;
    private contentState!: HTMLElement;
    private contentTools!: HTMLElement;
    private toggleBtn!: HTMLElement;

    // State
    private isVisible: boolean = false;
    private activeTab: 'log' | 'state' | 'tools' = 'log';
    private autoScroll: boolean = true;
    private stateUpdateInterval: any = null;

    // Filters
    private showInfo: boolean = true;
    private showWarn: boolean = true;
    private showError: boolean = true;
    private showVerbose: boolean = false;

    constructor(scene: GameScene) {
        this.scene = scene;
        this.createUI();
        this.setupLogger();

        Logger.info(LogChannel.SYSTEM, 'DevConsole initialized');
    }

    private setupLogger() {
        Logger.subscribe((entry) => {
            this.appendLog(entry);
            // Indication logic: if console is closed and error occurs, flash the button
            if (!this.isVisible && entry.level === LogLevel.ERROR) {
                this.flashButton();
            }
        });
    }

    private flashButton() {
        if (this.toggleBtn) {
            this.toggleBtn.style.background = '#ff0000';
            setTimeout(() => {
                if (!this.isVisible) this.toggleBtn.style.background = 'rgba(0,0,0,0.8)';
            }, 500);
        }
    }

    private createUI() {
        // --- Toggle Button ---
        this.toggleBtn = document.createElement('div');
        this.toggleBtn.innerText = '🐞';
        this.toggleBtn.title = 'Dev Console (~)';
        Object.assign(this.toggleBtn.style, {
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '32px',
            height: '32px',
            background: 'rgba(0,0,0,0.8)',
            border: '1px solid #444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: '20000',
            userSelect: 'none',
            fontSize: '16px'
        });
        this.toggleBtn.onclick = () => this.toggle();
        document.body.appendChild(this.toggleBtn);

        // --- Main Container ---
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute',
            top: '50px',
            right: '10px',
            width: '400px',
            height: '500px',
            background: 'rgba(10, 10, 10, 0.95)',
            border: '1px solid #444',
            borderRadius: '4px',
            display: 'none',
            flexDirection: 'column',
            zIndex: '20000',
            fontFamily: 'Consolas, monospace',
            fontSize: '12px',
            color: '#ccc',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        });
        document.body.appendChild(this.container);

        // --- Header (Tabs) ---
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            borderBottom: '1px solid #333',
            background: '#1a1a1a',
            padding: '0 5px'
        });

        ['log', 'state', 'tools'].forEach(tab => {
            const btn = document.createElement('button');
            btn.innerText = tab.toUpperCase();
            Object.assign(btn.style, {
                background: 'transparent',
                border: 'none',
                color: '#888',
                padding: '8px 12px',
                cursor: 'pointer',
                fontWeight: 'bold'
            });
            btn.onclick = () => this.switchTab(tab as any);
            header.appendChild(btn);
            // active style for 'log' handled in switchTab
        });

        // Close Btn
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '✕';
        Object.assign(closeBtn.style, {
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            padding: '0 10px'
        });
        closeBtn.onclick = () => this.toggle();
        header.appendChild(closeBtn);

        this.container.appendChild(header);

        // --- Content Areas ---
        this.contentLog = document.createElement('div');
        Object.assign(this.contentLog.style, { flex: '1', overflowY: 'auto', padding: '5px', display: 'block' });

        // Log Filters
        const filters = document.createElement('div');
        Object.assign(filters.style, { padding: '5px', background: '#111', borderBottom: '1px solid #222', display: 'flex', gap: '8px' });
        filters.innerHTML = `
            <label><input type="checkbox" id="chk-info" checked> Info</label>
            <label><input type="checkbox" id="chk-warn" checked> Warn</label>
            <label><input type="checkbox" id="chk-err" checked> Err</label>
            <label><input type="checkbox" id="chk-verb"> Verbose</label>
            <button id="btn-clear" style="margin-left:auto; font-size:10px;">CLEAR</button>
        `;
        this.container.appendChild(filters); // Insert filters before log content
        this.container.appendChild(this.contentLog);

        this.contentState = document.createElement('div');
        Object.assign(this.contentState.style, { flex: '1', overflowY: 'auto', padding: '10px', display: 'none', whiteSpace: 'pre-wrap', color: '#8f8' });
        this.container.appendChild(this.contentState);

        this.contentTools = document.createElement('div');
        Object.assign(this.contentTools.style, { flex: '1', overflowY: 'auto', padding: '10px', display: 'none' });
        this.createToolsContent();
        this.container.appendChild(this.contentTools);

        // Filter Logic
        this.container.querySelector('#chk-info')!.addEventListener('change', (e: any) => { this.showInfo = e.target.checked; this.refreshLogs(); });
        this.container.querySelector('#chk-warn')!.addEventListener('change', (e: any) => { this.showWarn = e.target.checked; this.refreshLogs(); });
        this.container.querySelector('#chk-err')!.addEventListener('change', (e: any) => { this.showError = e.target.checked; this.refreshLogs(); });
        this.container.querySelector('#chk-verb')!.addEventListener('change', (e: any) => { this.showVerbose = e.target.checked; this.refreshLogs(); });
        this.container.querySelector('#btn-clear')!.addEventListener('click', () => {
            this.contentLog.innerHTML = '';
            // Note: we don't clear Logger history, just view. Or we could implemented clear in Logger.
        });

        // Global Key
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Backquote') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    private createToolsContent() {
        // Buttons for common debugging tasks
        const addBtn = (label: string, action: () => void) => {
            const btn = document.createElement('button');
            btn.innerText = label;
            Object.assign(btn.style, {
                display: 'block',
                width: '100%',
                padding: '8px',
                marginBottom: '5px',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                cursor: 'pointer'
            });
            btn.onclick = action;
            this.contentTools.appendChild(btn);
        };

        addBtn('💰 +1000 Gold', () => { this.scene.addMoney(1000); Logger.info(LogChannel.GAME, 'Added 1000 gold'); });
        addBtn('⏩ Skip Wave', () => {
            this.scene.wave++;
            Logger.info(LogChannel.GAME, `Skipped to wave ${this.scene.wave}`);
        });
        addBtn('💀 Kill All', () => {
            this.scene.enemies.forEach(e => e.takeDamage(999999));
            Logger.info(LogChannel.GAME, 'Killed all enemies');
        });
        addBtn('🗑 Garbage Collect (Sim)', () => {
            // Can't force GC in JS, but we can clear some internal pools if we had them or reload textures
            Logger.warn(LogChannel.SYSTEM, 'GC Simulation - clearing loose refs not implemented');
        });
        addBtn('📋 Copy Full Report', () => {
            // This will link to CrashHandler later, for now simple dump
            const dump = SafeJson.stringify({ scene: this.scene }, 2);
            navigator.clipboard.writeText(dump);
            Logger.info(LogChannel.SYSTEM, 'State copied to clipboard');
        });
    }

    public toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';

        if (this.isVisible) {
            this.startStateUpdater();
            this.refreshLogs(); // Refresh just in case filters changed
            // Reset flash
            this.toggleBtn.style.background = 'rgba(0,0,0,0.8)';
        } else {
            this.stopStateUpdater();
        }
    }

    private switchTab(tab: 'log' | 'state' | 'tools') {
        this.activeTab = tab;
        this.contentLog.style.display = tab === 'log' ? 'block' : 'none';
        this.contentState.style.display = tab === 'state' ? 'block' : 'none';
        this.contentTools.style.display = tab === 'tools' ? 'block' : 'none';
    }

    private startStateUpdater() {
        if (this.stateUpdateInterval) clearInterval(this.stateUpdateInterval);
        this.stateUpdateInterval = setInterval(() => this.updateStateView(), 500);
        this.updateStateView();
    }

    private stopStateUpdater() {
        if (this.stateUpdateInterval) clearInterval(this.stateUpdateInterval);
        this.stateUpdateInterval = null;
    }

    private updateStateView() {
        if (this.activeTab !== 'state' || !this.isVisible) return;

        const state = {
            game: {
                fps: this.scene.gameState?.frames || 0,
                // time: this.scene.gameState?.time || 0, // Removed invalid property
                money: this.scene.money,
                wave: this.scene.wave,
                lives: 100 // Example, should get real lives
            },
            entities: {
                enemies: this.scene.enemies.length,
                towers: this.scene.towers.length,
                projectiles: this.scene.projectiles?.length || 0
            },
            input: {
                mouse: { x: this.scene.input?.mouseX || 0, y: this.scene.input?.mouseY || 0 }
            }
        };

        this.contentState.innerText = SafeJson.stringify(state, 2, true);
    }

    private refreshLogs() {
        this.contentLog.innerHTML = '';
        Logger.getHistory().forEach(entry => this.appendLog(entry));
    }

    private appendLog(entry: LogEntry) {
        if (!this.isVisible) return; // Lazy rendering

        // Check filters
        if (entry.level === LogLevel.INFO && !this.showInfo) return;
        if (entry.level === LogLevel.WARN && !this.showWarn) return;
        if (entry.level === LogLevel.ERROR && !this.showError) return;
        if (entry.level === LogLevel.VERBOSE && !this.showVerbose) return;

        const row = document.createElement('div');
        const time = new Date(entry.timestamp).toISOString().split('T')[1].slice(0, -5);

        let color = '#ccc';
        if (entry.level === LogLevel.WARN) color = '#fc0';
        if (entry.level === LogLevel.ERROR) color = '#f44';
        if (entry.level === LogLevel.VERBOSE) color = '#666';

        row.style.color = color;
        row.style.fontFamily = 'monospace';
        row.style.fontSize = '11px';
        row.style.padding = '2px 0';
        row.style.borderBottom = '1px solid #222';

        const countStr = entry.count > 1 ? ` <span style="background:#555; color:#fff; padding:0 4px; border-radius:4px;">x${entry.count}</span>` : '';

        row.innerHTML = `<span style="color:#666">[${time}]</span> <span style="color:#888">[${entry.channel}]</span> ${entry.message}${countStr}`;

        if (entry.data) {
            const sub = document.createElement('div');
            sub.style.paddingLeft = '20px';
            sub.style.fontSize = '10px';
            sub.style.color = '#888';
            // Simple preview
            try {
                sub.innerText = typeof entry.data === 'object' ? JSON.stringify(entry.data) : String(entry.data);
            } catch (e) { sub.innerText = '[Unserializable Data]'; }
            row.appendChild(sub);
        }

        this.contentLog.appendChild(row);
        if (this.autoScroll) this.contentLog.scrollTop = this.contentLog.scrollHeight;
    }
}
