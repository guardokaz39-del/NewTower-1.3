import { Scene } from './Scene';

export class BaseScene implements Scene {
    protected listeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = [];

    public onEnter(): void { }

    public onExit(): void {
        this.dispose();
    }

    public update(): void { }

    public draw(_ctx: CanvasRenderingContext2D): void { }

    public on(target: EventTarget, type: string, handler: EventListener) {
        target.addEventListener(type, handler);
        this.listeners.push({ target, type, handler });
    }

    public dispose() {
        this.listeners.forEach((l) => l.target.removeEventListener(l.type, l.handler));
        this.listeners = [];
    }
}
