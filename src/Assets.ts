import { CONFIG } from './Config';

export class Assets {
    // Хранилище изображений
    private static images: Record<string, HTMLCanvasElement | HTMLImageElement> = {};

    // ГЛАВНЫЙ МЕТОД ЗАГРУЗКИ
    public static async loadAll(): Promise<void> {
        console.log('Assets: Start loading...');

        // Здесь можно добавить загрузку внешних картинок:
        // await this.loadImage('hero', 'hero.png');

        // Пока генерируем процедурные текстуры (синхронно, но быстро)
        this.generateAllTextures();

        console.log('Assets: Loading complete!');
        return Promise.resolve();
    }

    public static get(name: string): HTMLCanvasElement | HTMLImageElement | undefined {
        return this.images[name];
    }

    // --- ГЕНЕРАЦИЯ ТЕКСТУР (Как и было, но собрано в один метод) ---
    private static generateAllTextures() {
        // Окружение
        this.generateTexture('grass', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 20; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#66bb6a' : '#388e3c';
                ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4);
            }
        });

        this.generateTexture('path', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#d7ccc8';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 15; i++) {
                ctx.fillStyle = '#a1887f';
                ctx.beginPath();
                ctx.arc(Math.random() * w, Math.random() * h, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        this.generateTexture('decor_tree', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(0, 0, w, h); // Фон травы
            ctx.fillStyle = '#2e7d32';
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1b5e20';
            ctx.beginPath();
            ctx.arc(w / 2 - 5, h / 2 - 5, 8, 0, Math.PI * 2);
            ctx.fill();
        });

        this.generateTexture('decor_rock', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#78909c';
            ctx.beginPath();
            ctx.moveTo(10, h - 10);
            ctx.lineTo(w / 2, 10);
            ctx.lineTo(w - 10, h - 10);
            ctx.fill();
        });

        // Башни
        this.generateTexture('tower_base', CONFIG.TILE_SIZE, (ctx, w, h) => {
            const center = w / 2;
            ctx.fillStyle = '#9e9e9e';
            ctx.beginPath();
            ctx.arc(center, center, w * 0.375, 0, Math.PI * 2); // 24/64 = 0.375
            ctx.fill();
            ctx.strokeStyle = '#616161';
            ctx.lineWidth = 4;
            ctx.stroke();
        });

        this.generateTexture('tower_gun', CONFIG.TILE_SIZE, (ctx, w, h) => {
            const center = w / 2;
            const barrelWidth = w * 0.125;  // 8/64 = 0.125
            const barrelLength = w * 0.53;  // 34/64 ~= 0.53
            const barrelStart = w * 0.31;   // 20/64 ~= 0.31

            ctx.fillStyle = '#424242';
            // Draw barrel horizontally pointing RIGHT (East)
            ctx.fillRect(barrelStart, center - barrelWidth / 2, barrelLength, barrelWidth);
            ctx.beginPath();
            ctx.arc(center, center, w * 0.22, 0, Math.PI * 2); // 14/64 ~= 0.22
            ctx.fill(); // Turret body
            ctx.fillStyle = '#eceff1';
            ctx.beginPath();
            ctx.arc(center, center, w * 0.094, 0, Math.PI * 2); // 6/64 ~= 0.094
            ctx.fill();
        });

        // Враги
        const enemies = Object.values(CONFIG.ENEMY_TYPES);
        enemies.forEach((e) => {
            this.generateEnemyTexture(e.id, e.color);
        });

        // Fog
        this.generateFogTiles();

        // --- NEW MODULAR TOWER ASSETS ---
        this.generateTowerParts();
    }

    private static generateTexture(
        name: string,
        size: number,
        drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    ) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        drawFn(ctx, size, size);
        this.images[name] = canvas;
    }

    private static generateEnemyTexture(name: string, color: string) {
        this.generateTexture(`enemy_${name}`, 48, (ctx, w, h) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Глаза
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(w / 2 - 6, h / 2 - 5, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(w / 2 + 6, h / 2 - 5, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(w / 2 - 6, h / 2 - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(w / 2 + 6, h / 2 - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    private static generateFogTiles() {
        const TS = CONFIG.TILE_SIZE;
        // Generate 16 bitmask variations (0-15)
        for (let i = 0; i < 16; i++) {
            this.generateTexture(`fog_${i}`, TS, (ctx, w, h) => {
                const NORTH = (i & 1) !== 0;
                const WEST = (i & 2) !== 0;
                const EAST = (i & 4) !== 0;
                const SOUTH = (i & 8) !== 0;

                // Base fog color (Dark)
                ctx.fillStyle = '#263238'; // Dark Blue Grey

                // Draw main body based on connections
                // We draw a center rect and extend to connected sides
                const cx = w / 2;
                const cy = h / 2;
                const halfW = w / 2;
                const halfH = h / 2;

                // Always draw center
                ctx.fillRect(cx - halfW, cy - halfH, w, h);

                // This simple logic fills the whole tile if it's fog
                // But for bitmasking we want to show "edges" where there is NO fog neighbor

                // Actually, for "Fog of War" where 1=Fog (Hidden), we draw the fog.
                // If I am a Fog tile, I am fully obscured. 
                // But to make it look nice (soft edges), we can use gradients or rounded corners 
                // on sides that are NOT connected to other fog.

                // Let's retry the visual approach:
                // We fill the whole tile with black/dark.
                // Then, for sides that are NOT connected (value 0 in bitmask), we fade out or draw a border?
                // Wait, standard bitmasking works by selecting a sprite that "connects" to neighbors.
                // So '15' (connected all sides) is a solid dark block.
                // '0' (connected to none, i.e., isolated fog) is a dark circle or blob.

                ctx.clearRect(0, 0, w, h); // Start fresh
                ctx.fillStyle = '#263238';

                // Dynamic dimensions based on tile size (25% margins, 50% center)
                const cX = Math.floor(w / 4);      // Left margin
                const cY = Math.floor(h / 4);      // Top margin
                const cW = Math.floor(w / 2);      // Center width
                const cH = Math.floor(h / 2);      // Center height
                const arcRadius = Math.floor(cW / 2);

                // Draw Center
                ctx.fillRect(cX, cY, cW, cH);

                // NORTH
                if (NORTH) {
                    ctx.fillRect(cX, 0, cW, cY);
                } else {
                    ctx.beginPath();
                    ctx.arc(w / 2, cY, arcRadius, Math.PI, 0);
                    ctx.fill();
                }

                // SOUTH
                if (SOUTH) {
                    ctx.fillRect(cX, cY + cH, cW, h - (cY + cH));
                } else {
                    ctx.beginPath();
                    ctx.arc(w / 2, cY + cH, arcRadius, 0, Math.PI);
                    ctx.fill();
                }

                // WEST
                if (WEST) {
                    ctx.fillRect(0, cY, cX, cH);
                } else {
                    ctx.beginPath();
                    ctx.arc(cX, h / 2, arcRadius, Math.PI * 0.5, Math.PI * 1.5);
                    ctx.fill();
                }

                // EAST
                if (EAST) {
                    ctx.fillRect(cX + cW, cY, w - (cX + cW), cH);
                } else {
                    ctx.beginPath();
                    ctx.arc(cX + cW, h / 2, arcRadius, Math.PI * 1.5, Math.PI * 0.5);
                    ctx.fill();
                }

                // Fill corners if both adjacent sides are connected
                // NW
                if (NORTH && WEST) ctx.fillRect(0, 0, cX, cY);
                // NE
                if (NORTH && EAST) ctx.fillRect(cX + cW, 0, w - (cX + cW), cY);
                // SW
                if (SOUTH && WEST) ctx.fillRect(0, cY + cH, cX, h - (cY + cH));
                // SE
                if (SOUTH && EAST) ctx.fillRect(cX + cW, cY + cH, w - (cX + cW), h - (cY + cH));
            });
        }
    }

    private static generateTowerParts() {
        const size = CONFIG.TILE_SIZE;

        // -- 1. Bases --
        this.generateTexture('base_default', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            const r = w * 0.35;
            // Main platform
            ctx.fillStyle = '#9e9e9e'; // Grey 500
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            // Rim
            ctx.strokeStyle = '#616161'; // Grey 700
            ctx.lineWidth = 3;
            ctx.stroke();
            // Rivets
            ctx.fillStyle = '#424242';
            for (let i = 0; i < 4; i++) {
                const a = i * (Math.PI / 2);
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4), 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // -- 2. Turrets --

        // Standard / Default
        this.generateTexture('turret_standard', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);
            // Simple gun
            ctx.fillStyle = '#616161';
            ctx.fillRect(0, -6, 20, 12); // Barrel
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2); // Body
            ctx.fill();
            ctx.strokeStyle = '#212121';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Ice Turret (Crystal/Prism, Blue)
        this.generateTexture('turret_ice', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            // Barrel - Crystal spike
            ctx.fillStyle = '#4dd0e1'; // Cyan 300
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(24, 0);
            ctx.lineTo(0, 4);
            ctx.fill();

            // Body - Hexagon
            ctx.fillStyle = '#00acc1'; // Cyan 600
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = i * (Math.PI / 3);
                const r = 14;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#e0f7fa';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Fire Turret (Mortar/Flamethrower, Orange/Red)
        this.generateTexture('turret_fire', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            // Barrel - Wide, short
            ctx.fillStyle = '#ff7043'; // Deep Orange 400
            ctx.fillRect(0, -10, 18, 20);
            // Barrel Tip (charred)
            ctx.fillStyle = '#bf360c';
            ctx.fillRect(14, -10, 4, 20);

            // Body - Round, massive
            ctx.fillStyle = '#f4511e'; // Deep Orange 600
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffccbc';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Sniper Turret (Long Rifle, Green/Camo)
        this.generateTexture('turret_sniper', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            // Barrel - Long, thin
            ctx.fillStyle = '#1b5e20'; // Green 900
            ctx.fillRect(0, -3, 30, 6);
            // Muzzle brake
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(28, -5, 4, 10);

            // Body - Sleek, angular
            ctx.fillStyle = '#2e7d32'; // Green 800
            ctx.beginPath();
            ctx.moveTo(-10, -8);
            ctx.lineTo(10, -5);
            ctx.lineTo(10, 5);
            ctx.lineTo(-10, 8);
            ctx.closePath();
            ctx.fill();
        });

        // Split Turret (Gatling/Tri-barrel, Yellow)
        this.generateTexture('turret_split', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            // Barrels - Three spread out
            ctx.fillStyle = '#fbc02d'; // Yellow 700
            const spread = 0.3;
            // 1
            ctx.save(); ctx.rotate(-spread); ctx.fillRect(0, -3, 20, 6); ctx.restore();
            // 2
            ctx.fillRect(0, -3, 22, 6);
            // 3
            ctx.save(); ctx.rotate(spread); ctx.fillRect(0, -3, 20, 6); ctx.restore();

            // Body - Wide
            ctx.fillStyle = '#f57f17'; // Yellow 900
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fill();
        });


        // -- 3. Modules (Overlay attachments) --

        // Mod Ice (Cooling tank - Blue canister)
        this.generateTexture('mod_ice', 24, (ctx, w, h) => {
            // Anchor point is roughly center relative to mounting point
            ctx.fillStyle = '#0277bd'; // Light Blue 800
            ctx.fillRect(4, 4, 16, 10);
            ctx.fillStyle = '#4fc3f7'; // Light Blue 300 (liquid level)
            ctx.fillRect(6, 6, 12, 6);
            // Cap
            ctx.fillStyle = '#eceff1';
            ctx.fillRect(18, 6, 4, 6);
        });

        // Mod Fire (Fuel tank - Red canister)
        this.generateTexture('mod_fire', 24, (ctx, w, h) => {
            ctx.fillStyle = '#c62828'; // Red 800
            ctx.beginPath();
            ctx.rect(6, 4, 12, 16);
            ctx.fill();
            // Symbol
            ctx.fillStyle = '#ffeb3b';
            ctx.font = '10px Arial';
            ctx.fillText('⚡', 8, 16);
        });

        // Mod Sniper (Scope - Lens)
        this.generateTexture('mod_sniper', 24, (ctx, w, h) => {
            ctx.fillStyle = '#212121'; // Black body
            ctx.fillRect(2, 8, 20, 8);
            // Lens
            ctx.fillStyle = '#00e5ff'; // Cyan accent
            ctx.beginPath();
            ctx.arc(22, 12, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Mod Split (Ammo box / Extra barrel)
        this.generateTexture('mod_split', 24, (ctx, w, h) => {
            ctx.fillStyle = '#ff6f00'; // Amber 900
            ctx.fillRect(4, 4, 16, 16);
            // Bullets hint
            ctx.fillStyle = '#ffd54f';
            ctx.fillRect(6, 6, 4, 12);
            ctx.fillRect(14, 6, 4, 12);
        });

        this.generateEnemyArchetypes();
        this.generateEnemyProps();
    }

    private static generateEnemyArchetypes() {
        const size = 48; // Base enemy size

        // 1. Skeleton (Standard)
        this.generateTexture('enemy_skeleton', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;

            // Bones (White/Grey)
            ctx.fillStyle = '#e0e0e0';

            // Skull
            ctx.beginPath();
            ctx.arc(cx, cy - 5, 10, 0, Math.PI * 2);
            ctx.fill();

            // Ribcage/Shoulders
            ctx.fillRect(cx - 8, cy + 2, 16, 6);

            // Spine
            ctx.fillRect(cx - 2, cy + 8, 4, 8);

            // Pelvis
            ctx.fillRect(cx - 6, cy + 16, 12, 4);

            // Eyes (Hollow)
            ctx.fillStyle = '#212121';
            ctx.beginPath();
            ctx.arc(cx - 3, cy - 5, 2, 0, Math.PI * 2);
            ctx.arc(cx + 3, cy - 5, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Wolf (Fast)
        this.generateTexture('enemy_wolf', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;

            // Body (Elongated) - Grey/Brown
            ctx.fillStyle = '#5d4037'; // Brownish grey

            ctx.beginPath();
            ctx.ellipse(cx, cy + 2, 8, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Head
            ctx.beginPath();
            ctx.arc(cx, cy - 10, 8, 0, Math.PI * 2);
            ctx.fill();

            // Ears
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy - 14);
            ctx.lineTo(cx - 8, cy - 20);
            ctx.lineTo(cx - 2, cy - 16);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(cx + 5, cy - 14);
            ctx.lineTo(cx + 8, cy - 20);
            ctx.lineTo(cx + 2, cy - 16);
            ctx.fill();

            // Tail
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx, cy + 14);
            ctx.lineTo(cx, cy + 22);
            ctx.stroke();

            // Eyes (Red glow)
            ctx.fillStyle = '#ff1744';
            ctx.beginPath();
            ctx.arc(cx - 3, cy - 10, 1.5, 0, Math.PI * 2);
            ctx.arc(cx + 3, cy - 10, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // 3. Troll (Heavy)
        this.generateTexture('enemy_troll', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;

            // Body (Massive) - Green skin
            ctx.fillStyle = '#558b2f';

            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.fill();

            // Arms (Big shoulders)
            ctx.beginPath();
            ctx.arc(cx - 16, cy - 5, 8, 0, Math.PI * 2);
            ctx.arc(cx + 16, cy - 5, 8, 0, Math.PI * 2);
            ctx.fill();

            // Head (Small relative to body)
            ctx.beginPath();
            ctx.arc(cx, cy - 10, 10, 0, Math.PI * 2);
            ctx.fill();

            // Angry brow
            ctx.fillStyle = '#33691e';
            ctx.beginPath();
            ctx.arc(cx, cy - 12, 10, 0.2, Math.PI - 0.2, true);
            ctx.fill();
        });

        // 4. Spider (Boss)
        this.generateTexture('enemy_spider', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;

            // Abdomen (Large rear) - Black/Dark Purple
            ctx.fillStyle = '#311b92';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 8, 12, 16, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cephalothorax (Head/Chest)
            ctx.fillStyle = '#4527a0';
            ctx.beginPath();
            ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
            ctx.fill();

            // Legs
            ctx.strokeStyle = '#311b92';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                // Right legs
                ctx.beginPath();
                ctx.moveTo(cx + 5, cy - 5 + i * 4);
                ctx.lineTo(cx + 20, cy - 10 + i * 6);
                ctx.stroke();

                // Left legs
                ctx.beginPath();
                ctx.moveTo(cx - 5, cy - 5 + i * 4);
                ctx.lineTo(cx - 20, cy - 10 + i * 6);
                ctx.stroke();
            }

            // Many eyes
            ctx.fillStyle = '#d50000';
            ctx.beginPath();
            ctx.arc(cx - 3, cy - 10, 1.5, 0, Math.PI * 2);
            ctx.arc(cx + 3, cy - 10, 1.5, 0, Math.PI * 2);
            ctx.arc(cx, cy - 12, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    private static generateEnemyProps() {
        const size = 32;

        // 1. Shield (Armor)
        this.generateTexture('prop_shield', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;

            // Wood texture
            ctx.fillStyle = '#8d6e63';
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
            // Metal rim
            ctx.strokeStyle = '#bdbdbd';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Center boss
            ctx.fillStyle = '#bdbdbd';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Helmet (Leader)
        this.generateTexture('prop_helmet', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;

            // Gold
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy + 5);
            ctx.lineTo(cx + 10, cy + 5);
            ctx.lineTo(cx + 10, cy - 5);
            ctx.lineTo(cx, cy - 12); // Spike
            ctx.lineTo(cx - 10, cy - 5);
            ctx.closePath();
            ctx.fill();

            // Horns
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy - 2);
            ctx.quadraticCurveTo(cx - 16, cy - 8, cx - 14, cy - 14);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 10, cy - 2);
            ctx.quadraticCurveTo(cx + 16, cy - 8, cx + 14, cy - 14);
            ctx.stroke();
        });

        // 3. Barrier (Energy Shield)
        this.generateTexture('prop_barrier', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;

            // Semi-transparent sphere
            ctx.fillStyle = 'rgba(100, 255, 218, 0.4)';
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();

            // Runes
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.stroke();
        });

        // 4. Weapon (Sword)
        this.generateTexture('prop_weapon', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;

            ctx.translate(cx, cy);
            ctx.rotate(Math.PI / 4); // Diagonal

            // Handle
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(-2, 4, 4, 10);

            // Guard
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-6, 2, 12, 2);

            // Blade
            ctx.fillStyle = '#cfd8dc';
            ctx.fillRect(-3, -14, 6, 16);
            // Tip
            ctx.beginPath();
            ctx.moveTo(-3, -14);
            ctx.lineTo(3, -14);
            ctx.lineTo(0, -18);
            ctx.fill();
        });
    }
}
