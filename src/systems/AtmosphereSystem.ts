import { DayNightCycle } from '../DayNightCycle';

/**
 * Configurable atmosphere parameters - easily tunable
 */
interface IAtmosphereConfig {
    // Sunlight settings
    sunRayCount: number;
    sunRayOpacity: number;
    sunRayWidth: number;
    sunRayAngle: number; // degrees from horizontal

    // Cloud shadow settings
    cloudShadowCount: number;
    cloudShadowSpeed: number; // pixels per second in world space
    cloudShadowOpacity: number;
    cloudShadowMinSize: number;
    cloudShadowMaxSize: number;
    cloudShadowDirection: number; // angle in degrees (0 = right, 90 = down)

    // Moonlight settings
    moonlightOpacity: number;
    moonlightColor: string;

    // Color grading
    dayFilter: string;
    nightFilter: string;

    // Stars settings
    enableStars: boolean;
    starCount: number;
    starOpacity: number;
}

interface CloudShadow {
    x: number;        // world X coordinate
    y: number;        // world Y coordinate  
    width: number;    // fixed width
    height: number;   // fixed height
    speed: number;    // individual speed multiplier (0.8 - 1.2)
    vx: number;       // velocity X (calculated from direction)
    vy: number;       // velocity Y (calculated from direction)
}

export class AtmosphereSystem {
    private dayNightCycle: DayNightCycle;
    private config: IAtmosphereConfig;
    private clouds: CloudShadow[] = [];
    private starPositions: { x: number; y: number }[] = [];
    private worldWidth: number = 1280; // will be updated via setWorldSize
    private worldHeight: number = 800;

    constructor(dayNightCycle: DayNightCycle, config?: Partial<IAtmosphereConfig>) {
        this.dayNightCycle = dayNightCycle;

        // Default config - easily modifiable
        this.config = {
            // Sunlight
            sunRayCount: 5,
            sunRayOpacity: 0.08,
            sunRayWidth: 120,
            sunRayAngle: 30,

            // Cloud shadows
            cloudShadowCount: 8,
            cloudShadowSpeed: 20, // pixels/second
            cloudShadowOpacity: 0.12,
            cloudShadowMinSize: 180,
            cloudShadowMaxSize: 320,
            cloudShadowDirection: 45, // diagonal movement (top-left to bottom-right)

            // Moonlight
            moonlightOpacity: 0.15,
            moonlightColor: '#4fc3f7',

            // Color grading
            dayFilter: 'sepia(0.05) saturate(1.1)',
            nightFilter: 'hue-rotate(10deg) saturate(0.9)',

            // Stars
            enableStars: true,
            starCount: 50,
            starOpacity: 0.8,

            ...config // Override with provided config
        };

        this.initializeCloudShadows();
        if (this.config.enableStars) {
            this.initializeStars();
        }
    }

    /**
     * Set world dimensions for proper cloud positioning
     * Should be called once when map is loaded
     */
    public setWorldSize(width: number, height: number): void {
        this.worldWidth = width;
        this.worldHeight = height;
        // Re-initialize clouds with new world bounds
        this.clouds = [];
        this.initializeCloudShadows();
    }

    private initializeCloudShadows(): void {
        const directionRad = (this.config.cloudShadowDirection * Math.PI) / 180;

        for (let i = 0; i < this.config.cloudShadowCount; i++) {
            // Random position across entire world
            const x = Math.random() * this.worldWidth;
            const y = Math.random() * this.worldHeight;

            // Random size between min and max
            const sizeRange = this.config.cloudShadowMaxSize - this.config.cloudShadowMinSize;
            const width = this.config.cloudShadowMinSize + Math.random() * sizeRange;
            const height = width * (0.5 + Math.random() * 0.3); // height is 50-80% of width

            // Slight speed variation for more organic movement
            const speedMultiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

            // Calculate velocity from direction
            const speed = this.config.cloudShadowSpeed * speedMultiplier;
            const vx = Math.cos(directionRad) * speed;
            const vy = Math.sin(directionRad) * speed;

            this.clouds.push({ x, y, width, height, speed: speedMultiplier, vx, vy });
        }
    }

    private initializeStars(): void {
        // Random star positions (fixed, not moving)
        for (let i = 0; i < this.config.starCount; i++) {
            this.starPositions.push({
                x: Math.random(),
                y: Math.random() * 0.6 // Stars in upper 60% of screen
            });
        }
    }

