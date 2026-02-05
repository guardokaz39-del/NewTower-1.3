import { IWaveConfig } from './MapData';
import { WaveModel } from './editor/WaveModel';
import { WaveList } from './editor/components/WaveList';
import './editor/editor.css';

export class WaveEditor {
    private container!: HTMLElement;
    private model: WaveModel;
    private waveList!: WaveList;
    private onSave: (waves: IWaveConfig[]) => void;
    private onClose: () => void;

    /**
     * @param initialWaves - The initial configuration of waves (will be copied)
     * @param onSave - Callback when user clicks Save
     * @param onClose - Callback when user clicks Cancel
     */
    constructor(initialWaves: IWaveConfig[], onSave: (waves: IWaveConfig[]) => void, onClose: () => void) {
        this.onSave = onSave;
        this.onClose = onClose;

        // Initialize Model with draft data
        // WaveModel handles deep copying
        this.model = new WaveModel(initialWaves);

        this.createUI();

        // Subscribe to model changes to re-render the list
        // In the future, we could have granular updates, but full re-render is safe for now
        this.model.subscribe(() => {
            if (this.waveList) {
                this.waveList.render();
            }
        });
    }

    private createUI() {
        // 1. Overlay
        const overlay = document.createElement('div');
        overlay.className = 'wave-editor-overlay';

        // 2. Main Container
        this.container = document.createElement('div');
        this.container.className = 'wave-editor-container';

        // 3. Header
        const header = document.createElement('div');
        header.className = 'we-header';
        header.innerHTML = `
            <h2>Wave Configuration</h2>
            <div style="font-size: 12px; color: #888;">Draft Mode</div>
        `;
        this.container.appendChild(header);

        // 4. Content (The Wave List)
        const content = document.createElement('div');
        content.className = 'we-content';

        this.waveList = new WaveList(this.model);
        this.waveList.mount(content);

        this.container.appendChild(content);

        // 5. Footer (Buttons)
        const footer = document.createElement('div');
        footer.className = 'we-footer';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'we-btn we-btn-primary';
        saveBtn.style.flex = '1';
        saveBtn.textContent = 'Save & Close';
        saveBtn.onclick = () => this.save();

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'we-btn we-btn-danger';
        cancelBtn.style.flex = '1';
        cancelBtn.textContent = 'Cancel';
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

    private save() {
        if (!this.model.validate()) {
            alert('Invalid configuration! Check for empty waves or groups.');
            return;
        }
        this.onSave(this.model.getWaves());
        this.destroy();
    }

    private close() {
        this.onClose();
        this.destroy();
    }

    public destroy() {
        // Component Cleanup
        if (this.waveList) {
            this.waveList.destroy();
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
