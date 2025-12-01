import { Enemy } from './Enemy';
import { Tower } from './Tower';
import { CONFIG } from './Config';
import { generateUUID } from './Utils';

export class EntityFactory {
    
    // Исправлено: 3 аргумента. Убрали offset или лишние параметры.
    public static createEnemy(typeKey: string, wave: number, path: {x: number, y: number}[]): Enemy {
        const safeKey = typeKey || 'GRUNT';
        
        let typeConf = (CONFIG.ENEMY_TYPES as any)[safeKey];
        if (!typeConf) {
            console.warn(`Unknown enemy type: ${typeKey}, falling back to GRUNT`);
            typeConf = (CONFIG.ENEMY_TYPES as any)['GRUNT'];
        }

        // Расчет здоровья от волны
        const hp = CONFIG.ENEMY.BASE_HP * typeConf.hpMod * Math.pow(CONFIG.ENEMY.HP_GROWTH, wave - 1);

        const enemy = new Enemy({
            id: `e_${generateUUID()}`,
            health: hp,
            speed: typeConf.speed,
            path: path
        });
        
        enemy.setType(typeConf.id || safeKey.toLowerCase()); 
        (enemy as any).reward = typeConf.reward || 5;
        
        return enemy;
    }

    public static createTower(col: number, row: number): Tower {
        return new Tower(col, row);
    }
}