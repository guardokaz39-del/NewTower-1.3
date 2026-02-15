import { IGameScene } from './scenes/IGameScene';
import { BestiaryUI } from './ui/bestiary/BestiaryUI';
import { UIUtils } from './UIUtils';
import { EventBus, Events } from './EventBus';

export class BestiarySystem {
    private scene: IGameScene;
    private unlockedEnemies: Set<string> = new Set();
    private ui: BestiaryUI | null = null;
    private btn!: HTMLElement;

    private unsubSpawned: () => void = () => { };

    constructor(scene: IGameScene) {
        this.scene = scene;
        this.loadProgress(); // Load saved unlocks
        this.createButton();

        // Start with basic enemy unlocked (if not already loaded)
        this.unlock('grunt');

        // Listen for enemy spawns to unlock them
        this.unsubSpawned = EventBus.getInstance().on(Events.ENEMY_SPAWNED, (enemyType: string) => {
            this.unlock(enemyType);
        });
    }

    public destroy() {
        this.unsubSpawned();
        if (this.btn && this.btn.parentNode) {
            this.btn.parentNode.removeChild(this.btn);
        }
        if (this.ui) {
            this.ui.hide();
            // BestiaryUI doesn't strictly need destroy if it just removes DOM, 
            // but we could add it if needed. For now, removing the button is key.
        }
    }

    private loadProgress() {
        try {
            const saved = localStorage.getItem('nt_bestiary_unlocks');
            if (saved) {
                const ids = JSON.parse(saved);
                if (Array.isArray(ids)) {
                    ids.forEach(id => this.unlockedEnemies.add(id));
                }
            }
        } catch (e) {
            console.error('Failed to load bestiary progress', e);
        }
    }

    private saveProgress() {
        try {
            const data = JSON.stringify(Array.from(this.unlockedEnemies));
            localStorage.setItem('nt_bestiary_unlocks', data);
        } catch (e) {
            console.error('Failed to save bestiary progress', e);
        }
    }

    public unlock(typeId: string) {
        const id = typeId.toLowerCase();
        if (!this.unlockedEnemies.has(id)) {
            this.unlockedEnemies.add(id);
            this.saveProgress();
            if (this.ui) this.ui.unlockEnemy(id);
        }
    }

    private getUI(): BestiaryUI {
        if (!this.ui) {
            this.ui = new BestiaryUI(this.scene, this.unlockedEnemies);
        }
        return this.ui;
    }

    private toggle() {
        this.getUI().toggle();
    }

    private createButton() {
        this.btn = UIUtils.createButton(document.body, '📖', () => this.toggle(), {
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            fontSize: '24px',
            padding: '0',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            border: '2px solid #aaa',
            zIndex: '100',
            title: 'Bestiary'
        });

        // Hover effect for button
        this.btn.onmousedown = () => (this.btn.style.transform = 'scale(0.9)');
        this.btn.onmouseup = () => (this.btn.style.transform = 'scale(1)');
    }
}
