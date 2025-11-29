import { Enemy } from './Enemy';
import { Tower } from './Tower';
import { CONFIG } from './Config';
import { generateUUID } from './Utils';

export class EntityFactory {
    
    public static createEnemy(typeKey: string, wave: number, path: {x: number, y: number}[]): Enemy {
        const typeConf = (CONFIG.ENEMY_TYPES as any)[typeKey];
        if (!typeConf) throw new Error(`Unknown enemy type: ${typeKey}`);

        const hp = CONFIG.ENEMY.BASE_HP * typeConf.hpMod * Math.pow(CONFIG.ENEMY.HP_GROWTH, wave - 1);

        const enemy = new Enemy({
            id: `e_${generateUUID()}`,
            health: hp,
            speed: typeConf.speed,
            path: path
        });
        
        // ВАЖНО: Устанавливаем тип для графики
        enemy.setType(typeConf.id); 
        
        (enemy as any).reward = typeConf.reward;
        
        return enemy;
    }

    public static createTower(col: number, row: number): Tower {
        return new Tower(col, row);
    }
}