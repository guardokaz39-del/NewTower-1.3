export enum SoundPriority {
    LOW = 0,
    HIGH = 1
}

export class SoundManager {
    private static ctx: AudioContext;
    private static buffers: Record<string, AudioBuffer> = {};
    private static lastPlayed: Record<string, number> = {};
    private static lastPlayedType: Record<string, number> = {}; // Track last play time by TYPE

    // Config
    private static CULL_MS = 50; // Minimum time between same sounds (Legacy logic)
    private static THROTTLE_MS = 60; // Global throttle for identical sounds
    public static MASTER_VOLUME = 0.3; // Made public for settings
    public static SFX_VOLUME = 1.0;
    public static MUSIC_VOLUME = 0.5;

    public static setVolume(master: number) {
        this.MASTER_VOLUME = Math.max(0, Math.min(1, master));
    }

    public static async init() {
        if (this.ctx) return;

        try {
            // @ts-ignore - Handle webkit prefix for older browsers if needed
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            console.log('SoundManager: AudioContext initialized');

            // Generate basic sounds
            this.generateSounds();
        } catch (e) {
            console.error('SoundManager: Failed to init AudioContext', e);
        }
    }

    public static resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public static play(key: string, priority: SoundPriority = SoundPriority.LOW) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = Date.now();
        const last = this.lastPlayed[key] || 0;

        // 1. Culling / Ducking logic
        // If High Priority, we always play (or maybe duck others? For now just play)
        // If Low Priority, check time since last played
        if (priority === SoundPriority.LOW) {
            // Check legacy cull (per specific key/instance if unique keys used)
            if (now - last < this.CULL_MS) {
                return;
            }

            // Global Type Throttling 
            // This prevents "shoot_basic" from playing 10 times in one frame from 10 towers
            const lastType = this.lastPlayedType[key] || 0;
            if (now - lastType < this.THROTTLE_MS) {
                return;
            }
        }

        this.lastPlayed[key] = now;
        this.lastPlayedType[key] = now;

        const buffer = this.buffers[key];
        if (!buffer) {
            // console.warn(`SoundManager: Sound '${key}' not found`);
            return;
        }

        // Create Source
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        // 2. Pitch Variance (Tech Trick)
        // +/- 10% (0.9 to 1.1)
        const detune = 0.9 + Math.random() * 0.2;
        source.playbackRate.value = detune;

        // Gain (Volume)
        const gainNode = this.ctx.createGain();
        let vol = this.MASTER_VOLUME * this.SFX_VOLUME;

        // Boost high priority sounds slightly
        if (priority === SoundPriority.HIGH) vol *= 1.5;

        // Randomize volume slightly too for "organic" feel
        vol *= (0.9 + Math.random() * 0.2);

        gainNode.gain.value = vol;

        // Connect
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start();
    }

    private static generateSounds() {
        // We synthesize simple buffers
        // 1. Shoot (Sniper/Gun) - Sharp decay noise/square
        this.buffers['shoot_basic'] = this.createBuffer((t) => {
            const decay = Math.exp(-t * 20);
            return (Math.random() * 2 - 1) * decay;
        }, 0.2);

        this.buffers['shoot_sniper'] = this.createBuffer((t) => {
            // Longer, louder crack
            const decay = Math.exp(-t * 10);
            const noise = (Math.random() * 2 - 1);
            return noise * decay * 1.5; // Boost
        }, 0.5);

        // 2. Hit - High pitched tick
        this.buffers['hit'] = this.createBuffer((t) => {
            const decay = Math.exp(-t * 50);
            return Math.sin(t * 2000 * Math.PI * 2) * decay;
        }, 0.1);

        // 3. Enemy Death - Soft pop (pleasant, not annoying on repeat)
        this.buffers['death'] = this.createBuffer((t) => {
            const decay = Math.exp(-t * 25);
            // Soft bubble pop - high start, quick fade
            const freq = 400 * Math.exp(-t * 8);
            return Math.sin(t * freq * Math.PI * 2) * decay * 0.6;
        }, 0.15);

        // 4. Boss Spawn - Low droning sweep
        this.buffers['boss_spawn'] = this.createBuffer((t) => {
            const freq = 50 + Math.sin(t * 10) * 20;
            return Math.sin(t * freq * Math.PI * 2) * 0.8;
        }, 1.5);

        // 5. UI Click - Clean pip
        this.buffers['click'] = this.createBuffer((t) => {
            const decay = Math.exp(-t * 30);
            return Math.sin(t * 800 * Math.PI * 2) * decay;
        }, 0.1);

        // 6. UI Hover - Very short tick
        this.buffers['hover'] = this.createBuffer((t) => {
            const decay = Math.exp(-t * 50);
            return Math.sin(t * 1200 * Math.PI * 2) * decay * 0.2;
        }, 0.05);

        // 7. Explosion
        this.buffers['explosion'] = this.createBuffer((t) => {
            const decay = Math.exp(-t * 5);
            return (Math.random() * 2 - 1) * decay;
        }, 0.5);
    }

    private static createBuffer(fn: (t: number) => number, duration: number): AudioBuffer {
        const sampleRate = this.ctx.sampleRate;
        const frames = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, frames, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < frames; i++) {
            data[i] = fn(i / sampleRate);
        }
        return buffer;
    }
}
