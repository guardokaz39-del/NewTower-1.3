import { UnitRenderer } from './UnitRenderer';
import type { Enemy } from '../../Enemy';
import { Assets } from '../../Assets';

export class OrcUnitRenderer implements UnitRenderer {
    // Палитра: Темная, тяжелая, ржавая
    private static readonly ARMOR_DARK = '#212121'; // Основной металл
    private static readonly ARMOR_RUST = '#4e342e'; // Ржавчина/Кожа
    private static readonly SKIN_COLOR = '#33691e'; // Темно-зеленый (почти не виден)
    private static readonly METAL_LIGHT = '#757575'; // Клепки/Лезвия
    private static readonly ARMOR_MAIN = '#616161'; // Чуть светлее

    // BAKING SUPPORT
    drawFrame(ctx: CanvasRenderingContext2D, enemy: Enemy, t: number): void {
        const cycle = t * Math.PI * 2;
        const scale = 1.0;
        const isMoving = true;
        this.drawSide(ctx, scale, cycle, isMoving);
    }

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now();
        const walkCycle = (time * 0.0015) * (enemy.baseSpeed / 10);

        // 1. Try Cached Sprite
        const t = (walkCycle % (Math.PI * 2)) / (Math.PI * 2);
        const frameIdx = Math.floor(t * 32) % 32;
        const frameKey = `unit_${enemy.typeId}_walk_${frameIdx}`;

        const sprite = Assets.get(frameKey);
        if (sprite) {
            ctx.save();
            const size = 96 * scale;

            // Side-view flip logic (no rotation)
            const facingLeft = Math.cos(rotation) < 0;
            if (facingLeft) ctx.scale(-1, 1);

            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);

