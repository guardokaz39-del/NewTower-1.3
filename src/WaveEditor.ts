import { IWaveConfig } from './MapData';
import { WaveModel } from './editor/WaveModel';
import { getAllCardKeys, resolveAllowedCards } from './MapData';
import { WaveList } from './editor/components/WaveList';
import { CONFIG } from './Config';
import { WavePresetPanel } from './editor/components/WavePresetPanel';
import { ValidationPanel } from './editor/components/ValidationPanel';
import './editor/editor.css';

export class WaveEditor {
    private container!: HTMLElement;
    private model: WaveModel;
    private waveList!: WaveList;
    private presetPanel!: WavePresetPanel;
    private validationPanel!: ValidationPanel;
    private allowedCards: string[];
    private onSave: (waves: IWaveConfig[], allowedCards: string[] | undefined) => void;
    private onClose: () => void;

    // Toolbar elements (for updating disabled state)
    private undoBtn!: HTMLButtonElement;
    private redoBtn!: HTMLButtonElement;
    private statusBar!: HTMLElement;

    // Keyboard handler reference for cleanup
    private boundKeyHandler: (e: KeyboardEvent) => void;

    /**
     * @param initialWaves - The initial configuration of waves (will be copied)
     * @param initialAllowedCards - The initial allowed cards for this map
     * @param onSave - Callback when user clicks Save
     * @param onClose - Callback when user clicks Cancel
     */
    constructor(
        initialWaves: IWaveConfig[],
        initialAllowedCards: string[] | undefined,
        onSave: (waves: IWaveConfig[], allowedCards: string[] | undefined) => void,
        onClose: () => void
    ) {
        this.onSave = onSave;
        this.onClose = onClose;
        this.allowedCards = initialAllowedCards ? [...initialAllowedCards] : [...getAllCardKeys()];

        // Initialize Model with draft data
        this.model = new WaveModel(initialWaves);

        // Keyboard shortcuts
        this.boundKeyHandler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.model.undo();
            } else if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.model.redo();
            } else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.save();
            }
        };
        document.addEventListener('keydown', this.boundKeyHandler);

        this.createUI();

        // Subscribe to model changes to re-render the list and update toolbar
        this.model.subscribe(() => {
            if (this.waveList) {
                this.waveList.render();
            }
            if (this.validationPanel) {
                this.validationPanel.updateResult(this.model.validateExtended());
            }
            this.updateToolbar();
        });
    }

    private createUI() {
        // 1. Overlay
        const overlay = document.createElement('div');
        overlay.className = 'wave-editor-overlay';

        // 2. Main Container (wider)
        this.container = document.createElement('div');
        this.container.className = 'wave-editor-container';

        // 3. Header
        const header = document.createElement('div');
        header.className = 'we-header';

        const headerLeft = document.createElement('div');
        headerLeft.innerHTML = `<h2>Конфигурация Волн</h2>`;
        header.appendChild(headerLeft);

        // Toolbar: Undo / Redo
        const toolbar = document.createElement('div');
        toolbar.className = 'we-toolbar';

        this.undoBtn = document.createElement('button');
        this.undoBtn.className = 'we-btn we-btn-icon';
        this.undoBtn.textContent = '↩️';
        this.undoBtn.title = 'Отменить (Ctrl+Z)';
        this.undoBtn.disabled = true;
        this.undoBtn.onclick = () => this.model.undo();
        toolbar.appendChild(this.undoBtn);

        this.redoBtn = document.createElement('button');
        this.redoBtn.className = 'we-btn we-btn-icon';
        this.redoBtn.textContent = '↪️';
        this.redoBtn.title = 'Повторить (Ctrl+Y)';
        this.redoBtn.disabled = true;
        this.redoBtn.onclick = () => this.model.redo();
        toolbar.appendChild(this.redoBtn);

        header.appendChild(toolbar);
        this.container.appendChild(header);

        // Add WavePresetPanel here
        this.presetPanel = new WavePresetPanel(this.model);
        this.presetPanel.mount(this.container);

        // Status Bar
        this.statusBar = document.createElement('div');
        this.statusBar.className = 'we-status-bar';
        this.container.appendChild(this.statusBar);
        this.updateToolbar(); // Initial status

        // 4. Content (The Wave List)
        const content = document.createElement('div');
        content.className = 'we-content';

        this.waveList = new WaveList(this.model);
        this.waveList.mount(content);

        this.container.appendChild(content);

        // Add Validation Panel here
        this.validationPanel = new ValidationPanel(this.model.validateExtended());
        this.validationPanel.mount(this.container);

        // === Allowed Cards Section ===
        const cardSection = document.createElement('div');
        cardSection.className = 'we-card-section';
        cardSection.style.cssText = 'padding: 10px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.1); margin-top: 10px;';
        cardSection.innerHTML = '<h3 style="margin:0 0 10px 0; font-size:14px; color:#aaa;">🃏 Доступные карты башен</h3>';

        const cardGrid = document.createElement('div');
        cardGrid.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap;';

        const allKeys = getAllCardKeys();
        allKeys.forEach(key => {
            const config = (CONFIG as any).CARD_TYPES[key];
            if (!config) return;
            const label = document.createElement('label');
            label.className = 'we-card-checkbox';
            label.style.cssText = 'display:flex; align-items:center; gap:6px; padding:4px 0; color:#ddd; cursor:pointer; font-size:13px;';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = this.allowedCards.includes(key);
            cb.onchange = () => {
                if (cb.checked) {
                    if (!this.allowedCards.includes(key)) this.allowedCards.push(key);
                } else {
                    this.allowedCards = this.allowedCards.filter(k => k !== key);
                }
            };
            label.appendChild(cb);
            label.appendChild(document.createTextNode(` ${config.icon || ''} ${config.name || key}`));
            cardGrid.appendChild(label);
        });
        cardSection.appendChild(cardGrid);
        this.container.appendChild(cardSection);

        // 5. Footer (Buttons)
        const footer = document.createElement('div');
        footer.className = 'we-footer';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'we-btn we-btn-primary';
        saveBtn.style.flex = '1';
        saveBtn.textContent = '💾 Сохранить';
        saveBtn.onclick = () => this.save();

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'we-btn we-btn-danger';
        cancelBtn.style.flex = '1';
        cancelBtn.textContent = 'Отмена';
        cancelBtn.onclick = () => this.close();

        footer.appendChild(saveBtn);
        footer.appendChild(cancelBtn);
        this.container.appendChild(footer);

        // Mount Overlay to Body
        overlay.appendChild(this.container);
        document.body.appendChild(overlay);

        // Update reference to point to overlay for destruction
        this.container = overlay;
    }

    private updateToolbar() {
        // Undo/Redo button state
        if (this.undoBtn) this.undoBtn.disabled = !this.model.canUndo();
        if (this.redoBtn) this.redoBtn.disabled = !this.model.canRedo();

        // Status bar
        if (this.statusBar) {
            const waves = this.model.getWaves();
            const waveCount = waves.length;
            const totalEnemies = waves.reduce((sum, w) => sum + w.enemies.reduce((s, g) => s + g.count, 0), 0);
            let totalDuration = 0;
            for (let i = 0; i < waveCount; i++) {
                totalDuration += this.model.getEstimatedDuration(i);
            }
            this.statusBar.textContent = `Черновик • ${waveCount} волн • ${totalEnemies} врагов • ~${totalDuration.toFixed(1)}с`;
        }
    }

    private save() {
        const result = this.model.validateExtended();
        if (!result.isValid) {
            this.validationPanel.updateResult(result);
            return;
        }

        // Validation: не менее 1 карты разрешено
        if (this.allowedCards.length === 0) {
            alert('Ошибка: Выберите хотя бы одну карту башни!');
            return;
        }

        const finalCards = resolveAllowedCards(this.allowedCards);
        this.onSave(this.model.getWaves(), finalCards);
        this.destroy();
    }

    private close() {
        this.onClose();
        this.destroy();
    }

    public destroy() {
        // Keyboard listener cleanup
        document.removeEventListener('keydown', this.boundKeyHandler);

        // Component Cleanup
        if (this.waveList) {
            this.waveList.destroy();
        }
        if (this.presetPanel) {
            this.presetPanel.destroy();
        }
        if (this.validationPanel) {
            this.validationPanel.destroy();
        }

        // Model Cleanup
        if (this.model) {
            this.model.destroy();
        }

        // DOM Cleanup
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
