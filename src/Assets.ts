import { CONFIG } from './Config';
import { VISUALS } from './VisualConfig';
import { ProceduralPatterns } from './ProceduralPatterns';
import { ProceduralRoad } from './renderers/ProceduralRoad';
import { ProceduralGrass } from './renderers/ProceduralGrass';

export class Assets {
    // Хранилище изображений
    private static images: Record<string, HTMLCanvasElement | HTMLImageElement> = {};

    // Хранилище вариантов для рандомизации (например, grass может иметь grass_1, grass_2, grass_3)
    private static variants: Record<string, (HTMLCanvasElement | HTMLImageElement)[]> = {};

    // Режим работы: true = пытаться загрузить PNG, false = только процедурная генерация
    private static USE_EXTERNAL_ASSETS = true;

    // Статистика загрузки
    private static loadStats = {
        attempted: 0,
        loaded: 0,
        failed: 0,
        procedural: 0
    };

    // ГЛАВНЫЙ МЕТОД ЗАГРУЗКИ
    public static async loadAll(): Promise<void> {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║   ASSETS: Начало загрузки ресурсов    ║');
        console.log('╚════════════════════════════════════════╝\n');

        this.loadStats = { attempted: 0, loaded: 0, failed: 0, procedural: 0 };

        if (this.USE_EXTERNAL_ASSETS) {
            console.log('[1/2] Попытка загрузить внешние PNG ассеты...');
            try {
                await this.loadExternalAssets();
                console.log(`✓ Внешние PNG: загружено ${this.loadStats.loaded}, не найдено ${this.loadStats.failed}\n`);
            } catch (error) {
                console.warn('⚠ Ошибки при загрузке PNG, используем процедурные', error);
            }
        }

        // Генерируем процедурные текстуры для недостающих ассетов
        console.log('[2/2] Генерация процедурных текстур для недостающих ассетов...');
        this.generateFallbackTextures();

        console.log('\n╔════════════════════════════════════════╗');
        console.log(`║   ИТОГО: ${Object.keys(this.images).length} ассетов загружено           ║`);
        console.log(`║   PNG: ${this.loadStats.loaded} | Процедурных: ${this.loadStats.procedural}          ║`);
        console.log('╚════════════════════════════════════════╝\n');

        return Promise.resolve();
    }

    /**
     * Получить ассет по имени. Если есть варианты - вернет случайный.
     */
    public static get(name: string): HTMLCanvasElement | HTMLImageElement | undefined {
        // Если есть варианты - выбрать случайный
        if (this.variants[name] && this.variants[name].length > 0) {
            const variantList = this.variants[name];
            return variantList[Math.floor(Math.random() * variantList.length)];
        }

        // Иначе вернуть основной ассет
        return this.images[name];
    }

    /**
     * Получить конкретный вариант ассета (для детерминированного выбора)
     */
    public static getVariant(name: string, variantIndex: number): HTMLCanvasElement | HTMLImageElement | undefined {
        if (this.variants[name] && this.variants[name][variantIndex]) {
            return this.variants[name][variantIndex];
        }
        return this.images[name];
    }

    /**
     * Получить количество вариантов для ассета
     */
    public static getVariantCount(name: string): number {
        return this.variants[name]?.length || 0;
    }

    /**
     * Загрузка одного изображения с поддержкой вариантов
     * Пытается загрузить: name.png, name_1.png, name_2.png, etc.
     */
    private static async loadImage(name: string, path: string, maxVariants: number = 5): Promise<void> {
        this.loadStats.attempted++;

        // Попытка загрузить основной файл
        const mainLoaded = await this.tryLoadSingleImage(name, path);

        if (mainLoaded) {
            this.loadStats.loaded++;

            // Попытка загрузить варианты (name_1.png, name_2.png, etc.)
            const variantList: (HTMLCanvasElement | HTMLImageElement)[] = [];

            // Добавить основной как первый вариант
            if (this.images[name]) {
                variantList.push(this.images[name]);
            }

            // Попробовать загрузить дополнительные варианты
            for (let i = 1; i <= maxVariants; i++) {
                const variantPath = path.replace(/\.png$/, `_${i}.png`);
                const variantName = `${name}_${i}`;
                const loaded = await this.tryLoadSingleImage(variantName, variantPath, true); // silent = true

                if (loaded && this.images[variantName]) {
                    variantList.push(this.images[variantName]);
                }
            }

            // Если есть несколько вариантов - сохранить их
            if (variantList.length > 1) {
                this.variants[name] = variantList;
                console.log(`Assets: Found ${variantList.length} variants for "${name}"`);
            }
        } else {
            this.loadStats.failed++;
        }
    }

