import { BaseComponent } from './BaseComponent';
import { SpawnPattern } from '../../MapData';
import { EnemyRegistry } from '../EnemyRegistry';
import { ThreatService } from '../ThreatService';
import { IEnemyTypeConfig } from '../../types';

interface EnemyGroupProps {
    type: string;
    count: number;
    spawnPattern: SpawnPattern;
    onChange: (updates: { type?: string; count?: number; spawnPattern?: SpawnPattern }) => void;
    onRemove: () => void;
}

export class EnemyGroupRow extends BaseComponent<EnemyGroupProps> {

    protected createRootElement(): HTMLElement {
        return this.createElement('div', 'we-enemy-row');
    }

    public render(): void {
        this.element.innerHTML = '';

        // 1. Enemy Type Selector
        const typeSelect = document.createElement('select');
        typeSelect.title = 'Enemy Type';
        typeSelect.style.maxWidth = '150px';

        // ИСПРАВЛЕНО: используем статический метод getVisibleForEditor()
        const types: IEnemyTypeConfig[] = EnemyRegistry.getVisibleForEditor();

        types.forEach((config: IEnemyTypeConfig) => {
            const opt = document.createElement('option');
            // Используем ID как value (например 'grunt', 'boss')
            opt.value = config.id;
            opt.textContent = `${config.symbol} ${config.name}`;

            // BACKWARDS COMPATIBILITY: Проверяем и ID (lowercase) и KEY (UPPERCASE)
            // Старые карты используют 'GRUNT', 'BOSS', новые - 'grunt', 'boss'
            const currentType = this.data.type;
            const isMatch = config.id === currentType ||
                config.id === currentType.toLowerCase() ||
                config.id.toUpperCase() === currentType;

            if (isMatch) {
                opt.selected = true;
                // Нормализуем данные к lowercase ID при первом рендере
                if (currentType !== config.id) {
                    this.data.onChange({ type: config.id });
                }
            }

            typeSelect.appendChild(opt);
        });

        typeSelect.onchange = (e) => {
            this.data.onChange({ type: (e.target as HTMLSelectElement).value });
        };
        this.element.appendChild(typeSelect);

        // 2. Multiplier Label
        const xLabel = document.createElement('span');
        xLabel.textContent = 'x';
        xLabel.style.color = '#888';
        this.element.appendChild(xLabel);

        // 3. Count Input
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
        this.element.appendChild(countInput);

        // 4. Pattern Selector
        const patternSelect = document.createElement('select');
        patternSelect.title = 'Spawn Pattern';
        // FIXED: Removed restrictive width, added minWidth and pointer
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
            opt.title = p.value; // Tooltip
            if (p.value === (this.data.spawnPattern || 'normal')) opt.selected = true;
            patternSelect.appendChild(opt);
        });

        patternSelect.onchange = (e) => {
            this.data.onChange({ spawnPattern: (e.target as HTMLSelectElement).value as SpawnPattern });
        };
        this.element.appendChild(patternSelect);

        // 5. Threat Indicator (Mini)
        // Recalculate threat based on possibly updated type (if we had a mismatch)
        // Actually threat service should handle ID lookup safely too, but let's just pass data.
        const threat = ThreatService.calculateGroupThreat({
            type: this.data.type,
            count: this.data.count,
            spawnPattern: this.data.spawnPattern
        });

        const threatDot = document.createElement('div');
        threatDot.style.width = '10px';
        threatDot.style.height = '10px';
        threatDot.style.borderRadius = '50%';
        threatDot.style.marginLeft = '4px';
        threatDot.style.flexShrink = '0';
        threatDot.style.background = ThreatService.getThreatColor(threat);
        threatDot.title = `Threat: ${Math.round(threat)}`;
        this.element.appendChild(threatDot);

        // 6. Delete Button
        const delBtn = this.createElement('button', 'we-btn we-btn-icon', '✕');
        delBtn.style.marginLeft = 'auto'; // Push to right
        delBtn.onclick = () => this.data.onRemove();
        this.element.appendChild(delBtn);
    }
}
