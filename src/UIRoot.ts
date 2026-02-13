export class UIRoot {
    private gameContainer: HTMLElement;
    private uiLayer: HTMLElement;
    private handContainer: HTMLElement;
    private tooltipContainer: HTMLElement;
    private overlayContainer: HTMLElement;

    constructor() {
        // Find existing stricture or create
        this.gameContainer = document.getElementById('app') || document.body;

        this.uiLayer = this.ensureElement('ui-layer');
        this.handContainer = this.ensureElement('hand-container');
        this.tooltipContainer = this.ensureElement('tooltip-container');
        this.overlayContainer = this.ensureElement('overlay-layer');

        // Ensure z-indices
        this.uiLayer.style.zIndex = '10';
        this.handContainer.style.zIndex = '20';
        this.tooltipContainer.style.zIndex = '100';
        this.overlayContainer.style.zIndex = '1000';
    }

    private ensureElement(id: string): HTMLElement {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.style.position = 'absolute';
            el.style.top = '0';
            el.style.left = '0';
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.pointerEvents = 'none'; // Allow clicks to pass through by default

            // Check if specific container needs pointer events
            if (id === 'hand-container') {
                el.style.pointerEvents = 'none'; // Hand items will have pointer-events: auto
            }

            this.gameContainer.appendChild(el);
        }
        return el;
    }

    public showGameUI() {
        this.uiLayer.style.display = 'block';
        this.handContainer.style.display = 'block';
    }

    public hideGameUI() {
        this.uiLayer.style.display = 'none';
        this.handContainer.style.display = 'none';
        // Hide tooltips too?
        this.tooltipContainer.innerHTML = '';
    }

    public getLayer(id: 'ui' | 'hand' | 'tooltip' | 'overlay'): HTMLElement {
        switch (id) {
            case 'ui': return this.uiLayer;
            case 'hand': return this.handContainer;
            case 'tooltip': return this.tooltipContainer;
            case 'overlay': return this.overlayContainer;
        }
    }

    public clearLayer(id: 'ui' | 'hand' | 'tooltip' | 'overlay') {
        this.getLayer(id).innerHTML = '';
    }
}