    /**
     * Попытка загрузить одно изображение
     */
    private static tryLoadSingleImage(name: string, path: string, silent: boolean = false): Promise<boolean> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                if (!silent) {
                    console.log(`✅ Assets: "${path}" loaded successfully`);
                }
                resolve(true);
            };
            img.onerror = () => {
                if (!silent) {
                    console.log(`❌ Assets: "${path}" not found, will use procedural fallback`);
                }
                resolve(false);
            };
            img.src = `/assets/images/${path}`;
        });
    }

    /**
     * Загрузка всех внешних ассетов
     */
    private static async loadExternalAssets(): Promise<void> {
        const loadTasks: Promise<void>[] = [];

        // === КРИТИЧНЫЕ АССЕТЫ (приоритет для PNG) ===

        // Tiles - окружение (поддерживают варианты для разнообразия)
        // ФАЗА 2: Отключено - используем только процедурную генерацию grass_0...grass_3
        // loadTasks.push(this.loadImage('grass', 'tiles/grass.png', 5));  // до 5 вариантов
        loadTasks.push(this.loadImage('path', 'tiles/path.png', 3));

        // Fog tiles (0-15) - без вариантов, т.к. используются для битмаскинга
        for (let i = 0; i < 16; i++) {
            loadTasks.push(this.loadImage(`fog_${i}`, `tiles/fog_${i}.png`, 0));
        }

        // Декорации - поддерживают варианты
        loadTasks.push(this.loadImage('decor_tree', 'tiles/tree.png', 3));
        loadTasks.push(this.loadImage('decor_rock', 'tiles/rock.png', 5));
        loadTasks.push(this.loadImage('stone', 'tiles/stone.png', 3));
        loadTasks.push(this.loadImage('wheat', 'tiles/wheat.png', 2));
        loadTasks.push(this.loadImage('flowers', 'tiles/flowers.png', 3));

        // Башни - базовые (без вариантов, т.к. визуально важна консистентность)
        loadTasks.push(this.loadImage('tower_base', 'towers/base.png'));
        loadTasks.push(this.loadImage('base_default', 'towers/base_default.png'));
        loadTasks.push(this.loadImage('tower_gun', 'towers/gun.png'));

        // Турели
        loadTasks.push(this.loadImage('turret_standard', 'towers/turret_standard.png'));
        loadTasks.push(this.loadImage('turret_ice', 'towers/turret_ice.png'));
        loadTasks.push(this.loadImage('turret_fire', 'towers/turret_fire.png'));
        loadTasks.push(this.loadImage('turret_sniper', 'towers/turret_sniper.png'));
        loadTasks.push(this.loadImage('turret_split', 'towers/turret_split.png'));
        loadTasks.push(this.loadImage('turret_minigun', 'towers/turret_minigun.png'));

        // Модули
        loadTasks.push(this.loadImage('mod_ice', 'modules/ice.png'));
        loadTasks.push(this.loadImage('mod_fire', 'modules/fire.png'));
        loadTasks.push(this.loadImage('mod_sniper', 'modules/sniper.png'));
        loadTasks.push(this.loadImage('mod_split', 'modules/split.png'));
        loadTasks.push(this.loadImage('mod_minigun', 'modules/minigun.png'));

        // Враги - базовые архетипы (могут иметь варианты для разнообразия)
        loadTasks.push(this.loadImage('enemy_skeleton', 'enemies/skeleton.png', 3));
        loadTasks.push(this.loadImage('enemy_wolf', 'enemies/wolf.png', 2));
        loadTasks.push(this.loadImage('enemy_troll', 'enemies/troll.png', 2));
        loadTasks.push(this.loadImage('enemy_spider', 'enemies/spider.png', 2));

        // Props врагов
        loadTasks.push(this.loadImage('prop_shield', 'props/shield.png'));
        loadTasks.push(this.loadImage('prop_helmet', 'props/helmet.png'));
        loadTasks.push(this.loadImage('prop_weapon', 'props/weapon.png'));
        loadTasks.push(this.loadImage('prop_barrier', 'props/barrier.png'));

        // Снаряды - критичные для геймплея
        loadTasks.push(this.loadImage('projectile_standard', 'projectiles/standard.png'));
        loadTasks.push(this.loadImage('projectile_ice', 'projectiles/ice.png'));
        loadTasks.push(this.loadImage('projectile_fire', 'projectiles/fire.png'));
        loadTasks.push(this.loadImage('projectile_sniper', 'projectiles/sniper.png'));
        loadTasks.push(this.loadImage('projectile_split', 'projectiles/split.png'));
        loadTasks.push(this.loadImage('projectile_minigun', 'projectiles/minigun.png'));

        // ЭФФЕКТЫ - оставляем процедурными (не загружаем PNG)
        // effect_muzzle_flash, shadow_small - будут сгенерированы процедурно

        // Загружаем все параллельно
        await Promise.all(loadTasks);
    }

    /**
     * Генерирует процедурные текстуры для всех ассетов, которые не были загружены
     */
    private static generateFallbackTextures(): void {
        // Проверяем какие ассеты отсутствуют и генерируем для них процедурные текстуры
        const requiredAssets = [
            'grass_0', 'grass_1', 'grass_2', 'grass_3', // 4 variants for grass
            'path', 'decor_tree', 'decor_rock', 'stone', 'wheat', 'flowers',
            'tower_base', 'base_default', 'tower_gun',
            'turret_standard', 'turret_ice', 'turret_fire', 'turret_sniper', 'turret_split', 'turret_minigun',
            'mod_ice', 'mod_fire', 'mod_sniper', 'mod_split', 'mod_minigun',
            'projectile_standard', 'projectile_ice', 'projectile_fire', 'projectile_sniper', 'projectile_split', 'projectile_minigun',
            'effect_muzzle_flash', 'shadow_small'
        ];

        // Добавляем fog tiles
        for (let i = 0; i < 16; i++) {
            requiredAssets.push(`fog_${i}`);
        }

        // Добавляем path tiles (Phase 2 - bitmasking)
        for (let i = 0; i < 16; i++) {
            requiredAssets.push(`path_${i}`);
        }

        // Добавляем enemies
        const enemies = Object.values(CONFIG.ENEMY_TYPES);
        enemies.forEach((e) => {
            requiredAssets.push(`enemy_${e.id}`);
        });

        // Добавляем props
        requiredAssets.push('prop_shield', 'prop_helmet', 'prop_weapon', 'prop_barrier');

        // Генерируем недостающие
        requiredAssets.forEach(assetName => {
            if (!this.images[assetName]) {
                this.generateProceduralAsset(assetName);
            }
        });
    }

    /**
     * Генерирует процедурную текстуру для конкретного ассета
     */
    private static generateProceduralAsset(name: string): void {
        // Вызываем старую систему процедурной генерации
        if (name.startsWith('grass_')) {
            // ФАЗА 2: Обновлено - простая зеленая трава (по запросу пользователя)
            const variantIdx = parseInt(name.split('_')[1]);

            this.generateTexture(name, CONFIG.TILE_SIZE, (ctx, w, h) => {
                // Просто зелёный квадрат БЕЗ деталей
                ctx.fillStyle = '#6b9e4a'; // Средний зелёный
                ctx.fillRect(0, 0, w, h);
            });

            // IMPORTANT: Register as variant for 'grass'
            if (!this.variants['grass']) {
                this.variants['grass'] = [];
            }
            if (this.images[name] instanceof HTMLCanvasElement) {
                this.variants['grass'].push(this.images[name] as HTMLCanvasElement);
            }

            this.loadStats.procedural++;

            // Если это первый вариант, регистрируем его как основной ассет 'grass'
            if (name === 'grass_0') {
                this.images['grass'] = this.images[name];
            }


        } else if (name === 'path') {
            this.generateTexture('path', CONFIG.TILE_SIZE, (ctx, w, h) => {
                ctx.fillStyle = VISUALS.ENVIRONMENT.PATH.MAIN;
                ctx.fillRect(0, 0, w, h);
                for (let i = 0; i < 15; i++) {
                    ctx.fillStyle = VISUALS.ENVIRONMENT.PATH.DETAIL;
                    ctx.beginPath();
                    ctx.arc(Math.random() * w, Math.random() * h, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            this.loadStats.procedural++;
        } else if (name.startsWith('fog_')) {
            // Генерируем fog tiles по старому
            const index = parseInt(name.replace('fog_', ''));
            if (!isNaN(index)) {
                this.generateFogTile(index);
                this.loadStats.procedural++;
            }
        } else if (name.startsWith('path_')) {
            // Генерируем path tiles (Phase 2 - bitmasking)
            this.generatePathTiles(); // Генерируем все 16 за раз
            this.loadStats.procedural++;
        } else if (name.startsWith('enemy_')) {
            // Enemies
            const enemyId = name.replace('enemy_', '');
            const enemy = Object.values(CONFIG.ENEMY_TYPES).find(e => e.id === enemyId);
            if (enemy) {
                this.generateEnemyTexture(enemy.id, enemy.color);
                this.loadStats.procedural++;
            }
        } else {
            // Для всех остальных ассетов генерируем через старую систему
            // НО ТОЛЬКО ЕСЛИ они ещё не загружены!
            console.log(`[Assets] No specific fallback for "${name}", checking if already loaded...`);
            if (!this.images[name]) {
                console.log(`[Assets] "${name}" not loaded, generating procedurally...`);
                this.generateAllTextures();  // Генерируем ВСЕ недостающие
            } else {
                console.log(`[Assets] "${name}" already loaded (PNG), skipping generation`);
            }
        }
    }

    // --- СТАРАЯ СИСТЕМА ПРОЦЕДУРНОЙ ГЕНЕРАЦИИ (оставляем для fallback) ---
    private static generateAllTextures() {
        // ФАЗА 2: Старая генерация 'grass' УДАЛЕНА
        // Используем только современную систему grass_0...grass_3 (см. generateProceduralAsset)


        this.generateTexture('path', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = VISUALS.ENVIRONMENT.PATH.MAIN;
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 15; i++) {
                ctx.fillStyle = VISUALS.ENVIRONMENT.PATH.DETAIL;
                ctx.beginPath();
                ctx.arc(Math.random() * w, Math.random() * h, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        this.generateTexture('decor_tree', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = VISUALS.ENVIRONMENT.DECOR.TREE.BASE;
            ctx.fillRect(0, 0, w, h); // Фон травы
            ctx.fillStyle = VISUALS.ENVIRONMENT.DECOR.TREE.FOLIAGE_LIGHT;
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = VISUALS.ENVIRONMENT.DECOR.TREE.FOLIAGE_DARK;
            ctx.beginPath();
            ctx.arc(w / 2 - 5, h / 2 - 5, 8, 0, Math.PI * 2);
            ctx.fill();
        });

        this.generateTexture('decor_rock', CONFIG.TILE_SIZE, (ctx, w, h) => {
            ctx.fillStyle = VISUALS.ENVIRONMENT.DECOR.ROCK.BASE;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = VISUALS.ENVIRONMENT.DECOR.ROCK.STONE;
            ctx.beginPath();
            ctx.moveTo(10, h - 10);
            ctx.lineTo(w / 2, 10);
            ctx.lineTo(w - 10, h - 10);
            ctx.fill();
        });

        // Башни
        this.generateTexture('tower_base', CONFIG.TILE_SIZE, (ctx, w, h) => {
            const center = w / 2;
            ctx.fillStyle = VISUALS.TOWER.BASE.PLATFORM;
            ctx.beginPath();
            ctx.arc(center, center, w * 0.375, 0, Math.PI * 2); // 24/64 = 0.375
            ctx.fill();
            ctx.strokeStyle = VISUALS.TOWER.BASE.RIM;
            ctx.lineWidth = 4;
            ctx.stroke();
        });

        this.generateTexture('tower_gun', CONFIG.TILE_SIZE, (ctx, w, h) => {
            const center = w / 2;
            const barrelWidth = w * 0.125;  // 8/64 = 0.125
            const barrelLength = w * 0.53;  // 34/64 ~= 0.53
            const barrelStart = w * 0.31;   // 20/64 ~= 0.31

            ctx.fillStyle = VISUALS.TOWER.BASE.RIVETS; // Using rivets color for gun? Original was #424242 which matches rivets
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

        // Path tiles (Phase 2 - bitmasking)
        this.generatePathTiles();

        // --- NEW MODULAR TOWER ASSETS ---
        this.generateTowerParts();

        // --- PROJECTILES & EFFECTS ---
        this.generateProjectiles();
        this.generateMisc();
    }

    private static generateTexture(
        name: string,
        size: number,
        drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    ) {
        // КРИТИЧНО: Не перезаписывать уже загруженные PNG!
        if (this.images[name]) {
            console.log(`[generateTexture] Skipping "${name}" - already loaded as PNG`);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        drawFn(ctx, size, size);
        this.images[name] = canvas;
        console.log(`[generateTexture] Generated procedural "${name}"`);
    }

    /**
     * Layered Texture Generation (Phase 1)
     * Generates textures using multiple layers for richer visuals
     * @param name Asset name
     * @param size Texture size
     * @param layers Layer functions: base, pattern, highlight, dirt
     */
    private static generateLayeredTexture(
        name: string,
        size: number,
        layers: {
            base: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
            pattern?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
            highlight?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
            dirt?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
        }
    ): void {
        // КРИТИЧНО (из аудита): Защита от повторной генерации!
        if (this.images[name]) {
            console.warn(`[Assets] Texture "${name}" already generated, skipping`);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Layer 1: Base (подложка)
        layers.base(ctx, size, size);

        // Layer 2: Pattern (узор)
        if (layers.pattern) {
            layers.pattern(ctx, size, size);
        }

        // Layer 3: Highlight (блики/акценты)
        if (layers.highlight) {
            layers.highlight(ctx, size, size);
        }

        // Layer 4: Dirt (грязь/шум)
        if (layers.dirt) {
            layers.dirt(ctx, size, size);
        }

        this.images[name] = canvas;
        console.log(`[generateLayeredTexture] Generated "${name}" with ${Object.keys(layers).length} layers`);
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
                ctx.fillStyle = VISUALS.ENVIRONMENT.FOG.BASE; // Dark Blue Grey

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
                ctx.fillStyle = VISUALS.ENVIRONMENT.FOG.BASE;

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

    /**
     * Генератирует один fog tile по индексу (для fallback)
     */
    private static generateFogTile(index: number) {
        const TS = CONFIG.TILE_SIZE;
        this.generateTexture(`fog_${index}`, TS, (ctx, w, h) => {
            const NORTH = (index & 1) !== 0;
            const WEST = (index & 2) !== 0;
            const EAST = (index & 4) !== 0;
            const SOUTH = (index & 8) !== 0;

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = VISUALS.ENVIRONMENT.FOG.BASE;

            const cX = Math.floor(w / 4);
            const cY = Math.floor(h / 4);
            const cW = Math.floor(w / 2);
            const cH = Math.floor(h / 2);
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
                ctx.arc(w / 2, cY + cH, arcRadius, 0, Math.PI); ctx.fill();
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
            if (NORTH && WEST) ctx.fillRect(0, 0, cX, cY);
            if (NORTH && EAST) ctx.fillRect(cX + cW, 0, w - (cX + cW), cY);
            if (SOUTH && WEST) ctx.fillRect(0, cY + cH, cX, h - (cY + cH));
            if (SOUTH && EAST) ctx.fillRect(cX + cW, cY + cH, w - (cX + cW), h - (cY + cH));
        });
    }

    /**
     * Generate Path Tiles with Bitmasking
     * Creates 16 variants (0-15) for smooth path connections
     * ФАЗА 1: Обновлено - использует ProceduralRoad для каменной текстуры
     */
    private static generatePathTiles() {
        const TS = CONFIG.TILE_SIZE;



        // Generate 16 bitmask variations (0-15)
        for (let i = 0; i < 16; i++) {
            this.generateTexture(`path_${i}`, TS, (ctx, w, h) => {
                // Использовать ProceduralRoad для каменной текстуры
                try {
                    ProceduralRoad.draw(ctx, 0, 0, i);
                } catch (error) {
                    console.error(`[Assets] ProceduralRoad.draw failed for path_${i}:`, error);
                    // Fallback - простой камень
                    ctx.fillStyle = VISUALS.ENVIRONMENT.PATH.STONE_BASE || '#c5b8a1';
                    ctx.fillRect(0, 0, w, h);
                }
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
            ctx.fillStyle = VISUALS.TOWER.TURRET.STANDARD.BARREL;
            ctx.fillRect(0, -6, 20, 12); // Barrel
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2); // Body
            ctx.fill();
            ctx.strokeStyle = VISUALS.TOWER.TURRET.STANDARD.STROKE;
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Ice Turret (Crystal/Prism, Blue)
        this.generateTexture('turret_ice', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            // Barrel - Crystal spike
            ctx.fillStyle = VISUALS.TOWER.TURRET.ICE.SPIKE; // Cyan 300
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(24, 0);
            ctx.lineTo(0, 4);
            ctx.fill();

            // Body - Hexagon
            ctx.fillStyle = VISUALS.TOWER.TURRET.ICE.MAIN; // Cyan 600
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = i * (Math.PI / 3);
                const r = 14;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = VISUALS.TOWER.TURRET.ICE.STROKE;
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Fire Turret (Mortar/Flamethrower, Orange/Red)
        this.generateTexture('turret_fire', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            // Barrel - Wide, short
            ctx.fillStyle = VISUALS.TOWER.TURRET.FIRE.BARREL; // Deep Orange 400
            ctx.fillRect(0, -10, 18, 20);
            // Barrel Tip (charred)
            ctx.fillStyle = VISUALS.TOWER.TURRET.FIRE.TIP;
            ctx.fillRect(14, -10, 4, 20);

            // Body - Round, massive
            ctx.fillStyle = VISUALS.TOWER.TURRET.FIRE.MAIN; // Deep Orange 600
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = VISUALS.TOWER.TURRET.FIRE.STROKE;
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Sniper Turret (Long Rifle, Green/Camo)
        this.generateTexture('turret_sniper', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            // Barrel - Long, thin
            ctx.fillStyle = VISUALS.TOWER.TURRET.SNIPER.BARREL; // Green 900
            ctx.fillRect(0, -3, 30, 6);
            // Muzzle brake
            ctx.fillStyle = VISUALS.TOWER.TURRET.SNIPER.MUZZLE;
            ctx.fillRect(28, -5, 4, 10);

            // Body - Sleek, angular
            ctx.fillStyle = VISUALS.TOWER.TURRET.SNIPER.MAIN; // Green 800
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
            ctx.fillStyle = VISUALS.TOWER.TURRET.SPLIT.BARREL; // Yellow 700
            const spread = 0.3;
            // 1
            ctx.save(); ctx.rotate(-spread); ctx.fillRect(0, -3, 20, 6); ctx.restore();
            // 2
            ctx.fillRect(0, -3, 22, 6);
            // 3
            ctx.save(); ctx.rotate(spread); ctx.fillRect(0, -3, 20, 6); ctx.restore();

            // Body - Wide
            ctx.fillStyle = VISUALS.TOWER.TURRET.SPLIT.MAIN; // Yellow 900
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fill();
        });

        // Minigun Turret (Gatling gun, Purple/Electric)
        this.generateTexture('turret_minigun', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.translate(cx, cy);

            // Rotating barrel assembly - Multiple thin barrels
            ctx.fillStyle = '#7b1fa2'; // Purple 700
            const barrelCount = 6;
            for (let i = 0; i < barrelCount; i++) {
                const angle = (i / barrelCount) * Math.PI * 2;
                const r = 6; // Radius of barrel circle
                ctx.save();
                ctx.translate(Math.cos(angle) * r, Math.sin(angle) * r);
                ctx.fillRect(0, -1.5, 18, 3); // Thin barrel
                ctx.restore();
            }

            // Central motor housing
            ctx.fillStyle = '#9c27b0'; // Purple 500
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();

            // Electric coil detail
            ctx.strokeStyle = '#e1bee7'; // Purple 100  (light accent)
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.stroke();
        });


        // -- 3. Modules (Overlay attachments) --

        // Mod Ice (Cooling tank - Blue canister)
        this.generateTexture('mod_ice', 24, (ctx, w, h) => {
            // Anchor point is roughly center relative to mounting point
            ctx.fillStyle = VISUALS.TOWER.MODULES.ICE.BODY; // Light Blue 800
            ctx.fillRect(4, 4, 16, 10);
            ctx.fillStyle = VISUALS.TOWER.MODULES.ICE.LIQUID; // Light Blue 300 (liquid level)
            ctx.fillRect(6, 6, 12, 6);
            // Cap
            ctx.fillStyle = VISUALS.TOWER.MODULES.ICE.CAP;
            ctx.fillRect(18, 6, 4, 6);
        });

        // Mod Fire (Fuel tank - Red canister)
        this.generateTexture('mod_fire', 24, (ctx, w, h) => {
            ctx.fillStyle = VISUALS.TOWER.MODULES.FIRE.BODY; // Red 800
            ctx.beginPath();
            ctx.rect(6, 4, 12, 16);
            ctx.fill();
            // Symbol
            ctx.fillStyle = VISUALS.TOWER.MODULES.FIRE.SYMBOL;
            ctx.font = '10px Arial';
            ctx.fillText('⚡', 8, 16);
        });

        // Mod Sniper (Scope - Lens)
        this.generateTexture('mod_sniper', 24, (ctx, w, h) => {
            ctx.fillStyle = VISUALS.TOWER.MODULES.SNIPER.BODY; // Black body
            ctx.fillRect(2, 8, 20, 8);
            // Lens
            ctx.fillStyle = VISUALS.TOWER.MODULES.SNIPER.LENS; // Cyan accent
            ctx.beginPath();
            ctx.arc(22, 12, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Mod Split (Ammo box / Extra barrel)
        this.generateTexture('mod_split', 24, (ctx, w, h) => {
            ctx.fillStyle = VISUALS.TOWER.MODULES.SPLIT.BODY; // Amber 900
            ctx.fillRect(4, 4, 16, 16);
            // Bullets hint
            ctx.fillStyle = VISUALS.TOWER.MODULES.SPLIT.ACCENT;
            ctx.fillRect(6, 6, 4, 12);
            ctx.fillRect(14, 6, 4, 12);
        });

        // Mod Minigun (Ammo belt / Power cell)
        this.generateTexture('mod_minigun', 24, (ctx, w, h) => {
            // Purple ammunition belt with electric coils
            ctx.fillStyle = '#6a1b9a'; // Purple 800
            ctx.fillRect(4, 6, 16, 12);

            // Belt links
            ctx.fillStyle = '#ce93d8'; // Purple 200 (light)
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(6 + i * 4, 8, 2, 8);
            }

            // Energy cell accent
            ctx.fillStyle = '#ba68c8'; // Purple 300
            ctx.beginPath();
            ctx.arc(12, 12, 3, 0, Math.PI * 2);
            ctx.fill();
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
            ctx.fillStyle = VISUALS.ENEMY.SKELETON.BONE;

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
            ctx.fillStyle = VISUALS.ENEMY.SKELETON.EYES;
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
            ctx.fillStyle = VISUALS.ENEMY.WOLF.BODY; // Brownish grey

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
            ctx.strokeStyle = VISUALS.ENEMY.WOLF.BODY;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx, cy + 14);
            ctx.lineTo(cx, cy + 22);
            ctx.stroke();

            // Eyes (Red glow)
            ctx.fillStyle = VISUALS.ENEMY.WOLF.EYES;
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
            ctx.fillStyle = VISUALS.ENEMY.TROLL.SKIN;

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
            ctx.fillStyle = VISUALS.ENEMY.TROLL.FEATURE;
            ctx.beginPath();
            ctx.arc(cx, cy - 12, 10, 0.2, Math.PI - 0.2, true);
            ctx.fill();
        });

        // 4. Spider (Boss)
        this.generateTexture('enemy_spider', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;

            // Abdomen (Large rear) - Black/Dark Purple
            ctx.fillStyle = VISUALS.ENEMY.SPIDER.BODY;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 8, 12, 16, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cephalothorax (Head/Chest)
            ctx.fillStyle = VISUALS.ENEMY.SPIDER.HEAD;
            ctx.beginPath();
            ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
            ctx.fill();

            // Legs
            ctx.strokeStyle = VISUALS.ENEMY.SPIDER.BODY;
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
            ctx.fillStyle = VISUALS.ENEMY.SPIDER.EYES;
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
            ctx.fillStyle = VISUALS.ENEMY.PROPS.SHIELD.WOOD;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
            // Metal rim
            ctx.strokeStyle = VISUALS.ENEMY.PROPS.SHIELD.METAL;
            ctx.lineWidth = 3;
            ctx.stroke();
            // Center boss
            ctx.fillStyle = VISUALS.ENEMY.PROPS.SHIELD.METAL;
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Helmet (Leader)
        this.generateTexture('prop_helmet', size, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;

            // Gold
            ctx.fillStyle = VISUALS.ENEMY.PROPS.HELMET.GOLD;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy + 5);
            ctx.lineTo(cx + 10, cy + 5);
            ctx.lineTo(cx + 10, cy - 5);
            ctx.lineTo(cx, cy - 12); // Spike
            ctx.lineTo(cx - 10, cy - 5);
            ctx.closePath();
            ctx.fill();

            // Horns
            ctx.strokeStyle = VISUALS.ENEMY.PROPS.HELMET.HORN;
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
            ctx.fillStyle = VISUALS.ENEMY.PROPS.BARRIER.FILL;
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();

            // Runes
            ctx.strokeStyle = VISUALS.ENEMY.PROPS.BARRIER.STROKE;
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
            ctx.fillStyle = VISUALS.ENEMY.PROPS.WEAPON.HANDLE;
            ctx.fillRect(-2, 4, 4, 10);

            // Guard
            ctx.fillStyle = VISUALS.ENEMY.PROPS.WEAPON.GUARD;
            ctx.fillRect(-6, 2, 12, 2);

            // Blade
            ctx.fillStyle = VISUALS.ENEMY.PROPS.WEAPON.BLADE;
            ctx.fillRect(-3, -14, 6, 16);
            // Tip
            ctx.beginPath();
            ctx.moveTo(-3, -14);
            ctx.lineTo(3, -14);
            ctx.lineTo(0, -18);
            ctx.fill();
        });
    }
    private static generateProjectiles() {
        const size = 16;
        const cx = size / 2;
        const cy = size / 2;

        // 1. Standard (White Ball)
        this.generateTexture('projectile_standard', size, (ctx, w, h) => {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Ice (Spike)
        this.generateTexture('projectile_ice', size, (ctx, w, h) => {
            ctx.fillStyle = VISUALS.TOWER.TURRET.ICE.SPIKE;
            ctx.beginPath();
            ctx.moveTo(cx + 6, cy);
            ctx.lineTo(cx - 2, cy + 4);
            ctx.lineTo(cx - 4, cy);
            ctx.lineTo(cx - 2, cy - 4);
            ctx.fill();
        });

        // 3. Fire (Fireball)
        this.generateTexture('projectile_fire', size, (ctx, w, h) => {
            // Core
            ctx.fillStyle = VISUALS.TOWER.TURRET.FIRE.MAIN;
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fill();
            // Outer glow (simulated)
            ctx.fillStyle = 'rgba(255, 87, 34, 0.5)';
            ctx.beginPath();
            ctx.arc(cx, cy, 7, 0, Math.PI * 2);
            ctx.fill();
        });

        // 4. Sniper (Bullet Head) - Trail is drawn dynamically
        this.generateTexture('projectile_sniper', size, (ctx, w, h) => {
            ctx.fillStyle = VISUALS.TOWER.TURRET.SNIPER.BARREL;
            ctx.fillRect(cx - 4, cy - 1.5, 8, 3);
        });

        // 5. Split (Small Pellet)
        this.generateTexture('projectile_split', size, (ctx, w, h) => {
            ctx.fillStyle = VISUALS.TOWER.TURRET.SPLIT.BARREL;
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // 6. Minigun (Tracer round)
        this.generateTexture('projectile_minigun', size, (ctx, w, h) => {
            // Small fast tracer with purple/electric glow
            ctx.fillStyle = '#ba68c8'; // Purple 300
            ctx.fillRect(cx - 2, cy - 1, 5, 2);

            // Core
            ctx.fillStyle = '#e1bee7'; // Purple 100 (bright center)
            ctx.fillRect(cx, cy - 0.5, 3, 1);
        });
    }

    private static generateMisc() {
        // Shadow (Generic)
        this.generateTexture('shadow_small', 32, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, 12, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // Muzzle Flash
        this.generateTexture('effect_muzzle_flash', 32, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
            gradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
            gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
