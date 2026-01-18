import { IWaveConfig } from './MapData';
import { CONFIG } from './Config';
import { UIUtils } from './UIUtils';

export class WaveEditor {
    private container!: HTMLElement;
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
        this.container = UIUtils.createContainer({
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
            // boxShadow not in IContainerOptions but let's assume it's fine or add it if strictly typed (it's not there, so I'll leave it or basic styling is enough)
        });
        // Manual override for shadow as it wasn't in my interface
        this.container.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';

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



        UIUtils.createButton(this.container, '+ Add Wave', () => {
            this.waves.push({ enemies: [] });
            this.renderWaves(wavesList);
        }, { background: '#1976d2', border: 'none', padding: '5px 10px', borderRadius: '4px' });

        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.gap = '10px';
        buttons.style.marginTop = '20px';


        // IButtonOptions doesn't have flex. style copying in UIUtils is manual. 
        // I created UIUtils.createButton to return the button, so I can apply extra styles.
        // Let's rewrite it slightly.
        const btnSave = UIUtils.createButton(buttons, 'Save & Close', () => {
            this.onSave(this.waves);
            this.destroy();
        }, { background: '#4caf50', border: 'none', padding: '5px 10px', borderRadius: '4px' });
        btnSave.style.flex = '1';

        const btnCancel = UIUtils.createButton(buttons, 'Cancel', () => {
            this.onClose();
            this.destroy();
        }, { background: '#f44336', border: 'none', padding: '5px 10px', borderRadius: '4px' });
        btnCancel.style.flex = '1';

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

            UIUtils.createButton(header, 'X', () => {
                this.waves.splice(index, 1);
                this.renderWaves(parent);
            }, {
                background: '#d32f2f',
                padding: '2px 6px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '4px'
            });
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

                // Speed dropdown
                const speedSelect = document.createElement('select');
                speedSelect.style.width = '60px';
                speedSelect.style.fontSize = '12px';
                const speeds = [
                    { value: '0.5', label: '0.5x' },
                    { value: '0.7', label: '0.7x' },
                    { value: '1.0', label: '1.0x' },
                    { value: '1.5', label: '1.5x' },
                    { value: '2.0', label: '2.0x' },
                ];
                speeds.forEach(({ value, label }) => {
                    const opt = document.createElement('option');
                    opt.value = value;
                    opt.innerText = label;
                    if (parseFloat(value) === (group.speed || 1.0)) opt.selected = true;
                    speedSelect.appendChild(opt);
                });
                speedSelect.onchange = (e) => {
                    group.speed = parseFloat((e.target as HTMLSelectElement).value);
                };

                // Spawn Rate dropdown
                const spawnSelect = document.createElement('select');
                spawnSelect.style.width = '70px';
                spawnSelect.style.fontSize = '12px';
                const spawnRates: Array<{ value: 'fast' | 'medium' | 'slow'; label: string }> = [
                    { value: 'fast', label: 'Fast' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'slow', label: 'Slow' },
                ];
                spawnRates.forEach(({ value, label }) => {
                    const opt = document.createElement('option');
                    opt.value = value;
                    opt.innerText = label;
                    if (value === (group.spawnRate || 'medium')) opt.selected = true;
                    spawnSelect.appendChild(opt);
                });
                spawnSelect.onchange = (e) => {
                    group.spawnRate = (e.target as HTMLSelectElement).value as 'fast' | 'medium' | 'slow';
                };

                UIUtils.createButton(groupRow, '-', () => {
                    wave.enemies.splice(gIndex, 1);
                    this.renderWaves(parent);
                }, { background: '#555', padding: '2px 6px', border: 'none', borderRadius: '4px' });

                groupRow.appendChild(typeSelect);
                groupRow.appendChild(document.createTextNode('x'));
                groupRow.appendChild(countInput);
                groupRow.appendChild(speedSelect);
                groupRow.appendChild(spawnSelect);

                groupsDiv.appendChild(groupRow);
            });

            UIUtils.createButton(waveDiv, '+ Add Enemy', () => {
                wave.enemies.push({ type: 'GRUNT', count: 1 });
                this.renderWaves(parent);
            }, { background: '#444', fontSize: '12px', width: '100%', border: 'none', borderRadius: '4px', padding: '5px 10px' });

            waveDiv.appendChild(groupsDiv);

            parent.appendChild(waveDiv);
        });
    }

    // styleBtn removed

    public destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
