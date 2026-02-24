import { BaseComponent } from './BaseComponent';
import { WaveModel } from '../WaveModel';
import { EnemyGroupRow } from './EnemyGroupRow';
import { ThreatMeter } from './ThreatMeter';
import { WaveSettingsPanel } from './WaveSettingsPanel';
import { WaveTimeline } from './WaveTimeline';

export class WaveList extends BaseComponent<WaveModel> {
    private expandedWaveIndex: number = 0; // Default open first wave

    public render(): void {
        const waveCount = this.data.getWaveCount();
        if (this.expandedWaveIndex >= waveCount) {
            this.expandedWaveIndex = waveCount > 0 ? waveCount - 1 : -1;
        }

        this.element.innerHTML = '';
        this.element.className = 'we-wave-list';
        this.element.style.display = 'flex';
        this.element.style.flexDirection = 'column';
        this.element.style.gap = '10px';

        // --- Bulk Toolbar ---
        const bulkToolbar = this.createElement('div', 'we-bulk-toolbar');
        const delAllBtn = this.createElement('button', 'we-btn we-btn-danger we-btn-icon', '🗑️');
        delAllBtn.title = 'Удалить все волны';
        delAllBtn.onclick = () => {
            if (confirm('Удалить все волны?')) {
                this.data.replaceAllWaves([]);
            }
        };
        const dupAllBtn = this.createElement('button', 'we-btn we-btn-icon', '📋');
        dupAllBtn.title = 'Дублировать все';
        dupAllBtn.onclick = () => {
            const copy = JSON.parse(JSON.stringify(this.data.getWaves()));
            const newWaves = [];
            for (const w of copy) {
                newWaves.push(w);
                newWaves.push(JSON.parse(JSON.stringify(w)));
            }
            this.data.replaceAllWaves(newWaves);
        };
        bulkToolbar.appendChild(delAllBtn);
        bulkToolbar.appendChild(dupAllBtn);
        this.element.appendChild(bulkToolbar);

        const waves = this.data.getWaves();

        waves.forEach((_wave, index) => {
            this.renderWaveItem(index);
        });

        // Add Wave Button
        const addBtn = this.createElement('button', 'we-btn we-btn-secondary we-btn-full', '+ Добавить Волну');
        addBtn.onclick = () => this.data.addWave();
        this.element.appendChild(addBtn);
    }

    private renderWaveItem(index: number) {
        const wave = this.data.getWave(index);
        const threat = this.data.getThreat(index);
        const isLast = index === this.data.getWaveCount() - 1;
        const validation = this.data.validateExtended();

        const container = this.createElement('div', 'we-wave-item');

        const hasError = validation.errors.some(e => e.waveIndex === index);
        const hasWarning = validation.warnings.some(w => w.waveIndex === index);

        if (hasError) container.classList.add('we-wave-item--error');
        else if (hasWarning) container.classList.add('we-wave-item--warning');

        // --- Header ---
        const header = this.createElement('div', 'we-wave-header');
        header.onclick = (e) => {
            // Prevent toggling if clicking buttons
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;

            if (this.expandedWaveIndex === index) {
                this.expandedWaveIndex = -1; // Collapse
            } else {
                this.expandedWaveIndex = index; // Expand
            }
            this.render(); // Re-render
        };

        const titleText = wave.name
            ? `Волна ${index + 1} — ${wave.name}`
            : `Волна ${index + 1}`;
        const title = this.createElement('span', 'we-wave-title', titleText);
        header.appendChild(title);

        // Cycle badge on last wave
        if (isLast) {
            const cycleBadge = this.createElement('span', 'we-cycle-badge', '∞ Повторяется');
            header.appendChild(cycleBadge);
        }

        // Preview of threat in header if collapsed
        if (this.expandedWaveIndex !== index) {
            const duration = this.data.getEstimatedDuration(index);
            const threatPreview = this.createElement('span', '', `${Math.round(threat)} 💀 • ~${duration.toFixed(1)}с`);
            threatPreview.style.fontSize = '12px';
            threatPreview.style.color = '#888';
            threatPreview.style.marginLeft = 'auto';
            threatPreview.style.marginRight = '10px';
            header.appendChild(threatPreview);
        }

        // Move Up button
        if (index > 0) {
            const moveUpBtn = this.createElement('button', 'we-move-btn', '🔼');
            moveUpBtn.title = 'Перемещение волны вверх';
            moveUpBtn.style.marginLeft = this.expandedWaveIndex !== index ? '0' : 'auto';
            moveUpBtn.onclick = () => this.data.moveWaveUp(index);
            header.appendChild(moveUpBtn);
        }

        // Move Down button
        if (!isLast) {
            const moveDownBtn = this.createElement('button', 'we-move-btn', '🔽');
            moveDownBtn.title = 'Перемещение волны вниз';
            moveDownBtn.style.marginLeft = (this.expandedWaveIndex !== index && index === 0) ? 'auto' : '0';
            moveDownBtn.onclick = () => this.data.moveWaveDown(index);
            header.appendChild(moveDownBtn);
        }

        // Duplicate Wave button
        const dupBtn = this.createElement('button', 'we-btn we-btn-icon', '📋');
        dupBtn.title = 'Дублировать волну';
        dupBtn.style.marginLeft = (this.expandedWaveIndex === index && index === 0 && isLast) ? 'auto' : '0';
        dupBtn.onclick = () => this.data.duplicateWave(index);
        header.appendChild(dupBtn);

        // Delete Wave button
        const delBtn = this.createElement('button', 'we-btn we-btn-icon', '✕');
        delBtn.onclick = () => this.data.removeWave(index);
        header.appendChild(delBtn);

        container.appendChild(header);

        // --- Content (if expanded) ---
        if (this.expandedWaveIndex === index) {
            const content = this.createElement('div', 'we-wave-content');

            // 1. Wave Settings Panel (name, delay, shuffle, reward)
            const settingsPanel = new WaveSettingsPanel({
                waveIndex: index,
                model: this.data,
            });
            settingsPanel.mount(content);

            // 2. Timeline visualization
            const timeline = new WaveTimeline({ waveIndex: index, model: this.data });
            timeline.mount(content);

            // 3. Threat Meter
            const meter = new ThreatMeter({ threat });
            meter.mount(content);

            // 3. Enemy Groups
            const groupsContainer = this.createElement('div');
            groupsContainer.style.marginTop = '10px';

            wave.enemies.forEach((group, gIndex) => {
                const isGroupError = validation.errors.some(e => e.waveIndex === index && e.groupIndex === gIndex);

                const row = new EnemyGroupRow({
                    type: group.type,
                    count: group.count,
                    baseInterval: group.baseInterval ?? 0.66,
                    delayBefore: group.delayBefore ?? 0,
                    spawnPattern: group.spawnPattern || group.pattern || 'normal',
                    hasError: isGroupError,
                    onChange: (updates) => {
                        this.data.updateEnemyGroup(index, gIndex, updates);
                    },
                    onDuplicate: () => {
                        this.data.duplicateGroup(index, gIndex);
                    },
                    onRemove: () => {
                        this.data.removeEnemyGroup(index, gIndex);
                    }
                });
                row.mount(groupsContainer);
            });
            content.appendChild(groupsContainer);

            // 4. Add Enemy Button
            const addEnemyBtn = this.createElement('button', 'we-btn we-btn-secondary', '+ Добавить группу врагов');
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
