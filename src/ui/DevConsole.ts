import { IGameScene } from '../scenes/IGameScene';
import { Logger, LogLevel, LogChannel, LogEntry } from '../utils/Logger';
import { SafeJson } from '../utils/SafeJson';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

/**
 * DevConsole v2.0 - Русифицированная версия с графиком FPS
 * Вкладки: ЛОГ | ГРАФИК | ЧИТЫ | ТЕСТЫ
 */
export class DevConsole {
    private scene: IGameScene;
    private container!: HTMLElement;
    private toggleBtn!: HTMLElement;

    // Tab content areas
    private contentLog!: HTMLElement;
    private contentGraph!: HTMLElement;
    private contentCheats!: HTMLElement;
    private contentTests!: HTMLElement;
    // Graph canvas
    private graphCanvas!: HTMLCanvasElement;
    private graphCtx!: CanvasRenderingContext2D;
    private fpsHistory: number[] = [];
    private eventMarkers: { frame: number; label: string; color: string }[] = [];
    private graphUpdateInterval: ReturnType<typeof setInterval> | null = null;

    // Frame Snapshots - capture game state during FPS drops
    private frameSnapshots: {
        time: string;
        fps: number;
        enemies: number;
        projectiles: number;
        effects: number;
        towers: number;
    }[] = [];

    // State
    private isVisible: boolean = false;
    private activeTab: 'log' | 'graph' | 'cheats' | 'tests' = 'log';
    private autoScroll: boolean = true;
    private stateUpdateInterval: ReturnType<typeof setInterval> | null = null;

    // Filters
    private showInfo: boolean = true;
    private showWarn: boolean = true;
    private showError: boolean = true;
    private showVerbose: boolean = false;

    // Cleanup
    private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(scene: IGameScene) {
        this.scene = scene;
        this.createUI();
        this.setupLogger();
        Logger.info(LogChannel.SYSTEM, 'DevConsole v2.0 инициализирован');
    }

