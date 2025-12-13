import { IWaveConfig } from './MapData';
import { CONFIG } from './Config';

export class WaveEditor {
    private container: HTMLElement;
    private waves: IWaveConfig[] = [];
    private onSave: (waves: IWaveConfig[]) => void;
    private onClose: () => void;

    constructor(initialWaves: IWaveConfig[], onSave: (waves: IWaveConfig[]) => void, onClose: () => void) {
        // Deep copy to avoid mutating original until save
        this.waves = JSON.parse(JSON.stringify(initialWaves || []));
        this.onSave = onSave;
        this.onClose = onClose;
        this.createUI();
    }

    private createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            maxHeight: '80vh',
            overflowY: 'auto',
            background: '#222',
            border: '2px solid #444',
            borderRadius: '8px',
            padding: '20px',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: '2000',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        });

        const title = document.createElement('h2');
        title.innerText = 'Wave Configuration';
        title.style.margin = '0 0 10px 0';
        title.style.textAlign = 'center';
        this.container.appendChild(title);

        const wavesList = document.createElement('div');
        wavesList.id = 'waves-list';
        wavesList.style.display = 'flex';
        wavesList.style.flexDirection = 'column';
        wavesList.style.gap = '10px';
        this.container.appendChild(wavesList);

        this.renderWaves(wavesList);

        const addWaveBtn = document.createElement('button');
        addWaveBtn.innerText = '+ Add Wave';
        this.styleBtn(addWaveBtn, '#1976d2');
        addWaveBtn.onclick = () => {
            this.waves.push({ enemies: [] });
            this.renderWaves(wavesList);
        };
        this.container.appendChild(addWaveBtn);

        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.gap = '10px';
        buttons.style.marginTop = '20px';

        const saveBtn = document.createElement('button');
        saveBtn.innerText = 'Save & Close';
        this.styleBtn(saveBtn, '#4caf50');
        saveBtn.style.flex = '1';
        saveBtn.onclick = () => {
            this.onSave(this.waves);
            this.destroy();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancel';
        this.styleBtn(cancelBtn, '#f44336');
        cancelBtn.style.flex = '1';
        cancelBtn.onclick = () => {
            this.onClose();
            this.destroy();
        };

        buttons.appendChild(saveBtn);
        buttons.appendChild(cancelBtn);
        this.container.appendChild(buttons);

        document.body.appendChild(this.container);
    }

    private renderWaves(parent: HTMLElement) {
        parent.innerHTML = '';
        this.waves.forEach((wave, index) => {
            const waveDiv = document.createElement('div');
            Object.assign(waveDiv.style, {
                background: '#333',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #555',
            });

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.marginBottom = '5px';
            header.innerHTML = `<strong>Wave ${index + 1}</strong>`;

            const delWaveBtn = document.createElement('button');
            delWaveBtn.innerText = 'X';
            this.styleBtn(delWaveBtn, '#d32f2f');
            delWaveBtn.style.padding = '2px 6px';
            delWaveBtn.style.fontSize = '12px';
            delWaveBtn.onclick = () => {
                this.waves.splice(index, 1);
                this.renderWaves(parent);
            };
            header.appendChild(delWaveBtn);
            waveDiv.appendChild(header);

            // Enemy groups
            const groupsDiv = document.createElement('div');
            groupsDiv.style.marginLeft = '10px';

            wave.enemies.forEach((group, gIndex) => {
                const groupRow = document.createElement('div');
                groupRow.style.display = 'flex';
                groupRow.style.gap = '5px';
                groupRow.style.alignItems = 'center';
                groupRow.style.marginBottom = '5px';

                const typeSelect = document.createElement('select');
                const types = Object.keys(CONFIG.ENEMY_TYPES);
                types.forEach((t) => {
                    const opt = document.createElement('option');
                    opt.value = t;
                    opt.innerText = t;
                    if (t === group.type) opt.selected = true;
                    typeSelect.appendChild(opt);
                });
                typeSelect.onchange = (e) => {
                    group.type = (e.target as HTMLSelectElement).value;
                };

                const countInput = document.createElement('input');
                countInput.type = 'number';
                countInput.value = group.count.toString();
                countInput.min = '1';
                countInput.style.width = '50px';
                countInput.onchange = (e) => {
                    group.count = parseInt((e.target as HTMLInputElement).value) || 1;
                };

                const delGroupBtn = document.createElement('button');
                delGroupBtn.innerText = '-';
                this.styleBtn(delGroupBtn, '#555');
                delGroupBtn.style.padding = '2px 6px';
                delGroupBtn.onclick = () => {
                    wave.enemies.splice(gIndex, 1);
                    this.renderWaves(parent);
                };

                groupRow.appendChild(typeSelect);
                groupRow.appendChild(document.createTextNode('x'));
                groupRow.appendChild(countInput);
                groupRow.appendChild(delGroupBtn);
                groupsDiv.appendChild(groupRow);
            });

            const addGroupBtn = document.createElement('button');
            addGroupBtn.innerText = '+ Add Enemy';
            this.styleBtn(addGroupBtn, '#444');
            addGroupBtn.style.fontSize = '12px';
            addGroupBtn.style.width = '100%';
            addGroupBtn.onclick = () => {
                wave.enemies.push({ type: 'GRUNT', count: 1 });
                this.renderWaves(parent);
            };

            waveDiv.appendChild(groupsDiv);
            waveDiv.appendChild(addGroupBtn);
            parent.appendChild(waveDiv);
        });
    }

    private styleBtn(btn: HTMLElement, color: string) {
        Object.assign(btn.style, {
            background: color,
            color: '#fff',
            border: 'none',
            padding: '5px 10px',
            cursor: 'pointer',
            borderRadius: '4px',
        });
    }

    public destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
