export enum LogLevel {
    VERBOSE = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 99
}

export enum LogChannel {
    SYSTEM = 'SYS',
    GAME = 'GAME',
    RENDER = 'RNDR',
    AUDIO = 'AUDIO',
    INPUT = 'INPT',
    NETWORK = 'NET',
    LIFECYCLE = 'LIFECYCLE',
    ASSETS = 'ASSETS',
    UI = 'UI',
    COMBAT = 'COMBAT',
    PERF = 'PERF',
    SAVE = 'SAVE'
}

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    channel: LogChannel;
    message: string;
    data?: any;
    count: number; // For collapsed logs
}

export class Logger {
    private static instance: Logger;

    // Configuration
    public minLevel: LogLevel = LogLevel.INFO;
    public maxHistory: number = 200; // Keep last 200 logs

    // State
    private history: LogEntry[] = [];
    private listeners: ((entry: LogEntry) => void)[] = [];

    // Throttling / De-duplication
    private lastLogSignature: string = '';
    private lastLogEntry: LogEntry | null = null;
    private lastLogTime: number = 0;
    private throttleTimeMs: number = 1000; // Reset "count" logic if spam stops for 1 second

    // logOnce TTL Map
    private ttlLogs: Map<string, number> = new Map();

    private constructor() {
        console.log('%c Logger Initialized ', 'background: #222; color: #bada55');
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    // --- Public API ---

    public static debug(channel: LogChannel, msg: string, data?: any) {
        Logger.getInstance().log(LogLevel.VERBOSE, channel, msg, data);
    }

    public static info(channel: LogChannel, msg: string, data?: any) {
        Logger.getInstance().log(LogLevel.INFO, channel, msg, data);
    }

    public static warn(channel: LogChannel, msg: string, data?: any) {
        Logger.getInstance().log(LogLevel.WARN, channel, msg, data);
    }

    public static error(channel: LogChannel, msg: string, data?: any) {
        Logger.getInstance().log(LogLevel.ERROR, channel, msg, data);
    }

    public static groupCollapsed(label: string) {
        console.groupCollapsed(label);
    }

    public static groupEnd() {
        console.groupEnd();
    }

    public static logOnce(key: string, channel: LogChannel, msg: string, level: LogLevel = LogLevel.INFO, ttlMs: number = 5000, data?: any) {
        const logger = Logger.getInstance();
        const now = Date.now();
        const lastPrint = logger.ttlLogs.get(key) || 0;

        if (now - lastPrint >= ttlMs) {
            logger.ttlLogs.set(key, now);
            logger.log(level, channel, msg, data);
        }
    }

    public static getHistory(): LogEntry[] {
        return Logger.getInstance().history;
    }

    public static subscribe(callback: (entry: LogEntry) => void) {
        Logger.getInstance().listeners.push(callback);
    }

    public static unsubscribe(callback: (entry: LogEntry) => void) {
        const i = Logger.getInstance().listeners.indexOf(callback);
        if (i > -1) Logger.getInstance().listeners.splice(i, 1);
    }

    // --- Internal Logic ---

    private log(level: LogLevel, channel: LogChannel, msg: string, data?: any) {
        if (level < this.minLevel) return;

        const now = Date.now();
        const signature = `${level}:${channel}:${msg}`;

        // Check for spam/throttling (same message repeated)
        if (this.lastLogEntry && this.lastLogSignature === signature && (now - this.lastLogTime < this.throttleTimeMs)) {
            this.lastLogEntry.count++;
            this.lastLogEntry.timestamp = now; // Update time to latest occurrence
            this.lastLogTime = now;
            // Notify listeners about update (optional, usually listeners just append, so this might be tricky for UI 
            // - UI should re-render or handle updates. For now we rely on UI refreshing or ignoring updates to existing objects)
            return;
        }

        const entry: LogEntry = {
            timestamp: now,
            level,
            channel,
            message: msg,
            data,
            count: 1
        };

        // Add to history
        this.history.push(entry);
        if (this.history.length > this.maxHistory) {
            this.history.shift(); // Remove oldest
        }

        // Update state
        this.lastLogEntry = entry;
        this.lastLogSignature = signature;
        this.lastLogTime = now;

        // Output to Browser Console (Dual Output)
        this.printToConsole(entry);

        // Notify subscribers (The In-Game Console)
        this.listeners.forEach(l => l(entry));
    }

    private printToConsole(entry: LogEntry) {
        const time = new Date(entry.timestamp).toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.ms
        const css = this.getLevelCSS(entry.level);
        const prefix = `%c[${time}] [${entry.channel}]`;

        // Use native console methods for proper stack tracing and object inspection in F12
        switch (entry.level) {
            case LogLevel.ERROR:
                console.error(prefix, css, entry.message, entry.data || '');
                break;
            case LogLevel.WARN:
                console.warn(prefix, css, entry.message, entry.data || '');
                break;
            case LogLevel.INFO:
                console.log(prefix, css, entry.message, entry.data || '');
                break;
            case LogLevel.VERBOSE:
                console.debug(prefix, css, entry.message, entry.data || '');
                break;
        }
    }

    private getLevelCSS(level: LogLevel): string {
        switch (level) {
            case LogLevel.ERROR: return 'color: #ff4444; font-weight: bold;';
            case LogLevel.WARN: return 'color: #ffbb33; font-weight: bold;';
            case LogLevel.INFO: return 'color: #33b5e5; font-weight: bold;';
            case LogLevel.VERBOSE: return 'color: #999;';
            default: return 'color: #fff;';
        }
    }
}
