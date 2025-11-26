type Listener = (data?: any) => void;

export class EventEmitter {
    // Хранилище подписок: 'название_события' -> [список функций]
    private events: { [key: string]: Listener[] };

    constructor() {
        this.events = {};
    }

    // Подписаться на событие
    public on(event: string, listener: Listener): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    // Отписаться
    public off(event: string, listener: Listener): void {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    // Крикнуть на всю игру: "Произошло событие!"
    public emit(event: string, data?: any): void {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(data));
    }
}