    public update(deltaTime: number): void {
        // Update cloud positions in world space
        this.clouds.forEach(cloud => {
            cloud.x += cloud.vx * deltaTime;
            cloud.y += cloud.vy * deltaTime;

            // Wrap around when cloud exits world bounds
            // Add padding to prevent pop-in
            const padding = Math.max(cloud.width, cloud.height);

            if (cloud.x > this.worldWidth + padding) {
                cloud.x = -padding;
            } else if (cloud.x < -padding) {
                cloud.x = this.worldWidth + padding;
            }

            if (cloud.y > this.worldHeight + padding) {
                cloud.y = -padding;
            } else if (cloud.y < -padding) {
                cloud.y = this.worldHeight + padding;
            }
        });
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        const time = this.dayNightCycle.getTimeOfDay(); // 0 (dawn) to 1 (night)
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;

        // Save original state
        ctx.save();

        // Smooth transition calculation
        // 0.0-0.3: Dawn (transitioning to day)
        // 0.3-0.5: Full day
        // 0.5-0.7: Dusk (transitioning to night)
        // 0.7-1.0: Full night

        let dayIntensity = 0;
        let nightIntensity = 0;

        if (time < 0.3) {
            // Dawn
            dayIntensity = time / 0.3; // 0 to 1
        } else if (time < 0.5) {
            // Day
            dayIntensity = 1;
        } else if (time < 0.7) {
            // Dusk
            dayIntensity = 1 - ((time - 0.5) / 0.2); // 1 to 0
            nightIntensity = (time - 0.5) / 0.2; // 0 to 1
        } else {
            // Night
            nightIntensity = 1;
        }

        // Draw both day and night effects with smooth blending
        if (dayIntensity > 0) {
            this.drawDayEffects(ctx, canvasWidth, canvasHeight, dayIntensity);
        }
        if (nightIntensity > 0) {
            this.drawNightEffects(ctx, canvasWidth, canvasHeight, nightIntensity);
        }

        ctx.restore();
    }

    private drawDayEffects(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
        // 1. Sunlight rays (diagonal lines)
        ctx.save();
        ctx.globalAlpha = this.config.sunRayOpacity * intensity;
        const rayAngleRad = (this.config.sunRayAngle * Math.PI) / 180;

        for (let i = 0; i < this.config.sunRayCount; i++) {
            const spacing = width / (this.config.sunRayCount + 1);
            const startX = spacing * (i + 1);
            const gradient = ctx.createLinearGradient(
                startX, 0,
                startX + Math.cos(rayAngleRad) * height,
                height
            );
            gradient.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 200, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(startX - this.config.sunRayWidth / 2, 0, this.config.sunRayWidth, height);
        }
        ctx.restore();

        // 2. Cloud shadows (moving dark spots)
        ctx.save();
        ctx.globalAlpha = this.config.cloudShadowOpacity * intensity;

        this.clouds.forEach(cloud => {
            // Create gradient for soft edges
            const gradient = ctx.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.width * 0.6
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
            gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;

            // Draw organic cloud shape (multiple overlapping ellipses)
            ctx.beginPath();
            ctx.ellipse(
                cloud.x,
                cloud.y,
                cloud.width * 0.5,
                cloud.height * 0.5,
                0, 0, Math.PI * 2
            );
            ctx.fill();

            // Add secondary ellipse for organic shape
            ctx.beginPath();
            ctx.ellipse(
                cloud.x + cloud.width * 0.2,
                cloud.y - cloud.height * 0.15,
                cloud.width * 0.35,
                cloud.height * 0.4,
                Math.PI * 0.3, 0, Math.PI * 2
            );
            ctx.fill();

            // Add third ellipse
            ctx.beginPath();
            ctx.ellipse(
                cloud.x - cloud.width * 0.15,
                cloud.y + cloud.height * 0.1,
                cloud.width * 0.3,
                cloud.height * 0.35,
                -Math.PI * 0.25, 0, Math.PI * 2
            );
            ctx.fill();
        });
        ctx.restore();

        // 3. Subtle warm tint (removed harsh overlay)
        // Ambient lighting already handles color temperature
        ctx.restore();
    }

    private drawNightEffects(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
        // 1. Moonlight (soft blue glow from top)
        ctx.save();
        ctx.globalAlpha = this.config.moonlightOpacity * intensity;
        const moonGradient = ctx.createLinearGradient(0, 0, 0, height / 2);
        moonGradient.addColorStop(0, this.config.moonlightColor);
        moonGradient.addColorStop(1, 'rgba(79, 195, 247, 0)');
        ctx.fillStyle = moonGradient;
        ctx.fillRect(0, 0, width, height / 2);
        ctx.restore();

        // 2. Stars
        if (this.config.enableStars) {
            ctx.save();
            ctx.globalAlpha = this.config.starOpacity * intensity;
            ctx.fillStyle = '#ffffff';

            this.starPositions.forEach(star => {
                const x = star.x * width;
                const y = star.y * height;
                const radius = 0.5 + Math.random();

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();

                // Twinkle effect (subtle)
                if (Math.random() > 0.95) {
                    ctx.globalAlpha = this.config.starOpacity * intensity * 0.5;
                    ctx.beginPath();
                    ctx.arc(x, y, radius + 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.restore();
        }

        // 3. Subtle cool tint (removed harsh overlay)
        // Ambient lighting already handles night coloring
        ctx.restore();
    }

    /**
     * Update configuration at runtime
     */
    public updateConfig(newConfig: Partial<IAtmosphereConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Re-initialize if needed
        if (newConfig.cloudShadowCount !== undefined ||
            newConfig.cloudShadowDirection !== undefined ||
            newConfig.cloudShadowMinSize !== undefined ||
            newConfig.cloudShadowMaxSize !== undefined) {
            this.clouds = [];
            this.initializeCloudShadows();
        }
        if (newConfig.starCount !== undefined || newConfig.enableStars !== undefined) {
            this.starPositions = [];
            if (this.config.enableStars) {
                this.initializeStars();
            }
        }
    }

    public getConfig(): IAtmosphereConfig {
        return { ...this.config };
    }
}
