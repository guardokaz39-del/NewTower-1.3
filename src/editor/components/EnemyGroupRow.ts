import { BaseComponent } from './BaseComponent';
import { SpawnPattern, IWaveGroupRaw } from '../../MapData';
import { EnemyRegistry } from '../EnemyRegistry';
import { ThreatService } from '../ThreatService';
import { SpawnTimingControl } from './SpawnTimingControl';
import { IEnemyTypeConfig } from '../../types';

interface EnemyGroupProps {
    type: string;
    count: number;
    baseInterval: number;
    delayBefore: number;
    spawnPattern: SpawnPattern;
    hasError?: boolean;
    onChange: (updates: Partial<IWaveGroupRaw>) => void;
    onDuplicate: () => void;
    onRemove: () => void;
}

export class EnemyGroupRow extends BaseComponent<EnemyGroupProps> {

    protected createRootElement(): HTMLElement {
        const el = this.createElement('div', 'we-enemy-row');
        if (this.data.hasError) {
            el.classList.add('we-enemy-row--error');
        }
        return el;
    }

    public render(): void {
        this.element.innerHTML = '';

        // Row 1: Type + Count + Pattern + Actions
        const mainRow = this.createElement('div', 'we-enemy-main');

        // Color dot for enemy type
        const typeConfig = EnemyRegistry.getType(this.data.type);
        if (typeConfig) {
            const colorDot = document.createElement('div');
            colorDot.className = 'we-type-dot';
            colorDot.style.background = typeConfig.color;
            colorDot.title = typeConfig.name;
            mainRow.appendChild(colorDot);
        }

        // 1. Enemy Type Selector
        const typeSelect = document.createElement('select');
        typeSelect.title = 'Enemy Type';
        typeSelect.style.maxWidth = '130px';

        const types: IEnemyTypeConfig[] = EnemyRegistry.getVisibleForEditor();
        types.forEach((config: IEnemyTypeConfig) => {
            const opt = document.createElement('option');
            opt.value = config.id;
            opt.textContent = `${config.symbol} ${config.name}`;

            const currentType = this.data.type;
            const isMatch = config.id === currentType ||
                config.id === currentType.toLowerCase() ||
                config.id.toUpperCase() === currentType;

            if (isMatch) {
                opt.selected = true;
                if (currentType !== config.id) {
                    this.data.onChange({ type: config.id });
                }
            }
            typeSelect.appendChild(opt);
        });

        typeSelect.onchange = (e) => {
            this.data.onChange({ type: (e.target as HTMLSelectElement).value });
        };
        mainRow.appendChild(typeSelect);

        // 2. × label + Count input
        const xLabel = this.createElement('span', '', '×');
        xLabel.style.color = '#888';
        mainRow.appendChild(xLabel);

        const countInput = document.createElement('input');
        countInput.type = 'number';
        countInput.min = '1';
        countInput.max = '100';
        countInput.value = this.data.count.toString();
        countInput.style.width = '40px';
        countInput.onchange = (e) => {
            const val = parseInt((e.target as HTMLInputElement).value) || 1;
            this.data.onChange({ count: val });
        };
        mainRow.appendChild(countInput);

        // 3. Pattern Selector
        const patternSelect = document.createElement('select');
        patternSelect.title = 'Spawn Pattern';
        patternSelect.style.minWidth = '50px';
        patternSelect.style.cursor = 'pointer';

        const patterns: Array<{ value: SpawnPattern; label: string }> = [
            { value: 'normal', label: '⏱️ Norm' },
            { value: 'random', label: '🎲 Rand' },
            { value: 'swarm', label: '🐝 Swrm' }
        ];

        patterns.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.value;
            opt.textContent = p.label;
            opt.title = p.value;
            if (p.value === (this.data.spawnPattern || 'normal')) opt.selected = true;
            patternSelect.appendChild(opt);
        });
        patternSelect.onchange = (e) => {
            this.data.onChange({ spawnPattern: (e.target as HTMLSelectElement).value as SpawnPattern });
        };
        mainRow.appendChild(patternSelect);

        // 4. Duration label
        const interval = this.data.baseInterval;
        const dur = (this.data.count * interval).toFixed(1);
        const durLabel = this.createElement('span', 'we-duration-label', `${this.data.count} × ${interval}с = ${dur}с`);
        mainRow.appendChild(durLabel);

        // 5. Threat dot
        const threat = ThreatService.calculateGroupThreat({
            type: this.data.type,
            count: this.data.count,
            spawnPattern: this.data.spawnPattern
        });
        const threatDot = document.createElement('div');
        threatDot.className = 'we-threat-dot';
        threatDot.style.background = ThreatService.getThreatColor(threat);
        threatDot.title = `Угроза: ${Math.round(threat)}`;
        mainRow.appendChild(threatDot);

        // 6. Duplicate button
        const dupBtn = this.createElement('button', 'we-btn we-btn-icon', '🔄');
        dupBtn.title = 'Дублировать группу';
        dupBtn.onclick = () => this.data.onDuplicate();
        mainRow.appendChild(dupBtn);

        // 7. Delete button
        const delBtn = this.createElement('button', 'we-btn we-btn-icon', '✕');
        delBtn.style.marginLeft = 'auto';
        delBtn.onclick = () => this.data.onRemove();
        mainRow.appendChild(delBtn);

        this.element.appendChild(mainRow);

        // Row 2: Timing controls (interval + delay)
        const timingRow = this.createElement('div', 'we-enemy-timing');

        const intervalCtrl = new SpawnTimingControl({
            value: this.data.baseInterval,
            min: 0.05,
            max: 5.0,
            step: 0.05,
            label: '⏱️ Интервал',
            suffix: 'с',
            onChange: (val) => this.data.onChange({ baseInterval: val }),
        });
        intervalCtrl.mount(timingRow);

        const delayCtrl = new SpawnTimingControl({
            value: this.data.delayBefore,
            min: 0,
            max: 30,
            step: 0.5,
            label: '⏸️ Задержка',
            suffix: 'с',
            onChange: (val) => this.data.onChange({ delayBefore: val }),
        });
        delayCtrl.mount(timingRow);

        this.element.appendChild(timingRow);
    }
}
