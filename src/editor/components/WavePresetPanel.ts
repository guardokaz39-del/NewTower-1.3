import { BaseComponent } from './BaseComponent';
import { WaveModel } from '../WaveModel';
import { getBuiltinPresets, loadCustomPresets, saveCustomPreset, deleteCustomPreset, IWavePreset } from '../WavePresets';

export class WavePresetPanel extends BaseComponent<WaveModel> {
    private select!: HTMLSelectElement;

    protected createRootElement(): HTMLElement {
        const el = document.createElement('div');
        el.className = 'we-preset-panel';
        return el;
    }

    public render(): void {
        this.element.innerHTML = '';
        this.element.style.display = 'flex';
        this.element.style.gap = '8px';
        this.element.style.alignItems = 'center';
        this.element.style.padding = '8px 16px';
        this.element.style.background = 'rgba(0, 0, 0, 0.2)';
        this.element.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';

        const builtinPresets = getBuiltinPresets();
        let customPresets = loadCustomPresets();

        this.select = this.createElement('select', 'we-settings-input') as HTMLSelectElement;
        this.select.style.flex = '1';

        const defaultOption = this.createElement('option', '', 'Выберите пресет...');
        defaultOption.value = '';
        this.select.appendChild(defaultOption);

        const builtinGroup = this.createElement('optgroup') as HTMLOptGroupElement;
        builtinGroup.label = 'Встроенные';
        builtinPresets.forEach(p => {
            const option = this.createElement('option', '', `${p.name} — ${p.description}`);
            option.value = p.id;
            builtinGroup.appendChild(option);
        });
        this.select.appendChild(builtinGroup);

        if (customPresets.length > 0) {
            const customGroup = this.createElement('optgroup') as HTMLOptGroupElement;
            customGroup.label = 'Пользовательские';
            customPresets.forEach(p => {
                const option = this.createElement('option', '', `${p.name} — ${p.description}`);
                option.value = p.id;
                customGroup.appendChild(option);
            });
            this.select.appendChild(customGroup);
        }

        const applyBtn = this.createElement('button', 'we-btn we-btn-primary', 'Применить');
        applyBtn.disabled = true;
        applyBtn.onclick = () => {
            const id = this.select.value;
            if (!id) return;
            const preset = builtinPresets.find(p => p.id === id) || customPresets.find(p => p.id === id);
            if (preset) {
                if (confirm(`Заменить текущие волны на пресет "${preset.name}"?`)) {
                    this.data.replaceAllWaves(preset.waves);
                }
            }
        };

        const saveAsBtn = this.createElement('button', 'we-btn we-btn-secondary', '💾 Сохранить как пресет');
        saveAsBtn.onclick = () => {
            const name = prompt('Введите название нового пресета:');
            if (name && name.trim() !== '') {
                saveCustomPreset(name.trim(), this.data.getWaves());
                this.render(); // Re-render to update select list
            }
        };

        this.element.appendChild(this.select);
        this.element.appendChild(applyBtn);
        this.element.appendChild(saveAsBtn);

        // Кнопка удаления для кастомного
        const deleteBtn = this.createElement('button', 'we-btn we-btn-danger we-btn-icon', '🗑️');
        deleteBtn.title = 'Удалить кастомный пресет';
        deleteBtn.style.display = 'none';

        this.select.onchange = () => {
            const id = this.select.value;
            applyBtn.disabled = !id;
            const isCustom = customPresets.some(p => p.id === id);
            deleteBtn.style.display = isCustom ? 'flex' : 'none';
        };

        deleteBtn.onclick = () => {
            const id = this.select.value;
            if (id && confirm('Удалить этот пресет?')) {
                deleteCustomPreset(id);
                this.render();
            }
        };

        this.element.appendChild(deleteBtn);
    }
}
