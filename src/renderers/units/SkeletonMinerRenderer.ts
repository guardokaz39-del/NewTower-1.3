import { BaseSkeletonRenderer, SkeletonPose } from './BaseSkeletonRenderer';

export class SkeletonMinerRenderer extends BaseSkeletonRenderer {
    protected override boneMain = '#d4cba7'; // Грязновато-желтый цвет
    protected override boneShadow = '#3e2723'; // Темно-угольная обводка (решаем проблему контраста)
    protected override boneDark = '#a89070';
    protected override eyeGlow = '#66bb6a'; // Зеленоватое свечение глаз шахтера

    // Цвета элементов шахтера
    private static readonly HELMET_COLOR = '#fbc02d'; // Желтая каска
    private static readonly HELMET_SHINE = '#fff59d';
    private static readonly PICKAXE_WOOD = '#5d4037';
    private static readonly PICKAXE_METAL = '#9e9e9e';
    private static readonly BAG_COLOR = '#4e342e'; // Кожаный мешок
    private static readonly COAL_COLOR = '#212121';

    protected drawUnderlay(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        // Если идем вверх, мешок должен быть нарисован ПОД телом (на спине)? 
        // Нет, если идем вверх (мы видим спину), мешок поверх тела.
        // Если идем вниз (мы видим грудь), мешок за телом.
        if (pose.facing === 'DOWN') {
            this.drawBag(ctx, pose);
        }
    }

    protected drawBodyArmor(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        // Кожаный ремень через грудь/спину
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 3 * pose.scale;
        ctx.beginPath();
        // Ремень идет от правого плеча к левому бедру (примерно)
        // Но проще нарисовать фиксированную линию через центры
        const p1X = pose.anchors.head.x + 3 * pose.scale;
        const p1Y = pose.anchors.head.y + 10 * pose.scale;
        const p2X = pose.anchors.head.x - 3 * pose.scale;
        const p2Y = pose.anchors.head.y + 22 * pose.scale;
        ctx.moveTo(p1X, p1Y);
        ctx.lineTo(p2X, p2Y);
        ctx.stroke();

        // Мешок рисуется поверх тела, если мы смотрим на спину (UP) или сбоку (SIDE)
        if (pose.facing === 'UP' || pose.facing === 'SIDE') {
            this.drawBag(ctx, pose);
        }
    }