    private setupLogger() {
        Logger.subscribe((entry) => {
            this.appendLog(entry);
            // Add event marker for graph
            if (entry.level === LogLevel.WARN || entry.level === LogLevel.ERROR) {
                this.eventMarkers.push({
                    frame: this.fpsHistory.length,
                    label: entry.message.slice(0, 20),
                    color: entry.level === LogLevel.ERROR ? '#f44' : '#fc0'
                });
                if (this.eventMarkers.length > 50) this.eventMarkers.shift();
            }
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
        // Toggle Button
        this.toggleBtn = document.createElement('div');
        this.toggleBtn.innerText = '🐞';
        this.toggleBtn.title = 'Dev Console (~)';
        Object.assign(this.toggleBtn.style, {
            position: 'absolute', top: '10px', right: '10px',
            width: '32px', height: '32px', background: 'rgba(0,0,0,0.8)',
            border: '1px solid #444', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: '20000', userSelect: 'none', fontSize: '16px'
        });
        this.toggleBtn.onclick = () => this.toggle();
        document.body.appendChild(this.toggleBtn);

        // Main Container
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '50px', right: '10px',
            width: '420px', height: '520px', background: 'rgba(10, 10, 10, 0.95)',
            border: '1px solid #444', borderRadius: '4px', display: 'none',
            flexDirection: 'column', zIndex: '20000', fontFamily: 'Consolas, monospace',
            fontSize: '12px', color: '#ccc', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        });
        document.body.appendChild(this.container);

        // Header (Tabs) - RUSSIAN
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex', borderBottom: '1px solid #333',
            background: '#1a1a1a', padding: '0 5px'
        });

        const tabs = [
            { id: 'log', label: 'ЛОГ' },
            { id: 'graph', label: 'ГРАФИК' },
            { id: 'cheats', label: 'ЧИТЫ' },
            { id: 'tests', label: 'ТЕСТЫ' }
        ];

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.innerText = tab.label;
            btn.dataset.tab = tab.id;
            Object.assign(btn.style, {
                background: 'transparent', border: 'none', color: '#888',
                padding: '8px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px'
            });
            btn.onclick = () => this.switchTab(tab.id as any);
            header.appendChild(btn);
        });

        // Close Btn
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '✕';
        Object.assign(closeBtn.style, {
            marginLeft: 'auto', background: 'transparent', border: 'none',
            color: '#666', cursor: 'pointer', padding: '0 10px'
        });
        closeBtn.onclick = () => this.toggle();
        header.appendChild(closeBtn);
        this.container.appendChild(header);

        // === LOG TAB ===
        const logWrapper = document.createElement('div');
        Object.assign(logWrapper.style, { flex: '1', display: 'flex', flexDirection: 'column' });

        const filters = document.createElement('div');
        Object.assign(filters.style, { padding: '5px', background: '#111', borderBottom: '1px solid #222', display: 'flex', gap: '8px', fontSize: '10px' });
        filters.innerHTML = `
            <label><input type="checkbox" id="chk-info" checked> Инфо</label>
            <label><input type="checkbox" id="chk-warn" checked> Внимание</label>
            <label><input type="checkbox" id="chk-err" checked> Ошибки</label>
            <button id="btn-clear" style="margin-left:auto; font-size:10px;">ОЧИСТИТЬ</button>
        `;
        logWrapper.appendChild(filters);

        this.contentLog = document.createElement('div');
        Object.assign(this.contentLog.style, { flex: '1', overflowY: 'auto', padding: '5px' });
        logWrapper.appendChild(this.contentLog);
        this.container.appendChild(logWrapper);

        // === GRAPH TAB ===
        this.contentGraph = document.createElement('div');
        Object.assign(this.contentGraph.style, { flex: '1', display: 'none', flexDirection: 'column', padding: '10px' });
        this.createGraphContent();
        this.container.appendChild(this.contentGraph);

        // === CHEATS TAB ===
        this.contentCheats = document.createElement('div');
        Object.assign(this.contentCheats.style, { flex: '1', overflowY: 'auto', padding: '10px', display: 'none' });
        this.createCheatsContent();
        this.container.appendChild(this.contentCheats);

        // === TESTS TAB ===
        this.contentTests = document.createElement('div');
        Object.assign(this.contentTests.style, { flex: '1', overflowY: 'auto', padding: '10px', display: 'none' });
        this.createTestsContent();
        this.container.appendChild(this.contentTests);

        // Filter Logic
        this.container.querySelector('#chk-info')!.addEventListener('change', (e: any) => { this.showInfo = e.target.checked; this.refreshLogs(); });
        this.container.querySelector('#chk-warn')!.addEventListener('change', (e: any) => { this.showWarn = e.target.checked; this.refreshLogs(); });
        this.container.querySelector('#chk-err')!.addEventListener('change', (e: any) => { this.showError = e.target.checked; this.refreshLogs(); });
        this.container.querySelector('#btn-clear')!.addEventListener('click', () => { this.contentLog.innerHTML = ''; });

        // Global Key
        this.keyDownHandler = (e: KeyboardEvent) => {
            if (e.code === 'Backquote') { e.preventDefault(); this.toggle(); }
        };
        window.addEventListener('keydown', this.keyDownHandler);
    }

    // === GRAPH TAB CONTENT ===
    private createGraphContent() {
        // Canvas for FPS Graph
        this.graphCanvas = document.createElement('canvas');
        this.graphCanvas.width = 380;
        this.graphCanvas.height = 180;
        Object.assign(this.graphCanvas.style, { background: '#111', borderRadius: '4px', marginBottom: '10px' });
        this.graphCtx = this.graphCanvas.getContext('2d')!;
        this.contentGraph.appendChild(this.graphCanvas);

        // Stats line
        const statsLine = document.createElement('div');
        statsLine.id = 'graph-stats';
        Object.assign(statsLine.style, { color: '#8f8', fontSize: '11px', marginBottom: '10px' });
        statsLine.innerText = 'FPS: -- | Мин: -- | Макс: -- | Спайки: --';
        this.contentGraph.appendChild(statsLine);

        // Event Log (collapsible)
        const spoiler = document.createElement('details');
        spoiler.innerHTML = `<summary style="cursor:pointer; color:#888; margin-bottom:5px;">📋 Лог событий</summary>`;
        const eventLog = document.createElement('div');
        eventLog.id = 'event-log';
        Object.assign(eventLog.style, { maxHeight: '150px', overflowY: 'auto', fontSize: '10px', color: '#aaa', background: '#0a0a0a', padding: '5px', borderRadius: '3px' });
        spoiler.appendChild(eventLog);
        this.contentGraph.appendChild(spoiler);

        // Full Report Button
        const reportBtn = document.createElement('button');
        reportBtn.innerText = '📋 Полный отчёт для разработчика';
        Object.assign(reportBtn.style, {
            display: 'block', width: '100%', padding: '10px', marginTop: '10px',
            background: '#2a4a2a', color: '#8f8', border: '1px solid #4a7a4a',
            borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
        });
        reportBtn.onclick = () => this.generateFullReport();
        this.contentGraph.appendChild(reportBtn);
    }

    // === CHEATS TAB CONTENT ===
    private createCheatsContent() {
        const addBtn = (label: string, icon: string, action: () => void, color: string = '#2a2a2a') => {
            const btn = document.createElement('button');
            btn.innerText = `${icon} ${label}`;
            Object.assign(btn.style, {
                display: 'block', width: '100%', padding: '10px 12px', marginBottom: '4px',
                background: color, color: '#ddd', border: '1px solid #444', borderRadius: '4px',
                cursor: 'pointer', textAlign: 'left', fontSize: '12px'
            });
            btn.onclick = action;
            this.contentCheats.appendChild(btn);
        };

        const addHeader = (text: string) => {
            const h = document.createElement('div');
            h.innerText = text;
            Object.assign(h.style, { color: '#888', fontSize: '10px', fontWeight: 'bold', margin: '10px 0 5px', borderBottom: '1px solid #333', paddingBottom: '3px' });
            this.contentCheats.appendChild(h);
        };

        addHeader('💰 РЕСУРСЫ');
        addBtn('+1000 Золота', '💰', () => { this.scene.addMoney(1000); Logger.info(LogChannel.GAME, '+1000 золота'); }, '#1a4a1a');
        addBtn('+10000 Золота', '💰', () => { this.scene.addMoney(10000); Logger.info(LogChannel.GAME, '+10000 золота'); }, '#1a4a1a');
        addBtn('Полные жизни (100)', '❤️', () => { this.scene.gameState.lives = 100; Logger.info(LogChannel.GAME, 'Жизни восстановлены'); }, '#1a4a1a');

        addHeader('⚔️ ВОЛНЫ');
        addBtn('Следующая волна', '⏩', () => { this.scene.wave++; Logger.info(LogChannel.GAME, `Волна ${this.scene.wave}`); }, '#4a3a1a');
        addBtn('Убить всех врагов', '💀', () => {
            for (let i = 0; i < this.scene.enemies.length; i++) {
                this.scene.enemies[i].takeDamage(999999, -1, 0, 0);
            }
            Logger.info(LogChannel.GAME, 'Все враги убиты');
        }, '#4a1a1a');

        addHeader('⏸️ УПРАВЛЕНИЕ');
        addBtn('Пауза / Продолжить', '⏸️', () => {
            this.scene.gameState.paused = !this.scene.gameState.paused;
            Logger.info(LogChannel.GAME, this.scene.gameState.paused ? 'ПАУЗА' : 'ПРОДОЛЖЕНИЕ');
        });
    }

    // === TESTS TAB CONTENT ===
    private createTestsContent() {
        const addBtn = (label: string, icon: string, action: () => void, color: string = '#2a2a2a') => {
            const btn = document.createElement('button');
            btn.innerText = `${icon} ${label}`;
            Object.assign(btn.style, {
                display: 'block', width: '100%', padding: '8px 12px', marginBottom: '4px',
                background: color, color: '#ddd', border: '1px solid #444', borderRadius: '4px',
                cursor: 'pointer', textAlign: 'left', fontSize: '11px'
            });
            btn.onclick = action;
            this.contentTests.appendChild(btn);
        };

        const addHeader = (text: string) => {
            const h = document.createElement('div');
            h.innerText = text;
            Object.assign(h.style, { color: '#888', fontSize: '10px', fontWeight: 'bold', margin: '10px 0 5px', borderBottom: '1px solid #333', paddingBottom: '3px' });
            this.contentTests.appendChild(h);
        };

        addHeader('📊 ПРОИЗВОДИТЕЛЬНОСТЬ');
        addBtn('Включить FPS оверлей', '📊', () => {
            PerformanceMonitor.toggle();
            Logger.info(LogChannel.SYSTEM, `FPS Overlay: ${PerformanceMonitor.isEnabled() ? 'ВКЛ' : 'ВЫКЛ'}`);
        });
        addBtn('Сбросить счётчики', '🔄', () => {
            PerformanceMonitor.resetSpikes();
            Logger.info(LogChannel.SYSTEM, 'Счётчики сброшены');
        });
        addBtn('Статистика производительности', '📈', () => {
            const s = PerformanceMonitor.getAdvancedStats();
            Logger.info(LogChannel.SYSTEM, `FPS: ${s.fps} | 1%Low: ${s.onePercentLow} | Спайки: ${s.spikeCount} | Макс кадр: ${s.worstFrameTime.toFixed(0)}ms`);
        });

        addHeader('🧪 СТРЕСС-ТЕСТЫ');
        addBtn('+50 врагов (смешанные)', '👾', () => {
            const types = ['GRUNT', 'SCOUT', 'TANK'];
            for (let i = 0; i < 50; i++) {
                this.scene.spawnEnemy?.(types[Math.floor(Math.random() * types.length)]);
            }
            Logger.warn(LogChannel.SYSTEM, 'Спавн 50 врагов');
        }, '#4a3a1a');
        addBtn('+200 скелетов (GRUNT)', '💀', () => {
            for (let i = 0; i < 200; i++) { this.scene.spawnEnemy?.('GRUNT'); }
            Logger.warn(LogChannel.SYSTEM, 'Спавн 200 GRUNT');
        }, '#4a1a1a');
        addBtn('Очистить пулы', '🧹', () => {
            this.scene.effects?.clear?.();
            this.scene.projectileSystem?.clear?.();
            Logger.info(LogChannel.SYSTEM, 'Пулы очищены');
        });

        addHeader('🐛 ОТЛАДКА');
        addBtn('Хитбоксы ВКЛ/ВЫКЛ', '🎯', () => {
            (window as any).__DEBUG_HITBOXES = !(window as any).__DEBUG_HITBOXES;
            Logger.info(LogChannel.SYSTEM, `Хитбоксы: ${(window as any).__DEBUG_HITBOXES ? 'ВКЛ' : 'ВЫКЛ'}`);
        });
        addBtn('Пути врагов ВКЛ/ВЫКЛ', '📍', () => {
            (window as any).__DEBUG_PATHS = !(window as any).__DEBUG_PATHS;
            Logger.info(LogChannel.SYSTEM, `Пути: ${(window as any).__DEBUG_PATHS ? 'ВКЛ' : 'ВЫКЛ'}`);
        });
        addBtn('Статистика сетки (SpatialGrid)', '📐', () => {
            const collision = this.scene.collision;
            // Provide empty array to getValidGrid to just get the grid state safely for dev console stats. 
            // Better yet, we can pass scene.enemies but in DevConsole we want minimal interference.
            const grid = collision?.getValidGrid(this.scene.enemies || []);
            if (grid?.getStats) {
                const stats = grid.getStats();
                Logger.info(LogChannel.SYSTEM, `SpatialGrid: ${stats.occupiedCells}/${stats.totalCells} ячеек, ${stats.totalEntities} сущностей`);
            } else {
                Logger.warn(LogChannel.SYSTEM, 'SpatialGrid недоступен');
            }
        });

        addHeader('👾 СПАВН ВРАГОВ');
        ['GRUNT', 'SCOUT', 'TANK', 'BOSS', 'SKELETON_COMMANDER', 'TROLL_ARMORED', 'SKELETON_MINER'].forEach(type => {
            addBtn(`+ ${type}`, '👾', () => {
                this.scene.spawnEnemy?.(type);
                Logger.info(LogChannel.GAME, `Спавн ${type}`);
            });
        });
    }

    // === GRAPH DRAWING ===
    private updateGraph() {
        if (this.activeTab !== 'graph' || !this.isVisible) return;

        const stats = PerformanceMonitor.getAdvancedStats();
        this.fpsHistory.push(stats.fps);
        if (this.fpsHistory.length > 200) this.fpsHistory.shift();

        // Capture snapshot during FPS drops
        if (stats.fps < 30 && stats.fps > 0) {
            const lastSnapshot = this.frameSnapshots[this.frameSnapshots.length - 1];
            const now = new Date().toISOString().split('T')[1].slice(0, 12);
            // Only add if different from last (avoid spam)
            if (!lastSnapshot || lastSnapshot.fps !== stats.fps ||
                lastSnapshot.enemies !== (this.scene.enemies?.length || 0)) {
                this.frameSnapshots.push({
                    time: now,
                    fps: stats.fps,
                    enemies: this.scene.enemies?.length || 0,
                    projectiles: this.scene.projectiles?.length || 0,
                    effects: this.scene.effects?.getCount?.() || 0,
                    towers: this.scene.towers?.length || 0
                });
                if (this.frameSnapshots.length > 100) this.frameSnapshots.shift();
            }
        }

        // Update stats line
        const statsEl = document.getElementById('graph-stats');
        if (statsEl) {
            statsEl.innerText = `FPS: ${stats.fps} | Мин: ${stats.minFps} | Макс: ${stats.peakFps} | Спайки: ${stats.spikeCount} | Память: ${stats.memoryMB?.toFixed(1) || 'N/A'}MB`;
        }

        // Draw graph
        const ctx = this.graphCtx;
        const w = this.graphCanvas.width;
        const h = this.graphCanvas.height;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        for (let y = 0; y <= 60; y += 15) {
            const py = h - (y / 60) * h;
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(w, py);
            ctx.stroke();
            ctx.fillStyle = '#444';
            ctx.font = '9px monospace';
            ctx.fillText(`${y}`, 2, py - 2);
        }

        // FPS line
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.fpsHistory.length; i++) {
            const x = (i / 200) * w;
            const y = h - Math.min(this.fpsHistory[i] / 60, 1) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 30 FPS warning line
        ctx.strokeStyle = '#f44';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, h - (30 / 60) * h);
        ctx.lineTo(w, h - (30 / 60) * h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Event markers
        ctx.fillStyle = '#fc0';
        for (const marker of this.eventMarkers) {
            const x = (marker.frame / 200) * w;
            if (x >= 0 && x <= w) {
                ctx.beginPath();
                ctx.arc(x, 10, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Update event log
        const eventLog = document.getElementById('event-log');
        if (eventLog) {
            const recentLogs = Logger.getHistory().slice(-20);
            eventLog.innerHTML = recentLogs.map(e => {
                const time = new Date(e.timestamp).toISOString().split('T')[1].slice(0, 8);
                const color = e.level === LogLevel.ERROR ? '#f44' : e.level === LogLevel.WARN ? '#fc0' : '#888';
                return `<div style="color:${color}">[${time}] ${e.message.slice(0, 50)}</div>`;
            }).join('');
        }
    }

    // === FULL REPORT ===
    private generateFullReport() {
        const perf = PerformanceMonitor.getAdvancedStats();
        const now = Date.now();

        // Build timeline: FPS samples + events merged chronologically
        const timeline: { time: string; type: 'fps' | 'event'; fps?: number; msg?: string; level?: string }[] = [];

        // Add FPS history (approximate timestamps - 100ms intervals)
        for (let i = 0; i < this.fpsHistory.length; i++) {
            const msAgo = (this.fpsHistory.length - i) * 100;
            const time = new Date(now - msAgo).toISOString().split('T')[1].slice(0, 12);
            const fps = this.fpsHistory[i];
            // Only add significant FPS changes or drops
            if (i === 0 || Math.abs(fps - this.fpsHistory[i - 1]) > 5 || fps < 30) {
                timeline.push({ time, type: 'fps', fps });
            }
        }

        // Add events with timestamps
        const logs = Logger.getHistory().slice(-50);
        for (const log of logs) {
            const time = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
            timeline.push({
                time,
                type: 'event',
                msg: log.message.slice(0, 60),
                level: LogLevel[log.level]
            });
        }

        // Sort timeline chronologically
        timeline.sort((a, b) => a.time.localeCompare(b.time));

        // Create readable timeline string
        const timelineStr = timeline.slice(-40).map(t => {
            if (t.type === 'fps') {
                const bar = t.fps! < 30 ? '🔴' : t.fps! < 45 ? '🟡' : '🟢';
                return `[${t.time}] ${bar} FPS: ${t.fps}`;
            } else {
                const icon = t.level === 'ERROR' ? '❌' : t.level === 'WARN' ? '⚠️' : 'ℹ️';
                return `[${t.time}] ${icon} ${t.msg}`;
            }
        }).join('\n');

        // Summary stats
        const avgFps = this.fpsHistory.length > 0
            ? Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
            : 0;
        const minFpsHistory = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0;
        const maxFpsHistory = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0;

        const report = `=== ОТЧЁТ О ПРОИЗВОДИТЕЛЬНОСТИ ===
Время: ${new Date().toISOString()}
Версия: 1.4-alfa

📊 СВОДКА:
  Текущий FPS: ${perf.fps}
  1% Low: ${perf.onePercentLow}
  Средний FPS (история): ${avgFps}
  Диапазон FPS: ${minFpsHistory}-${maxFpsHistory}
  Среднее время кадра: ${perf.avgFrameTime.toFixed(2)}ms
  Худший кадр: ${perf.worstFrameTime.toFixed(0)}ms
  Спайки (<30 FPS): ${perf.spikeCount}
  Память: ${perf.memoryMB?.toFixed(1) || 'N/A'}MB

🎮 СОСТОЯНИЕ ИГРЫ:
  Волна: ${this.scene.wave}
  Деньги: ${this.scene.money}
  Жизни: ${this.scene.gameState?.lives}
  Врагов: ${this.scene.enemies?.length || 0}
  Башен: ${this.scene.towers?.length || 0}
  Снарядов: ${this.scene.projectiles?.length || 0}
  Эффектов: ${this.scene.effects?.getCount?.() || 0}

🔴 СНАПШОТЫ ПРИ ПАДЕНИИ FPS (<30):
${this.frameSnapshots.slice(-20).map(s =>
            `[${s.time}] FPS:${s.fps} | 👾${s.enemies} врагов | 💥${s.projectiles} снарядов | ✨${s.effects} эффектов`
        ).join('\n') || '(нет данных - не было падений FPS)'}

📈 TIMELINE (FPS + События):
${timelineStr}

=== КОНЕЦ ОТЧЁТА ===`;

        navigator.clipboard.writeText(report);
        Logger.info(LogChannel.SYSTEM, `📋 Отчёт скопирован (${report.length} символов)`);
        console.log(report);
    }

    // === TAB SWITCHING ===
    private switchTab(tab: 'log' | 'graph' | 'cheats' | 'tests') {
        this.activeTab = tab;

        // Hide all
        (this.contentLog.parentElement as HTMLElement).style.display = 'none';
        this.contentGraph.style.display = 'none';
        this.contentCheats.style.display = 'none';
        this.contentTests.style.display = 'none';

        // Show selected
        if (tab === 'log') (this.contentLog.parentElement as HTMLElement).style.display = 'flex';
        if (tab === 'graph') this.contentGraph.style.display = 'flex';
        if (tab === 'cheats') this.contentCheats.style.display = 'block';
        if (tab === 'tests') this.contentTests.style.display = 'block';

        // Update tab button styles
        const buttons = this.container.querySelectorAll('button[data-tab]');
        buttons.forEach((btn: any) => {
            btn.style.color = btn.dataset.tab === tab ? '#fff' : '#888';
            btn.style.borderBottom = btn.dataset.tab === tab ? '2px solid #4caf50' : 'none';
        });
    }

    public toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';

        if (this.isVisible) {
            this.refreshLogs();
            this.toggleBtn.style.background = 'rgba(0,0,0,0.8)';
            // Start graph updates
            if (!this.graphUpdateInterval) {
                this.graphUpdateInterval = setInterval(() => this.updateGraph(), 100);
            }
        } else {
            if (this.graphUpdateInterval) {
                clearInterval(this.graphUpdateInterval);
                this.graphUpdateInterval = null;
            }
        }
    }

    public destroy(): void {
        if (this.keyDownHandler) {
            window.removeEventListener('keydown', this.keyDownHandler);
        }
        if (this.graphUpdateInterval) {
            clearInterval(this.graphUpdateInterval);
        }
        if (this.stateUpdateInterval) {
            clearInterval(this.stateUpdateInterval);
        }
        this.container.remove();
        this.toggleBtn.remove();
    }

    private refreshLogs() {
        this.contentLog.innerHTML = '';
        Logger.getHistory().forEach(entry => this.appendLog(entry));
    }

    private appendLog(entry: LogEntry) {
        if (!this.isVisible) return;
        if (entry.level === LogLevel.INFO && !this.showInfo) return;
        if (entry.level === LogLevel.WARN && !this.showWarn) return;
        if (entry.level === LogLevel.ERROR && !this.showError) return;
        if (entry.level === LogLevel.VERBOSE && !this.showVerbose) return;

        const row = document.createElement('div');
        const time = new Date(entry.timestamp).toISOString().split('T')[1].slice(0, 8);
        let color = '#ccc';
        if (entry.level === LogLevel.WARN) color = '#fc0';
        if (entry.level === LogLevel.ERROR) color = '#f44';

        row.style.color = color;
        row.style.fontFamily = 'monospace';
        row.style.fontSize = '10px';
        row.style.padding = '2px 0';
        row.style.borderBottom = '1px solid #222';

        const countStr = entry.count > 1 ? ` <span style="background:#555; color:#fff; padding:0 4px; border-radius:4px;">x${entry.count}</span>` : '';
        row.innerHTML = `<span style="color:#666">[${time}]</span> ${entry.message}${countStr}`;

        this.contentLog.appendChild(row);
        if (this.autoScroll) this.contentLog.scrollTop = this.contentLog.scrollHeight;
    }
}
