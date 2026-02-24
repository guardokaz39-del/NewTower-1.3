import { BaseComponent } from './BaseComponent';

interface SpawnTimingProps {
    value: number;
    min: number;
    max: number;
    step: number;
    label: string;
    suffix: string;
    onChange: (value: number) => void;
}

/**
 * Reusable range slider + number input for precise numeric control.
 * Both inputs stay synchronized.
 */
export class SpawnTimingControl extends BaseComponent<SpawnTimingProps> {

    protected createRootElement(): HTMLElement {
        return this.createElement('div', 'we-timing-control');
    }

    public render(): void {
        this.element.innerHTML = '';

        // Label
        const label = this.createElement('span', 'we-timing-label', this.data.label);
        this.element.appendChild(label);

        // Range slider
        const range = document.createElement('input');
        range.type = 'range';
        range.min = this.data.min.toString();
        range.max = this.data.max.toString();
        range.step = this.data.step.toString();
        range.value = this.data.value.toString();
        range.className = 'we-timing-range';

        // Number input
        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.min = this.data.min.toString();
        numInput.max = this.data.max.toString();
        numInput.step = this.data.step.toString();
        numInput.value = this.data.value.toString();
        numInput.className = 'we-timing-number';

        // Suffix
        const suffix = this.createElement('span', 'we-timing-suffix', this.data.suffix);

        // Synchronize both controls
        // IMPORTANT: use onchange (not oninput) on range to avoid flooding undo stack
        range.onchange = () => {
            const val = parseFloat(range.value);
            numInput.value = val.toString();
            this.data.onChange(val);
        };

        // Live visual feedback while dragging (doesn't trigger onChange/history)
        range.oninput = () => {
            numInput.value = range.value;
        };

        numInput.onchange = () => {
            let val = parseFloat(numInput.value) || this.data.min;
            val = Math.max(this.data.min, Math.min(this.data.max, val));
            numInput.value = val.toString();
            range.value = val.toString();
            this.data.onChange(val);
        };

        this.element.appendChild(range);
        this.element.appendChild(numInput);
        this.element.appendChild(suffix);
    }
}
