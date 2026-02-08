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
        // Draw Both (Legacy/Default)
        TowerRenderer.drawSprite(ctx, tower);
        TowerRenderer.drawUI(ctx, tower);
    }

    static updateTower(dt: number, tower: Tower) {
        TowerRenderer.update(dt, tower);
    }

    static drawTowerSprite(ctx: CanvasRenderingContext2D, tower: Tower) {
        TowerRenderer.drawSprite(ctx, tower);
    }

    static drawTowerUI(ctx: CanvasRenderingContext2D, tower: Tower) {
        TowerRenderer.drawUI(ctx, tower);
    }

    static drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        // Draw Both (Legacy/Default)
        EnemyRenderer.drawSprite(ctx, enemy);
        EnemyRenderer.drawUI(ctx, enemy);
    }

    static drawEnemySprite(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        EnemyRenderer.drawSprite(ctx, enemy);
    }

    static drawEnemyUI(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        EnemyRenderer.drawUI(ctx, enemy);
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
