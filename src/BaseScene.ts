import { Scene } from './Scene';

/**
 * Base Scene implementation with strict lifecycle and automated cleanup.
 * 
 * - onEnter(): Final. Calls onEnterImpl().
 * - onExit(): Final. Calls onExitImpl() then dispose().
 * - dispose(): Removes all tracked listeners.
 * - on(): Helper to add listeners that are automatically removed.
 */
export abstract class BaseScene implements Scene {
    protected listeners: Array<{ target: EventTarget; type: string; handler: EventListenerOrEventListenerObject }> = [];

    public onEnter(): void {
        this.onEnterImpl();
    }

    public onExit(): void {
        this.onExitImpl();
        this.dispose();
    }

    /**
     * Concrete implementation of scene entry logic.
     * Override this instead of onEnter().
     */
    protected abstract onEnterImpl(): void;

    /**
     * Concrete implementation of scene exit logic.
     * Override this instead of onExit().
     */
    protected abstract onExitImpl(): void;

    public abstract update(dt: number): void;
    public abstract draw(ctx: CanvasRenderingContext2D): void;

    protected on(target: EventTarget, type: string, handler: EventListenerOrEventListenerObject) {
        target.addEventListener(type, handler);
        this.listeners.push({ target, type, handler });
    }

    public dispose() {
        this.listeners.forEach((l) => l.target.removeEventListener(l.type, l.handler));
        this.listeners = [];
    }
}
