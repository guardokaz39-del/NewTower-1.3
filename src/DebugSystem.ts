import { GameScene } from './scenes/GameScene';

export class DebugSystem {
    private scene: GameScene;
    private elDebugPanel: HTMLElement;
    private content: HTMLElement;
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
        const btn = document.createElement('div');
        btn.innerText = '🐞';
        btn.title = 'Debug Info';
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

        this.elDebugPanel = document.createElement('div');
        Object.assign(this.elDebugPanel.style, {
            position: 'absolute',
            top: '70px',
            right: '20px',
            width: '320px',
            maxHeight: '500px',
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

        const copyBtn = document.createElement('button');
        copyBtn.innerText = '📋 COPY FULL REPORT';
        Object.assign(copyBtn.style, {
            background: '#004400',
            color: '#0f0',
            border: '1px solid #0f0',
            padding: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
        });
        copyBtn.onclick = () => this.copyReport();
        this.elDebugPanel.appendChild(copyBtn);

        this.content = document.createElement('div');
        this.content.style.whiteSpace = 'pre-wrap';
        this.elDebugPanel.appendChild(this.content);

        document.body.appendChild(this.elDebugPanel);
    }

    public update() {
        if (this.elDebugPanel.style.display === 'none') return;

        const info = [
            `--- STATS ---`,
            `FPS Frame: ${this.scene.frames}`,
            `Enemies:   ${this.scene.enemies.length}`,
            `Towers:    ${this.scene.towers.length}`,
            `Projectiles: ${this.scene.projectiles.length}`,
            `Wave: ${this.scene.wave} | Active: ${this.scene.waveManager.isWaveActive}`,
            `Selection: ${this.scene.selectedTower ? 'YES' : 'NO'}`,
            ``,
            `--- LOGS ---`,
            ...this.logs.slice().reverse().slice(0, 15),
        ].join('\n');

        this.content.innerText = info;
    }

    private togglePanel() {
        const isHidden = this.elDebugPanel.style.display === 'none';
        this.elDebugPanel.style.display = isHidden ? 'flex' : 'none';
    }

    private copyReport() {
        const report = {
            meta: { ua: navigator.userAgent, res: `${window.innerWidth}x${window.innerHeight}` },
            state: {
                money: this.scene.money,
                wave: this.scene.wave,
                frames: this.scene.frames,
                enemiesCount: this.scene.enemies.length,
                towersCount: this.scene.towers.length,
            },
            logs: this.logs,
        };

        const text = '```json\n' + JSON.stringify(report, null, 2) + '\n```';
        navigator.clipboard
            .writeText(text)
            .then(() => {
                this.log('Report copied!');
            })
            .catch((err) => {
                console.error('Failed to copy', err);
            });
    }
}
