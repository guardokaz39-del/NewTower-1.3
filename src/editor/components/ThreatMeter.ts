import { BaseComponent } from './BaseComponent';
import { ThreatService } from '../ThreatService';

interface ThreatMeterProps {
    threat: number;
}

export class ThreatMeter extends BaseComponent<ThreatMeterProps> {
    private fillElement!: HTMLElement;
    private badgeElement!: HTMLElement;

    protected createRootElement(): HTMLElement {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';
        return container;
    }

    public render(): void {
        this.element.innerHTML = '';

        // Create Badge
        const color = ThreatService.getThreatColor(this.data.threat);
        const label = ThreatService.getThreatLabel(this.data.threat);

        this.badgeElement = this.createElement('span', 'we-threat-badge', label);
        this.badgeElement.style.color = color;
        this.badgeElement.style.border = `1px solid ${color}`;
        this.element.appendChild(this.badgeElement);

        // Create Wrapper for Bar
        const barWrapper = this.createElement('div', 'we-threat-meter');
        barWrapper.style.flex = '1';

        // Create Fill
        this.fillElement = this.createElement('div', 'we-threat-fill');
        this.updateFill(this.data.threat);

        barWrapper.appendChild(this.fillElement);
        this.element.appendChild(barWrapper);

        // Value Text
        const valueText = this.createElement('span', '', Math.round(this.data.threat).toString());
        valueText.style.fontSize = '11px';
        valueText.style.color = '#aaa';
        this.element.appendChild(valueText);
    }

    public update(threat: number) {
        this.data.threat = threat;
        const color = ThreatService.getThreatColor(threat);
        const label = ThreatService.getThreatLabel(threat);

        if (this.badgeElement) {
            this.badgeElement.textContent = label;
            this.badgeElement.style.color = color;
            this.badgeElement.style.border = `1px solid ${color}`;
        }

        this.updateFill(threat);

        // Update number
        if (this.element.lastElementChild) {
            this.element.lastElementChild.textContent = Math.round(threat).toString();
        }
    }

    private updateFill(threat: number) {
        if (!this.fillElement) return;

        const color = ThreatService.getThreatColor(threat);
        // Normalize 0-3000 to 0-100%
        const percentage = Math.min(100, Math.max(5, (threat / 2500) * 100));

        this.fillElement.style.width = `${percentage}%`;
        this.fillElement.style.backgroundColor = color;
        this.fillElement.style.boxShadow = `0 0 10px ${color}`;
    }
}
