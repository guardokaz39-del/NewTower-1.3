import { CONFIG } from './Config';
import { Tower } from './Tower';
import { Enemy } from './Enemy';
import { MapManager } from './Map';
import { Projectile } from './Projectile';
import { TowerRenderer } from './renderers/TowerRenderer';
import { EnemyRenderer } from './renderers/EnemyRenderer';
import { SpriteProjectileRenderer } from './renderers/SpriteProjectileRenderer';
import { InkMapRenderer } from './renderers/InkMapRenderer';
import { InkProjectileRenderer } from './renderers/InkProjectileRenderer';
import { InkTowerRenderer } from './renderers/InkTowerRenderer';
import { InkEnemyRenderer } from './renderers/InkEnemyRenderer';
import { InkEffectRenderer } from './renderers/InkEffectRenderer';
import { IEffect } from './EffectSystem';
// SpriteEffectRenderer is currently inline in EffectSystem.ts, we will handle that there.

export class RendererFactory {
    static drawTower(ctx: CanvasRenderingContext2D, tower: Tower) {
        if (CONFIG.VISUAL_STYLE === 'INK') {
            InkTowerRenderer.draw(ctx, tower);
        } else {
            // Default SPRITE style
            TowerRenderer.draw(ctx, tower);
        }
    }

    static drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
        if (CONFIG.VISUAL_STYLE === 'INK') {
            InkEnemyRenderer.draw(ctx, enemy);
        } else {
            // Default SPRITE style
            EnemyRenderer.draw(ctx, enemy);
        }
    }

    static drawMap(ctx: CanvasRenderingContext2D, map: MapManager) {
        if (CONFIG.VISUAL_STYLE === 'INK') {
            InkMapRenderer.draw(ctx, map);
        } else {
            map.draw(ctx);
        }
    }

    static drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile) {
        if (CONFIG.VISUAL_STYLE === 'INK') {
            InkProjectileRenderer.draw(ctx, projectile);
        } else {
            SpriteProjectileRenderer.draw(ctx, projectile);
        }
    }

    static drawEffect(ctx: CanvasRenderingContext2D, effect: IEffect) {
        if (CONFIG.VISUAL_STYLE === 'INK') {
            InkEffectRenderer.draw(ctx, effect);
            return true; // Return true to signal we handled it
        }
        return false; // Return false to fallback to default logic in EffectSystem
    }
}
