import { BaseComponent } from './BaseComponent';
import { IValidationResult } from '../WaveModel';

export class ValidationPanel extends BaseComponent<IValidationResult | null> {
    public render(): void {
        this.element.innerHTML = '';
        this.element.className = 'we-validation-panel';

        if (!this.data) {
            this.element.style.display = 'none';
            return;
        }

        const { isValid, errors, warnings } = this.data;

        if (errors.length === 0 && warnings.length === 0) {
            this.element.style.display = 'none';
            return;
        }

        this.element.style.display = 'flex';
        this.element.style.flexDirection = 'column';
        this.element.style.gap = '4px';
        this.element.style.padding = '8px';
        this.element.style.margin = '8px';
        this.element.style.borderRadius = '4px';
        this.element.style.fontSize = '12px';

        if (errors.length > 0) {
            this.element.style.background = 'rgba(244, 67, 54, 0.2)';
            this.element.style.border = '1px solid rgba(244, 67, 54, 0.5)';
        } else {
            this.element.style.background = 'rgba(255, 152, 0, 0.2)';
            this.element.style.border = '1px solid rgba(255, 152, 0, 0.5)';
        }

        [...errors, ...warnings].forEach(msg => {
            const isError = errors.includes(msg);
            const item = this.createElement('div', isError ? 'we-validation-error' : 'we-validation-warning');
            item.style.color = isError ? '#ff8a80' : '#ffd180';

            let text = '';
            if (msg.waveIndex >= 0) {
                text += `Волна ${msg.waveIndex + 1}`;
                if (msg.groupIndex !== undefined) {
                    text += `, Группа ${msg.groupIndex + 1}`;
                }
                text += ': ';
            }
            text += msg.message;
            if (msg.field) {
                text += ` [${msg.field}]`;
            }
            item.textContent = (isError ? '🔴 ' : '🟡 ') + text;
            this.element.appendChild(item);
        });
    }

    public updateResult(result: IValidationResult) {
        this.data = result;
        this.render();
    }
}
