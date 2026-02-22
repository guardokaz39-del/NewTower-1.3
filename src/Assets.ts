import { CONFIG } from './Config';
import { VISUALS } from './VisualConfig';
import { ProceduralPatterns } from './ProceduralPatterns';
import { ProceduralRoad } from './renderers/ProceduralRoad';
import { ProceduralGrass } from './renderers/ProceduralGrass';
import { SpriteBaker } from './utils/SpriteBaker';
import { OrcUnitRenderer } from './renderers/units/OrcUnitRenderer';
import { SkeletonUnitRenderer } from './renderers/units/SkeletonUnitRenderer';
import { GoblinUnitRenderer } from './renderers/units/GoblinUnitRenderer';
import { SpiderUnitRenderer } from './renderers/units/SpiderUnitRenderer';
import { TrollUnitRenderer } from './renderers/units/TrollUnitRenderer';
import { RatUnitRenderer } from './renderers/units/RatUnitRenderer';
import { HellhoundUnitRenderer } from './renderers/units/HellhoundUnitRenderer';
import { MagmaUnitRenderer } from './renderers/units/MagmaUnitRenderer';
import { FleshUnitRenderer } from './renderers/units/FleshUnitRenderer';
import { Logger, LogChannel, LogLevel } from './utils/Logger';

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

    private static missingAssets: Record<string, string[]> = {
        tiles: [],
        enemies: [],
        towers: [],
        props: [],
        projectiles: [],
        other: []
    };

    private static skippedAssets: number = 0;

    // ГЛАВНЫЙ МЕТОД ЗАГРУЗКИ
    public static async loadAll(): Promise<void> {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║   ASSETS: Начало загрузки ресурсов    ║');
        console.log('╚════════════════════════════════════════╝\n');

        this.loadStats = { attempted: 0, loaded: 0, failed: 0, procedural: 0 };

        if (this.USE_EXTERNAL_ASSETS) {
            Logger.info(LogChannel.ASSETS, '[1/3] Попытка загрузить внешние PNG ассеты...');
            try {
                await this.loadExternalAssets();
            } catch (error) {
                Logger.warn(LogChannel.ASSETS, 'Ошибки при загрузке PNG, используем процедурные', error);
            }
        }

        // Генерируем процедурные текстуры для недостающих ассетов
        Logger.info(LogChannel.ASSETS, '[2/3] Генерация процедурных текстур для недостающих ассетов...');
        this.generateFallbackTextures();

        // PHASE 3: Bake Animations
        Logger.info(LogChannel.ASSETS, '[3/3] Запекание анимаций врагов (Sprite Baking)...');
        this.generateBakedSprites();

        Logger.groupCollapsed('ASSETS Boot Summary');
        Logger.info(LogChannel.ASSETS, `PNG Loaded: ${this.loadStats.loaded}`);
        Logger.info(LogChannel.ASSETS, `Procedural Generated: ${this.loadStats.procedural}`);

        if (this.skippedAssets > 0) {
            Logger.info(LogChannel.ASSETS, `Skipped N already-cached textures: ${this.skippedAssets}`);
        }

        const missingCount = Object.values(this.missingAssets).reduce((a, b) => a + b.length, 0);
        if (missingCount > 0) {
            Logger.warn(LogChannel.ASSETS, `Missing PNG (${missingCount}) → procedural fallback enabled`);
            for (const [key, list] of Object.entries(this.missingAssets)) {
                if (list.length > 0) {
                    const showCount = Math.min(list.length, 5);
                    const hidden = list.length - showCount;
                    Logger.warn(LogChannel.ASSETS, `  ${key}/* (${list.length}): ${list.slice(0, showCount).join(', ')}${hidden > 0 ? ` ...and ${hidden} more` : ''}`);
                }
            }
        }
        Logger.groupEnd();

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
                resolve(true);
            };
            img.onerror = () => {
                if (!silent) {
                    // Categorize missing assets for the final summary
                    let prefix = 'other';
                    if (path.includes('tiles/')) prefix = 'tiles';
                    else if (path.includes('enemies/')) prefix = 'enemies';
                    else if (path.includes('towers/')) prefix = 'towers';
                    else if (path.includes('projectiles/')) prefix = 'projectiles';
                    else if (path.includes('props/')) prefix = 'props';

                    if (this.missingAssets[prefix]) {
                        this.missingAssets[prefix].push(path);
                    } else {
                        this.missingAssets['other'].push(path);
                    }
                }
                resolve(false);
            };
            // Поддержка загрузки из корня (если путь начинается с '../')
            img.src = path.startsWith('../') ? path : `/assets/images/${path}`;
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

        // Фоны меню (загружаем из корня)
        loadTasks.push(this.tryLoadSingleImage('menu_start', '../start.jpg').then(() => { }));
        loadTasks.push(this.tryLoadSingleImage('menu_map', '../map.jpg').then(() => { }));


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
            'effect_muzzle_flash', 'shadow_small',
            'fx_boss_aura', 'fx_boss_eye', 'fx_boss_shield', 'fx_soul', 'fx_glow_red'
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
            if (!this.images[name]) {
                this.generateAllTextures();  // Генерируем ВСЕ недостающие
            } else {
                this.skippedAssets++;
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
        this.generateBossEffects(); // New Phase 8
    }

    private static generateBossEffects() {
        const size = 64; // Base size for effects

        // 1. Boss Aura (Pulse)
        this.generateTexture('fx_boss_aura', size * 2, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            const grad = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 0.5);
            grad.addColorStop(0, 'rgba(255, 111, 0, 0.0)');
            grad.addColorStop(0.7, 'rgba(255, 111, 0, 0.4)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        });

        // 2. Boss Eye (Glowing)
        this.generateTexture('fx_boss_eye', 32, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            // Halo
            const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
            grad.addColorStop(0, '#00e5ff');
            grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            // Core
            ctx.fillStyle = '#e0f7fa';
            ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
        });

        // 3. Invulnerability Shield
        this.generateTexture('fx_boss_shield', 128, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            const r = w * 0.45;
            // Shield Body
            const grad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
            grad.addColorStop(0, 'rgba(255, 215, 0, 0)');
            grad.addColorStop(0.6, 'rgba(255, 215, 0, 0.1)');
            grad.addColorStop(1, 'rgba(255, 235, 59, 0.4)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            // Rim
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        });

        // 4. Soul Particle
        this.generateTexture('fx_soul', 16, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 8);
            grad.addColorStop(0, '#00e5ff');
            grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
        });

        // 5. Red Glow (For Skeleton Commander)
        this.generateTexture('fx_glow_red', 32, (ctx, w, h) => {
            const cx = w / 2;
            const cy = h / 2;
            const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
            grad.addColorStop(0, '#ff3d00');
            grad.addColorStop(1, 'rgba(255, 61, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        });
    }

    private static generateTexture(
        name: string,
        size: number,
        drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    ) {
        // КРИТИЧНО: Не перезаписывать уже загруженные PNG!
        if (this.images[name]) {
            this.skippedAssets++;
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
            this.skippedAssets++;
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

        // -- 2. Turrets --

        // Standard / Default
        this.generateTexture('turret_standard', size, (ctx, w, h) => {
            ctx.save();
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
            ctx.restore();
        });

        // Loop for 3 levels
        for (let level = 1; level <= 3; level++) {

            // --- FIRE TURRET (Mortar) ---
            this.generateTexture(`turret_fire_${level}`, size, (ctx, w, h) => {
                ctx.save();
                const cx = w / 2;
                const cy = h / 2;
                ctx.translate(cx, cy);

                // Level 1: Basic Mortar Cannon
                // Level 2: + Heat Fins + Reinforced
                // Level 3: + Magma Core + Glowing Cracks

                // === BARREL (Conical, not flat rectangle) ===
                const barrelLen = 18 + level * 2; // 20-24px
                const barrelBaseW = 14 + level * 2; // 16-20px base
                const barrelTipW = 8 + level; // 9-11px tip (tapered)

                // Barrel gradient (dark to hot)
                const barrelGrad = ctx.createLinearGradient(0, 0, barrelLen, 0);
                barrelGrad.addColorStop(0, '#5d4037'); // Dark brown base
                barrelGrad.addColorStop(0.7, '#8d6e63'); // Mid brown
                barrelGrad.addColorStop(1, '#ff5722'); // Hot orange tip

                ctx.fillStyle = barrelGrad;
                ctx.beginPath();
                ctx.moveTo(0, -barrelBaseW / 2);
                ctx.lineTo(barrelLen, -barrelTipW / 2);
                ctx.lineTo(barrelLen, barrelTipW / 2);
                ctx.lineTo(0, barrelBaseW / 2);
                ctx.closePath();
                ctx.fill();

                // Barrel metal bands
                ctx.fillStyle = '#3e2723'; // Dark metal
                ctx.fillRect(4, -barrelBaseW / 2 - 1, 3, barrelBaseW + 2);
                if (level >= 2) {
                    ctx.fillRect(10, -barrelBaseW / 2 + 2, 2, barrelBaseW - 4);
                }

                // Muzzle ring
                ctx.strokeStyle = '#ff9800';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(barrelLen, 0, barrelTipW / 2, -Math.PI / 2, Math.PI / 2);
                ctx.stroke();

                // === BODY (Armored sphere with details) ===
                const bodyR = 13 + level;

                // Body gradient (metallic look)
                const bodyGrad = ctx.createRadialGradient(-3, -3, 0, 0, 0, bodyR);
                bodyGrad.addColorStop(0, '#a1887f'); // Highlight
                bodyGrad.addColorStop(0.5, '#795548'); // Mid
                bodyGrad.addColorStop(1, '#4e342e'); // Shadow

                ctx.fillStyle = bodyGrad;
                ctx.beginPath();
                ctx.arc(0, 0, bodyR, 0, Math.PI * 2);
                ctx.fill();

                // Body outline
                ctx.strokeStyle = '#3e2723';
                ctx.lineWidth = 2;
                ctx.stroke();

                // === LEVEL 2+ DETAILS ===
                if (level >= 2) {
                    // Heat dissipation fins (side plates)
                    ctx.fillStyle = '#5d4037';
                    // Top fin
                    ctx.beginPath();
                    ctx.moveTo(-8, -bodyR + 2);
                    ctx.lineTo(-4, -bodyR - 4);
                    ctx.lineTo(4, -bodyR - 4);
                    ctx.lineTo(8, -bodyR + 2);
                    ctx.closePath();
                    ctx.fill();
                    // Bottom fin
                    ctx.beginPath();
                    ctx.moveTo(-8, bodyR - 2);
                    ctx.lineTo(-4, bodyR + 4);
                    ctx.lineTo(4, bodyR + 4);
                    ctx.lineTo(8, bodyR - 2);
                    ctx.closePath();
                    ctx.fill();

                    // Rivets on body
                    ctx.fillStyle = '#8d6e63';
                    const rivetAngles = [Math.PI * 0.7, Math.PI * 0.85, Math.PI * 1.15, Math.PI * 1.3];
                    rivetAngles.forEach(a => {
                        ctx.beginPath();
                        ctx.arc(Math.cos(a) * (bodyR - 3), Math.sin(a) * (bodyR - 3), 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }

                // === LEVEL 3 DETAILS ===
                if (level === 3) {
                    // Magma core glow (center)
                    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
                    coreGrad.addColorStop(0, '#ffeb3b'); // Yellow center
                    coreGrad.addColorStop(0.4, '#ff9800'); // Orange
                    coreGrad.addColorStop(1, 'rgba(255,87,34,0)'); // Fade

                    ctx.fillStyle = coreGrad;
                    ctx.beginPath();
                    ctx.arc(0, 0, 8, 0, Math.PI * 2);
                    ctx.fill();

                    // Magma cracks radiating from center
                    ctx.strokeStyle = '#ff5722';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    for (let i = 0; i < 4; i++) {
                        const angle = (i * Math.PI / 2) + Math.PI / 4;
                        ctx.moveTo(Math.cos(angle) * 4, Math.sin(angle) * 4);
                        ctx.lineTo(Math.cos(angle) * (bodyR - 4), Math.sin(angle) * (bodyR - 4));
                    }
                    ctx.stroke();
                }
                ctx.restore();
            });


            // --- ICE TURRET (Magical Crystal) ---
            this.generateTexture(`turret_ice_${level}`, size, (ctx, w, h) => {
                ctx.save();
                const cx = w / 2;
                const cy = h / 2;
                ctx.translate(cx, cy);

                // Level 1: Crystal spike + ice sphere
                // Level 2: + Frost base + inner facets
                // Level 3: + Floating shards + core glow

                // === MAIN CRYSTAL BODY (Hexagon for crystalline look) ===
                const bodyR = 14 + level; // 15-17px

                // === FROST BASE (Level 2+) ===
                if (level >= 2) {
                    ctx.fillStyle = 'rgba(224, 247, 250, 0.6)';
                    ctx.beginPath();
                    ctx.ellipse(0, 3, bodyR + 4, 6, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Hexagon path
                const hexPath = () => {
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (i * Math.PI / 3) - Math.PI / 6;
                        const x = Math.cos(angle) * bodyR;
                        const y = Math.sin(angle) * bodyR;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                };

                // Gradient fill
                const bodyGrad = ctx.createRadialGradient(-3, -3, 0, 0, 0, bodyR);
                bodyGrad.addColorStop(0, '#e0f7fa');
                bodyGrad.addColorStop(0.3, '#80deea');
                bodyGrad.addColorStop(0.7, '#26c6da');
                bodyGrad.addColorStop(1, '#00acc1');

                ctx.fillStyle = bodyGrad;
                hexPath();
                ctx.fill();

                // Outline
                ctx.strokeStyle = '#0097a7';
                ctx.lineWidth = 2;
                hexPath();
                ctx.stroke();

                // === CRYSTAL SPIKE (Multi-faceted) ===
                const spikeLen = 22 + level * 3; // 25-31px
                const spikeBaseW = 8 + level; // 9-11px

                // Spike gradient (white tip -> cyan base)
                const spikeGrad = ctx.createLinearGradient(0, 0, spikeLen, 0);
                spikeGrad.addColorStop(0, '#4dd0e1'); // Base cyan
                spikeGrad.addColorStop(0.7, '#b2ebf2'); // Light cyan
                spikeGrad.addColorStop(1, '#ffffff'); // White tip

                // Main spike body
                ctx.fillStyle = spikeGrad;
                ctx.beginPath();
                ctx.moveTo(bodyR - 4, -spikeBaseW / 2);
                ctx.lineTo(spikeLen, 0);
                ctx.lineTo(bodyR - 4, spikeBaseW / 2);
                ctx.closePath();
                ctx.fill();

                // Spike facet (darker underside)
                ctx.fillStyle = 'rgba(0, 151, 167, 0.4)';
                ctx.beginPath();
                ctx.moveTo(bodyR - 2, 0);
                ctx.lineTo(spikeLen - 2, 0);
                ctx.lineTo(bodyR - 2, spikeBaseW / 2 - 1);
                ctx.closePath();
                ctx.fill();

                // Spike highlight (top edge)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(bodyR - 2, -spikeBaseW / 2 + 1);
                ctx.lineTo(spikeLen - 3, 0);
                ctx.stroke();

                // === INNER FACETS (Level 2+) ===
                if (level >= 2) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.beginPath();
                    ctx.moveTo(-bodyR + 4, -2);
                    ctx.lineTo(0, -bodyR + 3);
                    ctx.lineTo(bodyR - 6, -2);
                    ctx.closePath();
                    ctx.fill();

                    // Secondary facet
                    ctx.fillStyle = 'rgba(178, 235, 242, 0.5)';
                    ctx.beginPath();
                    ctx.moveTo(-bodyR + 5, 2);
                    ctx.lineTo(0, bodyR - 4);
                    ctx.lineTo(bodyR - 7, 2);
                    ctx.closePath();
                    ctx.fill();
                }

                // === CORE GLOW (Level 3) ===
                if (level === 3) {
                    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
                    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                    coreGrad.addColorStop(0.5, 'rgba(128, 222, 234, 0.6)');
                    coreGrad.addColorStop(1, 'rgba(77, 208, 225, 0)');

                    ctx.fillStyle = coreGrad;
                    ctx.beginPath();
                    ctx.arc(0, 0, 6, 0, Math.PI * 2);
                    ctx.fill();

                    // Floating shards (static positions, animated in renderer)
                    ctx.fillStyle = '#4dd0e1';
                    const shardPositions = [
                        { x: -10, y: -14, r: 0.3 },
                        { x: 12, y: -10, r: -0.5 },
                        { x: -8, y: 12, r: 0.7 }
                    ];
                    shardPositions.forEach(s => {
                        ctx.save();
                        ctx.translate(s.x, s.y);
                        ctx.rotate(s.r);
                        ctx.beginPath();
                        ctx.moveTo(0, -3);
                        ctx.lineTo(2, 0);
                        ctx.lineTo(0, 3);
                        ctx.lineTo(-2, 0);
                        ctx.closePath();
                        ctx.fill();
                        ctx.restore();
                    });
                }
                ctx.restore();
            });


            // --- SNIPER TURRET (Rail Gun) ---
            this.generateTexture(`turret_sniper_${level}`, size, (ctx, w, h) => {
                ctx.save();
                const cx = w / 2;
                const cy = h / 2;
                ctx.translate(cx, cy);

                // Level 1: Precision rifle + scope
                // Level 2: + Carbon fiber body + enhanced optics
                // Level 3: + Energy rails + neon accents

                const barrelLen = 28 + level * 4; // 32-40px
                const barrelBaseH = 6 + level; // 7-9px
                const barrelTipH = 3 + level; // 4-6px

                // === BODY (Angular armored housing) ===
                const bodyGrad = ctx.createLinearGradient(-12, -10, -12, 10);
                bodyGrad.addColorStop(0, '#558b2f'); // Light green top
                bodyGrad.addColorStop(0.5, '#33691e'); // Forest green
                bodyGrad.addColorStop(1, '#1b5e20'); // Dark green bottom

                ctx.fillStyle = bodyGrad;
                ctx.beginPath();
                ctx.moveTo(-12, -9);
                ctx.lineTo(8, -6);
                ctx.lineTo(8, 6);
                ctx.lineTo(-12, 9);
                ctx.closePath();
                ctx.fill();

                // Body outline
                ctx.strokeStyle = '#1b5e20';
                ctx.lineWidth = 1;
                ctx.stroke();

                // === BARREL (Tapered precision barrel) ===
                const barrelGrad = ctx.createLinearGradient(6, 0, barrelLen, 0);
                barrelGrad.addColorStop(0, '#424242'); // Gun metal
                barrelGrad.addColorStop(0.3, '#616161');
                barrelGrad.addColorStop(0.7, '#757575');
                barrelGrad.addColorStop(1, '#9e9e9e'); // Light tip

                ctx.fillStyle = barrelGrad;
                ctx.beginPath();
                ctx.moveTo(6, -barrelBaseH / 2);
                ctx.lineTo(barrelLen, -barrelTipH / 2);
                ctx.lineTo(barrelLen, barrelTipH / 2);
                ctx.lineTo(6, barrelBaseH / 2);
                ctx.closePath();
                ctx.fill();

                // Barrel highlight
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(8, -barrelBaseH / 2 + 1);
                ctx.lineTo(barrelLen - 2, -barrelTipH / 2 + 1);
                ctx.stroke();

                // === MUZZLE BRAKE ===
                ctx.fillStyle = '#37474f';
                ctx.fillRect(barrelLen - 3, -barrelTipH / 2 - 2, 5, barrelTipH + 4);

                // Brake slots
                ctx.strokeStyle = '#263238';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(barrelLen - 1, -barrelTipH / 2 - 1);
                ctx.lineTo(barrelLen - 1, barrelTipH / 2 + 1);
                ctx.stroke();

                // === SCOPE (Level 1+) ===
                // Scope body
                ctx.fillStyle = '#263238';
                ctx.fillRect(-6, -10, 14, 4);

                // Scope lens (front)
                const lensGrad = ctx.createRadialGradient(8, -8, 0, 8, -8, 3);
                lensGrad.addColorStop(0, '#4dd0e1'); // Cyan center
                lensGrad.addColorStop(0.6, '#00acc1');
                lensGrad.addColorStop(1, '#006064');

                ctx.fillStyle = lensGrad;
                ctx.beginPath();
                ctx.arc(8, -8, 3, 0, Math.PI * 2);
                ctx.fill();

                // Lens reflection
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath();
                ctx.arc(7, -9, 1, 0, Math.PI * 2);
                ctx.fill();

                // === LEVEL 2+ DETAILS ===
                if (level >= 2) {
                    // Carbon fiber pattern on body
                    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                    ctx.lineWidth = 1;
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.moveTo(-10 + i * 5, -7);
                        ctx.lineTo(-8 + i * 5, 7);
                        ctx.stroke();
                    }

                    // Enhanced scope mount
                    ctx.fillStyle = '#37474f';
                    ctx.fillRect(-2, -12, 6, 3);
                }

                // === LEVEL 3: ENERGY RAILS ===
                if (level === 3) {
                    ctx.strokeStyle = '#69f0ae'; // Neon green
                    ctx.lineWidth = 2;
                    ctx.shadowColor = '#69f0ae';
                    ctx.shadowBlur = 4;

                    // Top rail
                    ctx.beginPath();
                    ctx.moveTo(10, -barrelBaseH / 2 - 1);
                    ctx.lineTo(barrelLen - 5, -barrelTipH / 2 - 1);
                    ctx.stroke();

                    // Bottom rail
                    ctx.beginPath();
                    ctx.moveTo(10, barrelBaseH / 2 + 1);
                    ctx.lineTo(barrelLen - 5, barrelTipH / 2 + 1);
                    ctx.stroke();

                    ctx.shadowBlur = 0;

                    // Energy core in body
                    const coreGrad = ctx.createRadialGradient(-2, 0, 0, -2, 0, 5);
                    coreGrad.addColorStop(0, '#b9f6ca');
                    coreGrad.addColorStop(0.5, '#69f0ae');
                    coreGrad.addColorStop(1, 'rgba(105,240,174,0)');

                    ctx.fillStyle = coreGrad;
                    ctx.beginPath();
                    ctx.arc(-2, 0, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });


            // --- SPLIT TURRET (Rocket Volley) ---
            this.generateTexture(`turret_split_${level}`, size, (ctx, w, h) => {
                ctx.save();
                const cx = w / 2;
                const cy = h / 2;
                ctx.translate(cx, cy);

                // Level 1: 2 rocket tubes + base turret
                // Level 2: 3 tubes + armor plates
                // Level 3: 4 tubes + energy ring

                const barrelCount = level + 1; // 2, 3, 4
                const barrelLen = 20 + level * 3; // 23-29px
                const barrelW = 5 + level; // 6-8px

                const spreadAngle = 0.25; // Radians between tubes
                const startAngle = -spreadAngle * (barrelCount - 1) / 2;

                // === ROCKET TUBES ===
                for (let i = 0; i < barrelCount; i++) {
                    ctx.save();
                    ctx.rotate(startAngle + i * spreadAngle);

                    // Tube gradient (dark to hot)
                    const tubeGrad = ctx.createLinearGradient(0, 0, barrelLen, 0);
                    tubeGrad.addColorStop(0, '#5d4037'); // Dark brown base
                    tubeGrad.addColorStop(0.6, '#8d6e63'); // Medium brown
                    tubeGrad.addColorStop(1, '#ff8f00'); // Amber tip

                    ctx.fillStyle = tubeGrad;
                    ctx.beginPath();
                    ctx.moveTo(8, -barrelW / 2);
                    ctx.lineTo(barrelLen, -barrelW / 2 + 1);
                    ctx.lineTo(barrelLen, barrelW / 2 - 1);
                    ctx.lineTo(8, barrelW / 2);
                    ctx.closePath();
                    ctx.fill();

                    // Tube hollow (dark interior)
                    ctx.fillStyle = '#1a1a1a';
                    ctx.beginPath();
                    ctx.arc(barrelLen, 0, barrelW / 2 - 2, 0, Math.PI * 2);
                    ctx.fill();

                    // Tube band
                    ctx.fillStyle = '#3e2723';
                    ctx.fillRect(12, -barrelW / 2 - 1, 3, barrelW + 2);

                    // Tube highlight
                    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(10, -barrelW / 2 + 1);
                    ctx.lineTo(barrelLen - 2, -barrelW / 2 + 2);
                    ctx.stroke();

                    ctx.restore();
                }

                // === ARMORED BODY (Squared with chamfers - military look) ===
                const bodySize = 13 + level; // 14-16px
                const chamfer = 4;

                // Squared body path
                const squarePath = () => {
                    ctx.beginPath();
                    ctx.moveTo(-bodySize + chamfer, -bodySize);
                    ctx.lineTo(bodySize - chamfer, -bodySize);
                    ctx.lineTo(bodySize, -bodySize + chamfer);
                    ctx.lineTo(bodySize, bodySize - chamfer);
                    ctx.lineTo(bodySize - chamfer, bodySize);
                    ctx.lineTo(-bodySize + chamfer, bodySize);
                    ctx.lineTo(-bodySize, bodySize - chamfer);
                    ctx.lineTo(-bodySize, -bodySize + chamfer);
                    ctx.closePath();
                };

                const bodyGrad = ctx.createRadialGradient(-2, -2, 0, 0, 0, bodySize * 1.2);
                bodyGrad.addColorStop(0, '#ffca28');
                bodyGrad.addColorStop(0.4, '#ff8f00');
                bodyGrad.addColorStop(1, '#e65100');

                ctx.fillStyle = bodyGrad;
                squarePath();
                ctx.fill();

                // Outline
                ctx.strokeStyle = '#bf360c';
                ctx.lineWidth = 2;
                squarePath();
                ctx.stroke();

                // === LEVEL 2+ ARMOR PLATES ===
                if (level >= 2) {
                    ctx.fillStyle = '#5d4037';
                    // Side plates
                    ctx.fillRect(-bodySize - 2, -4, 4, 8);
                    ctx.fillRect(bodySize - 2, -4, 4, 8);

                    // Top/bottom rivets
                    ctx.fillStyle = '#8d6e63';
                    [-6, 0, 6].forEach(x => {
                        ctx.beginPath();
                        ctx.arc(x, -bodySize + 3, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(x, bodySize - 3, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }

                // === LEVEL 3: ENERGY RING ===
                if (level === 3) {
                    ctx.strokeStyle = '#ffab00';
                    ctx.lineWidth = 2;
                    ctx.shadowColor = '#ffab00';
                    ctx.shadowBlur = 4;
                    ctx.beginPath();
                    ctx.arc(0, 0, bodySize + 3, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Inner core glow
                    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
                    coreGrad.addColorStop(0, '#fff8e1');
                    coreGrad.addColorStop(0.5, '#ffca28');
                    coreGrad.addColorStop(1, 'rgba(255,202,40,0)');

                    ctx.fillStyle = coreGrad;
                    ctx.beginPath();
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });



            // --- VOID PRISM (Magical Minigun) ---
            // Pedestal only - floating crystal is drawn procedurally by renderer
            this.generateTexture(`turret_minigun_${level}`, size, (ctx, w, h) => {
                ctx.save();
                const cx = w / 2;
                const cy = h / 2;
                ctx.translate(cx, cy);

                // Level 1: Stone pedestal
                // Level 2: + Rune carvings
                // Level 3: + Energy channel + glow

                // === PEDESTAL BASE ===
                const baseW = 20 + level * 2; // 22-26px
                const baseH = 10 + level; // 11-13px

                // Pedestal gradient (dark stone)
                const baseGrad = ctx.createLinearGradient(0, 0, 0, baseH);
                baseGrad.addColorStop(0, '#37474f'); // Blue grey 800
                baseGrad.addColorStop(0.5, '#263238'); // Blue grey 900
                baseGrad.addColorStop(1, '#1a1a1a'); // Near black

                ctx.fillStyle = baseGrad;
                ctx.beginPath();
                ctx.moveTo(-baseW / 2, 0);
                ctx.lineTo(-baseW / 2 + 4, baseH);
                ctx.lineTo(baseW / 2 - 4, baseH);
                ctx.lineTo(baseW / 2, 0);
                ctx.closePath();
                ctx.fill();

                // Pedestal top rim
                ctx.fillStyle = '#455a64';
                ctx.fillRect(-baseW / 2 + 2, -2, baseW - 4, 4);

                // Pedestal highlight
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-baseW / 2 + 3, -1);
                ctx.lineTo(baseW / 2 - 3, -1);
                ctx.stroke();

                // === RUNE CARVINGS (Level 2+) ===
                if (level >= 2) {
                    ctx.strokeStyle = '#7c4dff'; // Deep purple glow
                    ctx.lineWidth = 1;

                    // Left rune
                    ctx.beginPath();
                    ctx.moveTo(-8, 2);
                    ctx.lineTo(-6, 6);
                    ctx.lineTo(-10, 6);
                    ctx.closePath();
                    ctx.stroke();

                    // Right rune
                    ctx.beginPath();
                    ctx.moveTo(8, 2);
                    ctx.lineTo(10, 6);
                    ctx.lineTo(6, 6);
                    ctx.closePath();
                    ctx.stroke();

                    // Center rune
                    ctx.beginPath();
                    ctx.moveTo(0, 3);
                    ctx.lineTo(0, 7);
                    ctx.stroke();
                }

                // === ENERGY CHANNEL (Level 3) ===
                if (level === 3) {
                    // Glowing channel up the pedestal
                    const channelGrad = ctx.createLinearGradient(0, baseH, 0, -5);
                    channelGrad.addColorStop(0, 'rgba(124,77,255,0.1)');
                    channelGrad.addColorStop(0.5, 'rgba(124,77,255,0.4)');
                    channelGrad.addColorStop(1, 'rgba(124,77,255,0.8)');

                    ctx.fillStyle = channelGrad;
                    ctx.fillRect(-2, -5, 4, baseH + 3);

                    // Side energy lines
                    ctx.strokeStyle = '#b388ff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-baseW / 2 + 5, 1);
                    ctx.lineTo(-4, -3);
                    ctx.moveTo(baseW / 2 - 5, 1);
                    ctx.lineTo(4, -3);
                    ctx.stroke();
                }
                ctx.restore();
            });
        }


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

    /**
     * Runtime Sprite Baking (Phase 3)
     */
    private static generateBakedSprites() {
        try {
            // 1. Orc
            SpriteBaker.bakeWalkCycle('orc', new OrcUnitRenderer());
            console.log('✓ Baked walk cycle for "orc"');

            // 2. Skeleton
            SpriteBaker.bakeWalkCycle('skeleton', new SkeletonUnitRenderer());
            console.log('✓ Baked walk cycle for "skeleton"');

            // 3. Goblin
            SpriteBaker.bakeWalkCycle('goblin', new GoblinUnitRenderer());
            console.log('✓ Baked walk cycle for "goblin"');

            // 4. Spider
            SpriteBaker.bakeWalkCycle('spider', new SpiderUnitRenderer());
            console.log('✓ Baked walk cycle for "spider"');

            // 5. Troll
            SpriteBaker.bakeWalkCycle('troll', new TrollUnitRenderer());
            console.log('✓ Baked walk cycle for "troll"');

            // 6. Rat
            SpriteBaker.bakeWalkCycle('rat', new RatUnitRenderer());
            SpriteBaker.bakeWalkCycle('sapper_rat', new RatUnitRenderer());
            console.log('✓ Baked walk cycle for "rat" & "sapper_rat"');

            // 7. Hellhound
            SpriteBaker.bakeWalkCycle('hellhound', new HellhoundUnitRenderer());
            SpriteBaker.bakeWalkCycle('scout', new HellhoundUnitRenderer());
            console.log('✓ Baked walk cycle for "hellhound" & "scout"');

            // 8. Magma (King & Statue)
            SpriteBaker.bakeWalkCycle('magma_king', new MagmaUnitRenderer());
            SpriteBaker.bakeWalkCycle('magma_statue', new MagmaUnitRenderer());
            console.log('✓ Baked walk cycle for "magma_king" & "magma_statue"');

            // 9. Flesh Colossus
            SpriteBaker.bakeWalkCycle('flesh_colossus', new FleshUnitRenderer());
            console.log('✓ Baked walk cycle for "flesh_colossus"');

            // TODO: Add more enemies here as their renderers are updated

        } catch (e) {
            console.error('Failed to bake sprites:', e);
        }
    }
}