            // Hit Flash (Manual)
            if (enemy.hitFlashTimer > 0) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillRect(-size / 2, -size / 2, size, size);
            }

            ctx.restore();
            return;
        }

        // 2. Fallback
        const isMoving = !enemy.finished && enemy.currentHealth > 0;

        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';
        const r = rotation;
        // Стандартная логика углов
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();

        if (enemy.hitFlashTimer > 0) ctx.globalAlpha = 0.7;

        if (facing === 'SIDE') {
            if (Math.abs(rotation) > Math.PI / 2) ctx.scale(-1, 1);
            this.drawSide(ctx, scale, walkCycle, isMoving);
        } else if (facing === 'UP') {
            this.drawBack(ctx, scale, walkCycle, isMoving);
        } else {
            this.drawFront(ctx, scale, walkCycle, isMoving);
        }

        ctx.restore();
    }

    // === FRONT (Вид Спереди) ===
    private drawFront(ctx: CanvasRenderingContext2D, scale: number, cycle: number, isMoving: boolean) {
        // Тяжелый топот: вертикальный баунс + наклон
        const bounce = isMoving ? Math.abs(Math.sin(cycle)) * 1.5 * scale : 0;
        // Легкое покачивание влево-вправо
        const sway = isMoving ? Math.sin(cycle / 2) * 2 * scale : 0;

        ctx.translate(sway, -bounce);

        // 1. Ноги (Короткие столбы)
        // Добавляем подъем коленей
        const liftL = isMoving ? Math.max(0, Math.sin(cycle)) * 4 * scale : 0;
        const liftR = isMoving ? Math.max(0, Math.sin(cycle + Math.PI)) * 4 * scale : 0;

        this.drawLeg(ctx, -8 * scale, 8 * scale - liftL, scale);
        this.drawLeg(ctx, 8 * scale, 8 * scale - liftR, scale);

        // 2. Тело (Массивная плита)
        ctx.fillStyle = OrcUnitRenderer.ARMOR_DARK;
        // Рисуем "Бочку"
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-12 * scale, -10 * scale, 24 * scale, 18 * scale, 3 * scale);
        } else {
            ctx.rect(-12 * scale, -10 * scale, 24 * scale, 18 * scale);
        }
        ctx.fill();

        // Деталь: Ржавый нагрудник
        ctx.fillStyle = OrcUnitRenderer.ARMOR_RUST;
        ctx.fillRect(-8 * scale, -9 * scale, 16 * scale, 12 * scale);

        // Заклепки
        ctx.fillStyle = OrcUnitRenderer.METAL_LIGHT;
        ctx.beginPath();
        ctx.arc(-6 * scale, -7 * scale, 1 * scale, 0, Math.PI * 2);
        ctx.arc(6 * scale, -7 * scale, 1 * scale, 0, Math.PI * 2);
        ctx.arc(-6 * scale, 1 * scale, 1 * scale, 0, Math.PI * 2);
        ctx.arc(6 * scale, 1 * scale, 1 * scale, 0, Math.PI * 2);
        ctx.fill();

        // 3. Голова (Шлем-ведро, сидит низко, "втянут")
        ctx.translate(0, -9 * scale);
        this.drawHelmet(ctx, scale);
        ctx.translate(0, 9 * scale);

        // 4. Оружие и Щит (По бокам)
        // Щит (Слева от нас, держит в правой руке врага)
        ctx.translate(14 * scale, 2 * scale);
        this.drawShieldFront(ctx, scale); // Чуть ниже
        ctx.translate(-28 * scale, 0); // На другую руку
        this.drawMace(ctx, scale);
    }

    // === SIDE (Вид Сбоку) ===
    private drawSide(ctx: CanvasRenderingContext2D, scale: number, cycle: number, isMoving: boolean) {
        const bounce = isMoving ? Math.abs(Math.sin(cycle)) * 1.5 * scale : 0;
        ctx.translate(0, -bounce);

        // 1. Ноги (Шаг с широкой постановкой)
        // Сделаем более "вбивающий" шаг - короткий но мощный
        const step = isMoving ? Math.cos(cycle) * 6 * scale : 0;
        const liftFar = isMoving && step > 0 ? Math.sin(cycle) * 3 * scale : 0;
        const liftNear = isMoving && step < 0 ? -Math.sin(cycle) * 3 * scale : 0;

        this.drawLeg(ctx, step, 8 * scale - liftFar, scale);       // Дальняя
        this.drawLeg(ctx, -step, 8 * scale - liftNear, scale);      // Ближняя

        // 2. Тело (Коробка, а не овал)
        // Тело в профиль тоже широкое из-за брони
        ctx.fillStyle = OrcUnitRenderer.ARMOR_DARK;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-8 * scale, -9 * scale, 16 * scale, 16 * scale, 4 * scale);
        } else {
            ctx.rect(-8 * scale, -9 * scale, 16 * scale, 16 * scale);
        }
        ctx.fill();

        // Горб/Пластины сзади
        ctx.fillStyle = OrcUnitRenderer.ARMOR_RUST;
        ctx.fillRect(-9 * scale, -6 * scale, 4 * scale, 10 * scale);

        // 3. Голова (Сдвинута вперед)
        ctx.translate(4 * scale, -8 * scale); // Чуть выше и вперед
        this.drawHelmet(ctx, scale);
        ctx.translate(-4 * scale, 8 * scale);

        // 4. ЩИТ (TOWER SHIELD)
        // Закрывает переднюю часть
        ctx.translate(9 * scale, 2 * scale); // Сдвинут вперед сильнее
        this.drawShieldSide(ctx, scale);

        // Рука/Плечо держащее щит
        ctx.fillStyle = OrcUnitRenderer.ARMOR_MAIN;
        ctx.beginPath();
        ctx.arc(0, -6 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    // === BACK (Вид Сзади) ===
    private drawBack(ctx: CanvasRenderingContext2D, scale: number, cycle: number, isMoving: boolean) {
        const bounce = isMoving ? Math.abs(Math.sin(cycle)) * 1.5 * scale : 0;
        const sway = isMoving ? Math.sin(cycle / 2) * 2 * scale : 0;
        ctx.translate(sway, -bounce);

        const liftL = isMoving ? Math.max(0, Math.sin(cycle)) * 4 * scale : 0;
        const liftR = isMoving ? Math.max(0, Math.sin(cycle + Math.PI)) * 4 * scale : 0;

        this.drawLeg(ctx, -8 * scale, 8 * scale - liftL, scale);
        this.drawLeg(ctx, 8 * scale, 8 * scale - liftR, scale);

        // Спина (Сплошная плита)
        ctx.fillStyle = OrcUnitRenderer.ARMOR_DARK;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-12 * scale, -10 * scale, 24 * scale, 18 * scale, 3 * scale);
        } else {
            ctx.rect(-12 * scale, -10 * scale, 24 * scale, 18 * scale);
        }
        ctx.fill();

        // "Позвоночник" брони
        ctx.fillStyle = OrcUnitRenderer.ARMOR_RUST;
        ctx.fillRect(-3 * scale, -10 * scale, 6 * scale, 18 * scale);

        // Голова (Затылок шлема)
        ctx.translate(0, -9 * scale);
        ctx.fillStyle = OrcUnitRenderer.ARMOR_MAIN;
        ctx.beginPath();
        ctx.arc(0, 0, 6 * scale, Math.PI, 0); // Чуть шире
        ctx.fill();
        ctx.translate(0, 9 * scale);

        // Щит (Виден с торца сбоку)
        ctx.fillStyle = OrcUnitRenderer.ARMOR_RUST;
        ctx.fillRect(14 * scale, -5 * scale, 3 * scale, 15 * scale); // Торец щита

        // Дубина (Видна с другого боку)
        ctx.translate(-14 * scale, 0);
        this.drawMace(ctx, scale);
    }

    // --- КОМПОНЕНТЫ ---

    private drawHelmet(ctx: CanvasRenderingContext2D, scale: number) {
        // Шлем-Ведро (Bucket Helm) - еще более квадратный
        ctx.fillStyle = OrcUnitRenderer.ARMOR_MAIN; // Серый металл
        ctx.beginPath();
        // Основа
        if (ctx.roundRect) {
            ctx.roundRect(-6 * scale, -7 * scale, 12 * scale, 11 * scale, 2 * scale);
        } else {
            ctx.rect(-6 * scale, -7 * scale, 12 * scale, 11 * scale);
        }
        ctx.fill();

        // Усиление (крест или полоса)
        ctx.fillStyle = '#424242';
        ctx.fillRect(-6 * scale, -3 * scale, 12 * scale, 2 * scale); // Гориз
        ctx.fillRect(-1 * scale, -7 * scale, 2 * scale, 11 * scale); // Верт

        // Смотровая щель (узкая, злая)
        ctx.fillStyle = '#000';
        ctx.fillRect(-5 * scale, -3 * scale, 10 * scale, 1.5 * scale);

        // Рога/Шипы (чуть меньше, чтобы не ломать силуэт ведра)
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.moveTo(-5 * scale, -7 * scale); ctx.lineTo(-7 * scale, -10 * scale); ctx.lineTo(-3 * scale, -7 * scale);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5 * scale, -7 * scale); ctx.lineTo(7 * scale, -10 * scale); ctx.lineTo(3 * scale, -7 * scale);
        ctx.fill();
    }

    private drawLeg(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
        ctx.translate(x, y);
        // Тяжелый латный сапог - шире
        ctx.fillStyle = OrcUnitRenderer.ARMOR_RUST;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-4 * scale, -5 * scale, 8 * scale, 10 * scale, 2 * scale);
        } else {
            ctx.rect(-4 * scale, -5 * scale, 8 * scale, 10 * scale);
        }
        ctx.fill();
        // Металлический носок
        ctx.fillStyle = OrcUnitRenderer.ARMOR_MAIN;
        ctx.fillRect(-4 * scale, 2 * scale, 8 * scale, 3 * scale);
        ctx.translate(-x, -y);
    }

    private drawShieldFront(ctx: CanvasRenderingContext2D, scale: number) {
        // Огромная прямоугольная дверь
        ctx.fillStyle = '#3e2723'; // Дерево сзади
        ctx.fillRect(-2 * scale, -8 * scale, 4 * scale, 18 * scale);

        ctx.fillStyle = OrcUnitRenderer.ARMOR_RUST;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-7 * scale, -11 * scale, 14 * scale, 22 * scale, 2 * scale);
        } else {
            ctx.rect(-7 * scale, -11 * scale, 14 * scale, 22 * scale);
        }
        ctx.fill();

        // Узор
        ctx.strokeStyle = OrcUnitRenderer.METAL_LIGHT;
        ctx.lineWidth = 3 * scale;
        ctx.strokeRect(-6 * scale, -10 * scale, 12 * scale, 20 * scale);

        // Умбон (центр)
        ctx.fillStyle = OrcUnitRenderer.METAL_LIGHT;
        ctx.beginPath();
        ctx.arc(0, 0, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawShieldSide(ctx: CanvasRenderingContext2D, scale: number) {
        // Вид щита сбоку - Массивный
        ctx.fillStyle = OrcUnitRenderer.ARMOR_RUST;
        ctx.beginPath();
        // Более прямой, тяжелый
        ctx.moveTo(0, -13 * scale);
        ctx.lineTo(2 * scale, 0);
        ctx.lineTo(0, 13 * scale);
        ctx.lineTo(-5 * scale, 13 * scale); // Толщина
        ctx.lineTo(-3 * scale, 0); // Внутр изгиб
        ctx.lineTo(-5 * scale, -13 * scale);
        ctx.fill();

        // Шипы торчат вперед
        ctx.fillStyle = OrcUnitRenderer.METAL_LIGHT;
        ctx.beginPath(); ctx.moveTo(2 * scale, -6 * scale); ctx.lineTo(5 * scale, -6 * scale); ctx.lineTo(2 * scale, -4 * scale); ctx.fill();
        ctx.beginPath(); ctx.moveTo(2 * scale, 6 * scale); ctx.lineTo(5 * scale, 6 * scale); ctx.lineTo(2 * scale, 8 * scale); ctx.fill();
    }

    private drawMace(ctx: CanvasRenderingContext2D, scale: number) {
        // Рукоять
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-1.5 * scale, -6 * scale, 3 * scale, 16 * scale);

        // Голова
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(0, -8 * scale, 4.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Шипы во все стороны
        ctx.fillStyle = '#bdbdbd';
        const spikes = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        spikes.forEach(angle => {
            const sx = Math.cos(angle);
            const sy = Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(sx * 4 * scale, -8 * scale + sy * 4 * scale);
            ctx.lineTo(sx * 8 * scale, -8 * scale + sy * 8 * scale);
            ctx.lineTo(sx * 4 * scale + sy * 2 * scale, -8 * scale + sy * 4 * scale - sx * 2 * scale);
            ctx.fill();
        });
    }
}
