import { GameScene } from './scenes/GameScene';

export class DebugSystem {
    private scene: GameScene;
    private elDebugPanel!: HTMLElement;
    private content!: HTMLElement;
    private logs: string[] = [];
    private maxLogs: number = 50;

    constructor(scene: GameScene) {
        this.scene = scene;
        this.createUI();
        this.log('Debug System Initialized');
    }

    public log(msg: string) {
        const time = new Date().toISOString().split('T')[1].split('.')[0];
        const line = `[${time}] ${msg}`;
        this.logs.push(line);
        if (this.logs.length > this.maxLogs) this.logs.shift();
    }

    private createUI() {
        // Toggle Button
        const btn = document.createElement('div');
        btn.innerText = '🐞';
        btn.title = 'Debug Info (Press ~)';
        Object.assign(btn.style, {
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            background: 'rgba(0,0,0,0.8)',
            color: '#0f0',
            border: '2px solid #444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: '20000',
            userSelect: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            transition: 'transform 0.1s',
        });

        btn.onclick = () => this.togglePanel();
        document.body.appendChild(btn);

        // Global Toggle Key
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Backquote') {
                e.preventDefault();
                this.togglePanel();
            }
        });

        // Panel Container
        this.elDebugPanel = document.createElement('div');
        Object.assign(this.elDebugPanel.style, {
            position: 'absolute',
            top: '70px',
            right: '20px',
            width: '320px',
            maxHeight: '600px',
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid #0f0',
            borderRadius: '10px',
            color: '#0f0',
            fontFamily: 'Consolas, monospace',
            fontSize: '11px',
            padding: '10px',
            display: 'none',
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto',
            zIndex: '20000',
            boxShadow: '0 5px 20px rgba(0,0,0,0.8)',
        });

        // Controls
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '5px';

        const copyBtn = document.createElement('button');
        copyBtn.innerText = '📋 COPY';
        Object.assign(copyBtn.style, { flex: '1', background: '#004400', color: '#0f0', border: '1px solid #0f0', cursor: 'pointer' });
        copyBtn.onclick = () => this.copyReport();

        const clearBtn = document.createElement('button');
        clearBtn.innerText = '🗑️ CLEAR';
        Object.assign(clearBtn.style, { flex: '1', background: '#440000', color: '#f00', border: '1px solid #f00', cursor: 'pointer' });
        clearBtn.onclick = () => { this.logs = []; this.update(); };

        controls.appendChild(copyBtn);
        controls.appendChild(clearBtn);
        this.elDebugPanel.appendChild(controls);

        // Content Area
        this.content = document.createElement('div');
        this.content.style.whiteSpace = 'pre-wrap';
        this.elDebugPanel.appendChild(this.content);

        // Console Input
        const inputContainer = document.createElement('div');
        inputContainer.style.marginTop = '10px';
        inputContainer.style.borderTop = '1px solid #333';
        inputContainer.style.paddingTop = '5px';

        const input = document.createElement('input');
        input.placeholder = 'Enter command (help)...';
        Object.assign(input.style, {
            width: '100%',
            background: '#111',
            border: '1px solid #444',
            color: '#fff',
            padding: '5px',
            fontFamily: 'Consolas, monospace'
        });

        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(input.value);
                input.value = '';
            }
            e.stopPropagation(); // Prevent game hotkeys
        };

        inputContainer.appendChild(input);
        this.elDebugPanel.appendChild(inputContainer);

        document.body.appendChild(this.elDebugPanel);
    }

    private executeCommand(cmdStr: string) {
        const parts = cmdStr.trim().split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        this.log(`> ${cmdStr}`);

        switch (cmd) {
            case 'help':
                this.log('Commands: money [amount], wave [n], spawn [id], killall, speed [x], win, lose');
                break;
            case 'money':
                const amount = parseInt(args[0]) || 1000;
                this.scene.addMoney(amount);
                this.log(`Added ${amount} gold`);
                break;
            case 'wave':
                const w = parseInt(args[0]) || 1;
                this.scene.wave += w;
                // this.scene.waveManager.waveNumber = this.scene.wave; // Sync - REMOVED, not needed
                this.log(`Jumped to wave ${this.scene.wave}`);
                break;
            case 'spawn':
                const id = args[0] || 'grunt';
                this.scene.spawnEnemy(id);
                this.log(`Spawned ${id}`);
                break;
            case 'killall':
                this.scene.enemies.forEach(e => e.takeDamage(99999));
                this.log('Killed all enemies');
                break;
            case 'speed':
                const s = parseFloat(args[0]) || 1.0;
                this.scene.gameState.timeScale = s;
                this.log(`Time scale: ${s}`);
                break;
            case 'lose':
                this.scene.loseLife(9999);
                break;
            default:
                this.log('Unknown command. Try "help"');
        }
        this.update();
    }

    public update() {
        if (this.elDebugPanel.style.display === 'none') return;

        const info = [
            `--- STATS ---`,
            `FPS Frame: ${this.scene.gameState.frames}`,
            `Enemies:   ${this.scene.enemies.length}`,
            `Towers:    ${this.scene.towers.length}`,
            `Pools:     P:${this.scene.projectilePool ? 'Active' : 'N/A'} E:${this.scene.enemyPool ? 'Active' : 'N/A'}`,
            `Wave: ${this.scene.wave} | Active: ${this.scene.waveManager.isWaveActive}`,
            ``,
            `--- LOGS ---`,
            ...this.logs.slice().reverse().slice(0, 15),
        ].join('\n');

        this.content.innerText = info;
    }

    private togglePanel() {
        const isHidden = this.elDebugPanel.style.display === 'none';
        this.elDebugPanel.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            // Focus input if opening
            const input = this.elDebugPanel.querySelector('input');
            if (input) input.focus();
        }
    }

    private copyReport() {
        const report = {
            meta: { ua: navigator.userAgent, res: `${window.innerWidth}x${window.innerHeight}` },
            state: {
                money: this.scene.money,
                wave: this.scene.wave,
                frames: this.scene.gameState.frames,
                enemiesCount: this.scene.enemies.length,
            },
            logs: this.logs,
        };

        const text = '```json\n' + JSON.stringify(report, null, 2) + '\n```';
        navigator.clipboard.writeText(text).then(() => this.log('Report copied!'));
    }
}
