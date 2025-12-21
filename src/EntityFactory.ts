import { Enemy } from './Enemy';
import { Tower } from './Tower';
import { CONFIG, getEnemyType } from './Config';
import { generateUUID } from './Utils';

export class EntityFactory {
    // ИСПРАВЛЕНИЕ: Убрали лишние аргументы, теперь ровно 3
    public static createEnemy(typeKey: string, wave: number, path: { x: number; y: number }[]): Enemy {
        const enemy = new Enemy();
        this.setupEnemy(enemy, typeKey, wave, path);
        return enemy;
    }

    public static setupEnemy(enemy: Enemy, typeKey: string, wave: number, path: { x: number; y: number }[]) {
        const safeKey = typeKey || 'GRUNT';

        const typeConf = getEnemyType(safeKey) || getEnemyType('GRUNT')!;
        if (!getEnemyType(safeKey)) {
            console.warn(`Unknown enemy type: ${typeKey}, falling back to GRUNT`);
        }

        const hp = CONFIG.ENEMY.BASE_HP * typeConf.hpMod * Math.pow(CONFIG.ENEMY.HP_GROWTH, wave - 1);

        // Spawn enemy at the first waypoint
        const startX = path.length > 0 ? path[0].x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 : 0;
        const startY = path.length > 0 ? path[0].y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 : 0;

        enemy.init({
            id: `e_${generateUUID()}`,
            health: hp,
            speed: typeConf.speed,
            path: path,
            x: startX,
            y: startY,
        });

        enemy.setType(typeConf.id || safeKey.toLowerCase());
        enemy.reward = typeConf.reward || 5;
    }

    public static createTower(col: number, row: number): Tower {
        return new Tower(col, row);
    }
}
