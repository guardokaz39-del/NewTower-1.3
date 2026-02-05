import { BaseComponent } from './BaseComponent';
import { WaveModel } from '../WaveModel';
import { EnemyGroupRow } from './EnemyGroupRow';
import { ThreatMeter } from './ThreatMeter';

export class WaveList extends BaseComponent<WaveModel> {
    private expandedWaveIndex: number = 0; // Default open first wave

    public render(): void {
        this.element.innerHTML = '';
        this.element.className = 'we-wave-list';
        this.element.style.display = 'flex';
        this.element.style.flexDirection = 'column';
        this.element.style.gap = '10px';

        const waves = this.data.getWaves();

        waves.forEach((wave, index) => {
            this.renderWaveItem(index);
        });

        // Add Wave Button
        const addBtn = this.createElement('button', 'we-btn we-btn-secondary we-btn-full', '+ Add Wave');
        addBtn.onclick = () => this.data.addWave();
        this.element.appendChild(addBtn);
    }

    private renderWaveItem(index: number) {
        const wave = this.data.getWave(index);
        const threat = this.data.getThreat(index);

        const container = this.createElement('div', 'we-wave-item');

        // --- Header ---
        const header = this.createElement('div', 'we-wave-header');
        header.onclick = (e) => {
            // Prevent toggling if clicking delete button
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;

            if (this.expandedWaveIndex === index) {
                this.expandedWaveIndex = -1; // Collapse
            } else {
                this.expandedWaveIndex = index; // Expand
            }
            this.render(); // Re-render to update view
        };

        const title = this.createElement('span', 'we-wave-title', `Wave ${index + 1}`);
        header.appendChild(title);

        // Preview of threat in header if collapsed
        if (this.expandedWaveIndex !== index) {
            const threatPreview = this.createElement('span', '', `${Math.round(threat)} 💀`);
            threatPreview.style.fontSize = '12px';
            threatPreview.style.color = '#888';
            threatPreview.style.marginLeft = 'auto'; // Right align
            threatPreview.style.marginRight = '10px';
            header.appendChild(threatPreview);
        }

        const delBtn = this.createElement('button', 'we-btn we-btn-icon', '✕');
        delBtn.style.marginLeft = this.expandedWaveIndex !== index ? '0' : 'auto';
        delBtn.onclick = () => this.data.removeWave(index);
        header.appendChild(delBtn);

        container.appendChild(header);

        // --- Content (if expanded) ---
        if (this.expandedWaveIndex === index) {
            const content = this.createElement('div', 'we-wave-content');

            // 1. Threat Meter
            const meter = new ThreatMeter({ threat });
            meter.mount(content);

            // 2. Enemy Groups
            const groupsContainer = this.createElement('div');
            groupsContainer.style.marginTop = '10px';

            wave.enemies.forEach((group, gIndex) => {
                const row = new EnemyGroupRow({
                    type: group.type,
                    count: group.count,
                    spawnPattern: group.spawnPattern || 'normal',
                    onChange: (updates) => {
                        this.data.updateEnemyGroup(index, gIndex, updates);
                    },
                    onRemove: () => {
                        this.data.removeEnemyGroup(index, gIndex);
                    }
                });
                row.mount(groupsContainer);
            });
            content.appendChild(groupsContainer);

            // 3. Add Enemy Button
            const addEnemyBtn = this.createElement('button', 'we-btn we-btn-secondary', '+ Add Enemy Group');
            addEnemyBtn.style.marginTop = '8px';
            addEnemyBtn.style.fontSize = '12px';
            addEnemyBtn.style.padding = '4px 8px';
            addEnemyBtn.style.width = '100%';
            addEnemyBtn.onclick = () => this.data.addEnemyGroup(index);
            content.appendChild(addEnemyBtn);

            container.appendChild(content);
        }

        this.element.appendChild(container);
    }
}
