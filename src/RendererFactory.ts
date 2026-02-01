import { Tower } from './Tower';
import { Enemy } from './Enemy';
import { MapManager } from './Map';
import { Projectile } from './Projectile';
import { TowerRenderer } from './renderers/TowerRenderer';
import { EnemyRenderer } from './renderers/EnemyRenderer';
import { SpriteProjectileRenderer } from './renderers/SpriteProjectileRenderer';
import { IEffect } from './EffectSystem';
// SpriteEffectRenderer is currently inline in EffectSystem.ts, we will handle that there.

export class RendererFactory {
    static drawTower(ctx: CanvasRenderingContext2D, tower: Tower) {
        // Default SPRITE style
        TowerRenderer.draw(ctx, tower);
    }

    static drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        // Default SPRITE style
        EnemyRenderer.draw(ctx, enemy);
    }

    static drawMap(ctx: CanvasRenderingContext2D, map: MapManager) {
        map.draw(ctx);
    }

    static drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile) {
        SpriteProjectileRenderer.draw(ctx, projectile);
    }

    static drawEffect(ctx: CanvasRenderingContext2D, effect: IEffect) {
        return false; // Return false to fallback to default logic in EffectSystem
    }
}