    private drawBag(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        const s = pose.scale;
        // Позиция мешка - за спиной, чуть выше таза
        const bx = pose.anchors.back.x + (pose.facing === 'SIDE' ? -8 * s : -5 * s);
        const by = pose.anchors.back.y - 4 * s;

        ctx.fillStyle = SkeletonMinerRenderer.BAG_COLOR;
        ctx.strokeStyle = '#261b18';
        ctx.lineWidth = 2 * s;

        // Мешок
        ctx.beginPath();
        ctx.ellipse(bx, by, 6 * s, 10 * s, pose.facing === 'SIDE' ? -0.2 : 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Куски угля торчат из мешка (если идем спиной)
        if (pose.facing === 'UP' || pose.facing === 'SIDE') {
            ctx.fillStyle = SkeletonMinerRenderer.COAL_COLOR;
            ctx.beginPath();
            ctx.arc(bx - 2 * s, by - 8 * s, 2 * s, 0, Math.PI * 2);
            ctx.arc(bx + 2 * s, by - 9 * s, 2.5 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    protected drawLeftWeapon(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        // Левая рука свободна
    }

    protected drawRightWeapon(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        // Кирка в правой руке
        const s = pose.scale;
        const anchor = pose.anchors.rightHand;

        ctx.save();
        ctx.translate(anchor.x, anchor.y);

        // Вращение кирки в зависимости от кадра и ракурса
        if (pose.facing === 'SIDE') {
            ctx.rotate(anchor.angle + Math.PI / 4);
        } else if (pose.facing === 'UP') {
            ctx.rotate(Math.PI / 6);
        } else {
            ctx.rotate(Math.PI / 8);
        }

        // Рукоять кирки
        ctx.fillStyle = SkeletonMinerRenderer.PICKAXE_WOOD;
        ctx.fillRect(-2 * s, -15 * s, 4 * s, 25 * s);

        // Тень на рукояти
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-2 * s, -15 * s, 1 * s, 25 * s);

        // Стальное лезвие кирки (изогнутое)
        ctx.fillStyle = SkeletonMinerRenderer.PICKAXE_METAL;
        ctx.beginPath();
        ctx.moveTo(-10 * s, -12 * s);
        ctx.quadraticCurveTo(0, -20 * s, 10 * s, -12 * s);
        ctx.lineTo(8 * s, -10 * s);
        ctx.quadraticCurveTo(0, -15 * s, -8 * s, -10 * s);
        ctx.closePath();
        ctx.fill();

        // Блик на лезвии
        ctx.fillStyle = '#cfd8dc';
        ctx.beginPath();
        ctx.moveTo(-8 * s, -12 * s);
        ctx.quadraticCurveTo(0, -18 * s, 8 * s, -12 * s);
        ctx.lineTo(6 * s, -11 * s);
        ctx.quadraticCurveTo(0, -14 * s, -6 * s, -11 * s);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    protected drawHeadDecoration(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        const s = pose.scale;
        const head = pose.anchors.head;

        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(head.angle);

        // [FIX] Рисуем череп ПОД каской (раньше он отсутствовал!)
        this.drawSkull(ctx, s, pose.facing);

        // Желтая каска (полусфера)
        ctx.fillStyle = SkeletonMinerRenderer.HELMET_COLOR;
        ctx.beginPath();
        if (pose.facing === 'SIDE') {
            ctx.arc(0, -2 * s, 6 * s, Math.PI, 0); // Side view helmet
        } else {
            ctx.arc(0, -3 * s, 6.5 * s, Math.PI, 0); // Front/Back view helmet
        }
        ctx.fill();

        // Ободок каски
        ctx.fillStyle = '#f57f17';
        ctx.fillRect(-7 * s, -2 * s, 14 * s, 2 * s);

        // Блик
        ctx.fillStyle = SkeletonMinerRenderer.HELMET_SHINE;
        ctx.beginPath();
        ctx.arc(-2 * s, -5 * s, 1.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Фонарь
        if (pose.facing === 'SIDE' || pose.facing === 'DOWN') {
            const lampX = pose.facing === 'SIDE' ? 6 * s : 0;
            const lampY = -4 * s;

            // Основа фонаря
            ctx.fillStyle = '#616161';
            ctx.fillRect(lampX - 2 * s, lampY - 2 * s, 4 * s, 4 * s);

            // Линза
            ctx.fillStyle = '#e0f7fa';
            if (pose.facing === 'SIDE') {
                ctx.fillRect(lampX, lampY - 1 * s, 2 * s, 2 * s);
            } else {
                ctx.fillRect(lampX - 1 * s, lampY - 1 * s, 2 * s, 2 * s);
            }

            // Свет от фонаря (Overlay, чтобы светило поверх всего)
            // Но мы рисуем его здесь для привязки к голове.
            // Для оптимизации рисуем радиальный градиент
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.5;
            const radGrab = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, 15 * s);
            radGrab.addColorStop(0, '#ffff8d');
            radGrab.addColorStop(1, 'rgba(255,255,141,0)');
            ctx.fillStyle = radGrab;
            ctx.beginPath();
            ctx.arc(lampX, lampY, 15 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    protected drawOverlay(ctx: CanvasRenderingContext2D, pose: SkeletonPose): void {
        // Добавим пятна угля на кости (поверх основной отрисовки)
        const s = pose.scale;
        const h = pose.anchors.head;

        ctx.fillStyle = 'rgba(33, 33, 33, 0.6)'; // Полупрозрачный уголь

        if (pose.facing === 'SIDE' || pose.facing === 'DOWN') {
            // Пятно на лице
            ctx.beginPath();
            ctx.arc(h.x + (pose.facing === 'SIDE' ? 2 * s : -2 * s), h.y + 1 * s, 1.5 * s, 0, Math.PI * 2);
            ctx.fill();

            // Пятна на ребрах
            ctx.beginPath();
            ctx.arc(pose.anchors.head.x - 2 * s, pose.anchors.head.y + 12 * s, 2 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
