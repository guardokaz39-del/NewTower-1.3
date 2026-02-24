import { BaseComponent } from './BaseComponent';
import { WaveModel } from '../WaveModel';
import { SpawnTimingControl } from './SpawnTimingControl';

interface WaveSettingsProps {
    waveIndex: number;
    model: WaveModel;
}

/**
 * Panel for wave-level metadata:
 * Name, Start Delay, Wait for Clear, Shuffle Mode, Bonus Reward, Summary.
 */
export class WaveSettingsPanel extends BaseComponent<WaveSettingsProps> {

    protected createRootElement(): HTMLElement {
        return this.createElement('div', 'we-settings-panel');
    }

    public render(): void {
        this.element.innerHTML = '';
        const { waveIndex, model } = this.data;
        const wave = model.getWave(waveIndex);
        if (!wave) return;

        // 1. Name input
        const nameRow = this.createElement('div', 'we-settings-row');
        const nameLabel = this.createElement('span', 'we-settings-label', '📝 Название');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'we-settings-input';
        nameInput.placeholder = 'напр. Волна Босса!';
        nameInput.value = wave.name || '';
        nameInput.onchange = () => {
            model.updateWaveSettings(waveIndex, { name: nameInput.value.trim() || undefined });
        };
        nameRow.appendChild(nameLabel);
        nameRow.appendChild(nameInput);
        this.element.appendChild(nameRow);

        // 2. Start Delay
        const delayControl = new SpawnTimingControl({
            value: wave.startDelay ?? 0,
            min: 0,
            max: 60,
            step: 0.5,
            label: '⏱️ Задержка старта',
            suffix: 'с',
            onChange: (val) => model.updateWaveSettings(waveIndex, { startDelay: val }),
        });
        delayControl.mount(this.element);

        // 3. Wait for Clear (checkbox)
        const clearRow = this.createElement('div', 'we-settings-row');
        const clearLabel = this.createElement('span', 'we-settings-label', '⏹️ Ждать зачистки');
        const clearCheck = document.createElement('input');
        clearCheck.type = 'checkbox';
        clearCheck.checked = wave.waitForClear ?? false;
        clearCheck.onchange = () => {
            model.updateWaveSettings(waveIndex, { waitForClear: clearCheck.checked });
        };
        clearRow.appendChild(clearLabel);
        clearRow.appendChild(clearCheck);
        this.element.appendChild(clearRow);

        // 4. Shuffle Mode (select)
        const shuffleRow = this.createElement('div', 'we-settings-row');
        const shuffleLabel = this.createElement('span', 'we-settings-label', '🔀 Перемешивание');
        const shuffleSelect = document.createElement('select');
        shuffleSelect.className = 'we-settings-input';
        const shuffleOptions: { value: string; label: string }[] = [
            { value: 'none', label: 'Нет (по порядку)' },
            { value: 'within_group', label: 'Внутри группы' },
            { value: 'all', label: 'Все (старые карты)' },
        ];
        shuffleOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === (wave.shuffleMode ?? 'none')) option.selected = true;
            shuffleSelect.appendChild(option);
        });
        shuffleSelect.onchange = () => {
            model.updateWaveSettings(waveIndex, {
                shuffleMode: shuffleSelect.value as 'none' | 'within_group' | 'all',
            });
        };
        shuffleRow.appendChild(shuffleLabel);
        shuffleRow.appendChild(shuffleSelect);
        this.element.appendChild(shuffleRow);

        // 5. Bonus Reward
        const rewardRow = this.createElement('div', 'we-settings-row');
        const rewardLabel = this.createElement('span', 'we-settings-label', '💰 Бонус');
        const rewardInput = document.createElement('input');
        rewardInput.type = 'number';
        rewardInput.className = 'we-settings-input';
        rewardInput.min = '0';
        rewardInput.max = '1000';
        rewardInput.value = (wave.bonusReward ?? 0).toString();
        rewardInput.style.width = '70px';
        rewardInput.onchange = () => {
            const val = Math.max(0, parseInt(rewardInput.value) || 0);
            model.updateWaveSettings(waveIndex, { bonusReward: val || undefined });
        };
        rewardRow.appendChild(rewardLabel);
        rewardRow.appendChild(rewardInput);
        this.element.appendChild(rewardRow);

        // 6. Auto-Summary (read-only)
        const totalEnemies = wave.enemies.reduce((sum, g) => sum + g.count, 0);
        const duration = model.getEstimatedDuration(waveIndex);
        const threat = model.getThreat(waveIndex);
        const summary = this.createElement('div', 'we-settings-summary',
            `${totalEnemies} врагов • ~${duration.toFixed(1)}с • Угроза: ${Math.round(threat)}`
        );
        this.element.appendChild(summary);
    }
}
