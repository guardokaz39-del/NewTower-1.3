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

    // Cleanup
    private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;

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

        // Global Key - store reference for cleanup
        this.keyDownHandler = (e: KeyboardEvent) => {
            if (e.code === 'Backquote') {
                e.preventDefault();
                this.toggle();
            }
        };
        window.addEventListener('keydown', this.keyDownHandler);
    }

    /**
     * Clean up event listeners - call on scene destroy
     */
    public destroy(): void {
        if (this.keyDownHandler) {
            window.removeEventListener('keydown', this.keyDownHandler);
        }
        this.container.remove();
    }

    private createToolsContent() {
        const rootContainer = this.contentTools;
        let currentContainer: HTMLElement = rootContainer;

        // Helper to create styled buttons with icons
        const addBtn = (label: string, action: () => void, style: 'default' | 'success' | 'warning' | 'danger' = 'default') => {
            const btn = document.createElement('button');
            btn.innerText = label;
            const colors = {
                default: { bg: '#2a2a2a', hover: '#3a3a3a', border: '#444' },
                success: { bg: '#1a4a1a', hover: '#2a5a2a', border: '#3a7a3a' },
                warning: { bg: '#4a3a1a', hover: '#5a4a2a', border: '#7a6a3a' },
                danger: { bg: '#4a1a1a', hover: '#5a2a2a', border: '#7a3a3a' }
            };
            const c = colors[style];
            Object.assign(btn.style, {
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                marginBottom: '4px',
                background: c.bg,
                color: '#ddd',
                border: `1px solid ${c.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '11px',
                transition: 'background 0.15s'
            });
            btn.onmouseenter = () => btn.style.background = c.hover;
            btn.onmouseleave = () => btn.style.background = c.bg;
            btn.onclick = action;
            currentContainer.appendChild(btn);
        };

        const addSection = (title: string, collapsed: boolean = false) => {
            const section = document.createElement('div');
            section.style.marginBottom = '10px';

            const header = document.createElement('div');
            header.innerText = title;
            Object.assign(header.style, {
                color: '#aaa',
                fontSize: '10px',
                fontWeight: 'bold',
                marginTop: '8px',
                marginBottom: '6px',
                padding: '4px 8px',
                background: '#1a1a1a',
                borderRadius: '3px',
                cursor: 'pointer',
                userSelect: 'none'
            });

            const content = document.createElement('div');
            content.style.display = collapsed ? 'none' : 'block';

            header.onclick = () => {
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            };

            section.appendChild(header);
            section.appendChild(content);
            rootContainer.appendChild(section);
            currentContainer = content; // Switch to this section for subsequent buttons
            return content;
        };

        // === STATUS BAR ===
        const statusBar = document.createElement('div');
        Object.assign(statusBar.style, {
            padding: '6px 8px',
            background: '#111',
            borderBottom: '1px solid #333',
            marginBottom: '8px',
            fontSize: '10px',
            color: '#888',
            display: 'flex',
            gap: '12px'
        });
        statusBar.innerHTML = `
            <span id="status-fps">FPS: --</span>
            <span id="status-enemies">👾 --</span>
            <span id="status-towers">🗼 --</span>
            <span id="status-projectiles">💫 --</span>
        `;
        this.contentTools.appendChild(statusBar);

        // Update status bar periodically
        setInterval(() => {
            const fps = document.getElementById('status-fps');
            const enemies = document.getElementById('status-enemies');
            const towers = document.getElementById('status-towers');
            const proj = document.getElementById('status-projectiles');
            if (fps) fps.innerText = `FPS: ${Math.round(1000 / (this.scene.gameState?.frames || 16.67))}`;
            if (enemies) enemies.innerText = `👾 ${this.scene.enemies?.length || 0}`;
            if (towers) towers.innerText = `🗼 ${this.scene.towers?.length || 0}`;
            if (proj) proj.innerText = `💫 ${this.scene.projectiles?.length || 0}`;
        }, 500);

        // === 🎮 GAME CHEATS ===
        addSection('🎮 GAME CHEATS');

        addBtn('💰 +1000 Gold', () => {
            this.scene.addMoney(1000);
            Logger.info(LogChannel.GAME, 'Added 1000 gold');
        }, 'success');

        addBtn('💰 +10000 Gold', () => {
            this.scene.addMoney(10000);
            Logger.info(LogChannel.GAME, 'Added 10000 gold');
        }, 'success');

        addBtn('⏩ Skip to Next Wave', () => {
            this.scene.wave++;
            Logger.info(LogChannel.GAME, `Skipped to wave ${this.scene.wave}`);
        }, 'warning');

        addBtn('💀 Kill All Enemies', () => {
            for (let i = 0; i < this.scene.enemies.length; i++) {
                this.scene.enemies[i].takeDamage(999999);
            }
            Logger.info(LogChannel.GAME, 'Killed all enemies');
        }, 'danger');

        addBtn('❤️ Full Lives', () => {
            (this.scene as any).gameState.lives = 100;
            Logger.info(LogChannel.GAME, 'Lives restored to 100');
        }, 'success');

        addBtn('⏸️ Toggle Pause', () => {
            this.scene.gameState.paused = !this.scene.gameState.paused;
            Logger.info(LogChannel.GAME, `Game ${this.scene.gameState.paused ? 'PAUSED' : 'RESUMED'}`);
        });

        // === 👾 SPAWN ENEMIES ===
        addSection('👾 SPAWN ENEMIES');

        const enemyTypes = [
            'GRUNT',           // Скелет
            'SCOUT',           // Адская Гончая
            'TANK',            // Воевода Орков
            'BOSS',            // Призрак Пустоты
            'SKELETON_COMMANDER',
            'SPIDER_POISON',   // Ядовитый Паук
            'TROLL_ARMORED',   // Латник
            'GOBLIN',          // Гоблин
            'SAPPER_RAT',      // Алхимическая Крыса
            'MAGMA_KING',      // Король Магмы
            'FLESH_COLOSSUS'   // Мясной Колосс
        ];
        for (const type of enemyTypes) {
            addBtn(`+ ${type}`, () => {
                this.scene.spawnEnemy?.(type);
                Logger.info(LogChannel.GAME, `Spawned ${type}`);
            });
        }

        // === ⚡ PERFORMANCE ===
        addSection('⚡ PERFORMANCE');

        addBtn('📊 Toggle FPS Overlay', () => {
            (window as any).__PERF_OVERLAY = !(window as any).__PERF_OVERLAY;
            Logger.info(LogChannel.SYSTEM, `FPS Overlay: ${(window as any).__PERF_OVERLAY ? 'ON' : 'OFF'}`);
        });

        addBtn('📈 Stress Test (+50 enemies)', () => {
            const types = ['GRUNT', 'RUNNER', 'TANK'];
            for (let i = 0; i < 50; i++) {
                const type = types[Math.floor(Math.random() * types.length)];
                this.scene.spawnEnemy?.(type);
            }
            Logger.warn(LogChannel.SYSTEM, 'Spawned 50 random enemies');
        }, 'warning');

        addBtn('📈 Mega Stress (+200 enemies)', () => {
            for (let i = 0; i < 200; i++) {
                this.scene.spawnEnemy?.('GRUNT');
            }
            Logger.warn(LogChannel.SYSTEM, 'Spawned 200 GRUNT enemies');
        }, 'danger');

        addBtn('🧹 Clear Pools', () => {
            this.scene.effects?.clear?.();
            this.scene.projectileSystem?.clear?.();
            Logger.info(LogChannel.SYSTEM, 'Pools cleared');
        });

        addBtn('📉 Entity Stats', () => {
            const stats = {
                enemies: this.scene.enemies?.length || 0,
                towers: this.scene.towers?.length || 0,
                projectiles: this.scene.projectiles?.length || 0,
                effects: this.scene.effects?.getCount?.() || this.scene.effects?.activeEffects?.length || 0,
                wave: this.scene.wave,
                money: this.scene.money,
                lives: (this.scene as any).gameState?.lives
            };
            Logger.info(LogChannel.SYSTEM, `Stats: ${JSON.stringify(stats, null, 2)}`);
        });

        // === 🐛 DEBUG ===
        addSection('🐛 DEBUG');

        addBtn('🎯 Toggle Hitboxes', () => {
            (window as any).__DEBUG_HITBOXES = !(window as any).__DEBUG_HITBOXES;
            Logger.info(LogChannel.SYSTEM, `Hitboxes: ${(window as any).__DEBUG_HITBOXES ? 'ON' : 'OFF'}`);
        });

        addBtn('📍 Toggle Paths', () => {
            (window as any).__DEBUG_PATHS = !(window as any).__DEBUG_PATHS;
            Logger.info(LogChannel.SYSTEM, `Paths: ${(window as any).__DEBUG_PATHS ? 'ON' : 'OFF'}`);
        });

        addBtn('🔦 Toggle Lighting Debug', () => {
            (window as any).__DEBUG_LIGHTING = !(window as any).__DEBUG_LIGHTING;
            Logger.info(LogChannel.SYSTEM, `Lighting Debug: ${(window as any).__DEBUG_LIGHTING ? 'ON' : 'OFF'}`);
        });

        addBtn('⏯️ Step Frame (when paused)', () => {
            if (!this.scene.gameState.paused) {
                Logger.warn(LogChannel.SYSTEM, 'Game must be paused to step frames');
                return;
            }
            (this.scene as any).stepOneFrame?.();
            Logger.info(LogChannel.SYSTEM, 'Stepped 1 frame');
        });

        // === 📋 BUG REPORT ===
        addSection('📋 BUG REPORT');

        addBtn('📋 Generate Full Report', () => {
            this.generateBugReport();
        }, 'warning');

        addBtn('📋 Copy State Only', () => {
            const dump = SafeJson.stringify({ scene: this.scene }, 2);
            navigator.clipboard.writeText(dump);
            Logger.info(LogChannel.SYSTEM, 'State copied to clipboard');
        });

        addBtn('📋 Copy Recent Logs', () => {
            const logs = Logger.getHistory().slice(-100).map(e =>
                `[${new Date(e.timestamp).toISOString()}] [${e.channel}] ${e.message}`
            ).join('\n');
            navigator.clipboard.writeText(logs);
            Logger.info(LogChannel.SYSTEM, 'Last 100 logs copied');
        });
    }

    /**
     * Generate comprehensive bug report
     */
    private generateBugReport(): void {
        const report = {
            meta: {
                version: '1.4-alfa',
                timestamp: new Date().toISOString(),
                browser: navigator.userAgent,
                screen: `${window.innerWidth}x${window.innerHeight}`,
                devicePixelRatio: window.devicePixelRatio
            },
            gameState: {
                wave: this.scene.wave,
                money: this.scene.money,
                lives: (this.scene as any).gameState?.lives,
                paused: this.scene.gameState?.paused,
                isRunning: this.scene.gameState?.isRunning,
                frames: this.scene.gameState?.frames
            },
            entities: {
                enemies: this.scene.enemies?.length || 0,
                towers: this.scene.towers?.length || 0,
                projectiles: this.scene.projectiles?.length || 0,
                effects: this.scene.effects?.getCount?.() || 0
            },
            enemyDetails: this.scene.enemies?.slice(0, 10).map((e: any) => ({
                type: e.typeId,
                hp: `${e.currentHealth?.toFixed(0)}/${e.maxHealth?.toFixed(0)}`,
                pos: `${e.x?.toFixed(0)},${e.y?.toFixed(0)}`,
                statuses: e.statuses?.map((s: any) => s.type)
            })),
            towerDetails: this.scene.towers?.slice(0, 10).map((t: any) => ({
                pos: `${t.col},${t.row}`,
                cards: t.cards?.length || 0,
                building: t.isBuilding
            })),
            waveManager: {
                isWaveActive: (this.scene as any).waveManager?.isWaveActive,
                spawnQueue: (this.scene as any).waveManager?.spawnQueue?.length,
                currentPattern: (this.scene as any).waveManager?.currentPattern
            },
            recentLogs: Logger.getHistory().slice(-50).map(e => ({
                time: new Date(e.timestamp).toISOString().split('T')[1].slice(0, -1),
                level: LogLevel[e.level],
                channel: e.channel,
                msg: e.message.slice(0, 100)
            })),
            performance: {
                fpsOverlay: (window as any).__PERF_OVERLAY || false,
                debugHitboxes: (window as any).__DEBUG_HITBOXES || false,
                debugPaths: (window as any).__DEBUG_PATHS || false
            }
        };

        const reportStr = JSON.stringify(report, null, 2);
        navigator.clipboard.writeText(reportStr);
        Logger.info(LogChannel.SYSTEM, `📋 Full bug report copied to clipboard (${reportStr.length} chars)`);
        console.log('=== BUG REPORT ===\n', report);
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
