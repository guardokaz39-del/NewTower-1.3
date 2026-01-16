import { IGameScene } from '../scenes/IGameScene';
import { UIUtils } from '../UIUtils';
import { SoundManager, SoundPriority } from '../SoundManager';

export class PauseMenu {
    private scene: IGameScene;
    private elUiLayer: HTMLElement;
    private elPauseMenu: HTMLElement | null = null;

    constructor(scene: IGameScene) {
        this.scene = scene;
        this.elUiLayer = document.getElementById('ui-layer')!;
        this.init();
    }

    private init() {
        // ESCAPE TO PAUSE - bind listener
        this.boundKeyHandler = this.handleKeyDown.bind(this);
        window.addEventListener('keydown', this.boundKeyHandler);

        // Create menu overlay
        this.createOverlay();
    }

    private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

    private handleKeyDown(e: KeyboardEvent) {
        if (e.code === 'Escape') {
            this.scene.togglePause();
        }
    }

    public destroy() {
        if (this.boundKeyHandler) {
            window.removeEventListener('keydown', this.boundKeyHandler);
            this.boundKeyHandler = null;
        }
        if (this.elPauseMenu) {
            this.elPauseMenu.remove();
            this.elPauseMenu = null;
        }
    }

    private createOverlay() {
        if (!document.getElementById('pause-menu')) {
            const menu = UIUtils.createOverlay('pause-menu');
            this.elPauseMenu = menu;
            this.renderMainMenu(menu);
        } else {
            this.elPauseMenu = document.getElementById('pause-menu');
        }
    }

    private renderMainMenu(menu: HTMLElement) {
        menu.innerHTML = ''; // Clear
        const content = document.createElement('div');
        Object.assign(content.style, {
            background: '#222',
            padding: '40px',
            borderRadius: '8px',
            border: '2px solid #555',
            textAlign: 'center',
            minWidth: '300px'
        });

        content.innerHTML = `
            <h1 style="margin-top: 0; color: #ffd700; text-transform: uppercase; letter-spacing: 2px;">Paused</h1>
            <p style="color: #aaa; font-size: 14px; margin-top: -10px;">Press ESC to resume</p>
        `;

        // Continue
        UIUtils.createButton(content, 'Continue', () => {
            SoundManager.play('click', SoundPriority.HIGH);
            this.scene.togglePause();
        }, { background: '#4caf50', width: '100%', padding: '12px', fontSize: '16px', border: 'none' });

        content.appendChild(document.createElement('br'));

        // Settings
        UIUtils.createButton(content, 'Settings', () => {
            SoundManager.play('click', SoundPriority.HIGH);
            this.renderSettings(menu);
        }, { background: '#2196f3', width: '100%', padding: '12px', fontSize: '16px', border: 'none', marginTop: '10px' });

        // Exit
        UIUtils.createButton(content, 'Exit to Menu', () => {
            SoundManager.play('click', SoundPriority.HIGH);
            this.scene.togglePause();
            this.scene.game.toMenu();
        }, { background: '#f44336', width: '100%', padding: '12px', fontSize: '16px', border: 'none', marginTop: '10px' });

        menu.appendChild(content);
    }

    private renderSettings(menu: HTMLElement) {
        menu.innerHTML = '';
        const content = document.createElement('div');
        Object.assign(content.style, {
            background: '#222',
            padding: '40px',
            borderRadius: '8px',
            border: '2px solid #555',
            textAlign: 'center',
            minWidth: '300px'
        });

        content.innerHTML = `<h2 style="color:#ffd700; margin:0 0 20px 0;">Audio Settings</h2>`;

        const addSlider = (label: string, val: number, onChange: (v: number) => void) => {
            const row = document.createElement('div');
            row.style.marginBottom = '10px';
            row.style.textAlign = 'left';
            row.innerHTML = `<label style="display:inline-block; width:60px;">${label}</label>`;

            const input = document.createElement('input');
            input.type = 'range';
            input.min = '0';
            input.max = '1';
            input.step = '0.1';
            input.value = val.toString();
            input.oninput = (e) => onChange(parseFloat((e.target as HTMLInputElement).value));

            row.appendChild(input);
            content.appendChild(row);
        };

        addSlider('Master', SoundManager.MASTER_VOLUME, (v) => SoundManager.setVolume(v));
        addSlider('SFX', SoundManager.SFX_VOLUME, (v) => SoundManager.SFX_VOLUME = v);
        addSlider('Music', SoundManager.MUSIC_VOLUME, (v) => SoundManager.MUSIC_VOLUME = v);

        // Back button
        UIUtils.createButton(content, 'Back', () => {
            SoundManager.play('click', SoundPriority.HIGH);
            this.renderMainMenu(menu);
        }, { background: '#555', marginTop: '20px', width: '100%', padding: '10px', border: 'none' });

        menu.appendChild(content);
    }

    public update(paused: boolean) {
        if (this.elPauseMenu) {
            this.elPauseMenu.style.display = paused ? 'flex' : 'none';
        }
    }
}
