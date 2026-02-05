/**
 * Abstract base class for UI components.
 * enforcing a standard lifecycle: constructor -> mount -> render -> partial updates -> destroy.
 */
export abstract class BaseComponent<T = any> {
    protected element: HTMLElement;
    protected parent: HTMLElement | null = null;
    protected data: T;

    constructor(data: T) {
        this.data = data;
        this.element = this.createRootElement();
    }

    /**
     * Creates the main container for this component.
     * Override this to customize the tag and classes.
     */
    protected createRootElement(): HTMLElement {
        return document.createElement('div');
    }

    /**
     * Mounts the component to a parent element.
     */
    public mount(parent: HTMLElement): void {
        this.parent = parent;
        this.parent.appendChild(this.element);
        this.render();
    }

    /**
     * Renders the component content.
     * Should be idempotent or handle clearing.
     */
    public abstract render(): void;

    /**
     * Cleanup listeners and remove from DOM.
     */
    public destroy(): void {
        if (this.parent && this.element.parentNode === this.parent) {
            this.parent.removeChild(this.element);
        }
        this.element.innerHTML = '';
        this.parent = null;
    }

    // --- Helpers ---

    protected createElement<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        className?: string,
        text?: string
    ): HTMLElementTagNameMap[K] {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }
}
