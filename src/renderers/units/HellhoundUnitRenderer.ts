import { UnitRenderer } from './UnitRenderer';
import type { Enemy } from '../../Enemy';

export class HellhoundUnitRenderer implements UnitRenderer {
    // 🔥 Палитра Ада
    private static readonly FUR_COLOR = '#212121'; // Почти черный
    private static readonly SKIN_DARK = '#1a1a1a';
    private static readonly MAGMA_COLOR = '#ff5722'; // Глаза/Рот
    private static readonly CLAW_COLOR = '#757575';

    drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.008; // Быстрее, чем скелет!
        const runCycle = time * (enemy.baseSpeed * 2.5);
        const isMoving = !enemy.finished && enemy.currentHealth > 0;

        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';
        const r = rotation;
        // Те же углы, что у скелета
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();

        // Hit Flash Effect
        if (enemy.hitFlashTimer > 0) {
            ctx.filter = 'brightness(1000%) sepia(100%) hue-rotate(90deg)'; // Flash White/Bright
        }

        if (facing === 'SIDE') {
            if (Math.abs(rotation) > Math.PI / 2) ctx.scale(-1, 1);
            this.drawSide(ctx, scale, runCycle, isMoving);
        } else if (facing === 'UP') {
            this.drawBack(ctx, scale, runCycle, isMoving);
        } else {
            this.drawFront(ctx, scale, runCycle, isMoving);
        }

        ctx.restore();
    }

    // === SIDE (ПРОФИЛЬ - Самый сложный) ===
    private drawSide(ctx: CanvasRenderingContext2D, scale: number, cycle: number, isMoving: boolean) {
        // Агрессивный наклон вперед
        ctx.rotate(0.1);

        const bounce = isMoving ? Math.abs(Math.sin(cycle * 2)) * 3 * scale : 0;
        ctx.translate(0, -bounce);

        // Head Bounce Stabilization (Head moves less than body)
        const headBounceOffset = bounce * 0.7; // 70% of bounce is negated for head


        // Ноги (Синус смещен для рыси)
        // Far Legs (Задний план)
        this.drawLeg(ctx, 6 * scale, 5 * scale, cycle, Math.PI, scale); // Задняя дальняя
        this.drawLeg(ctx, -6 * scale, 5 * scale, cycle, 0, scale);      // Передняя дальняя

        // Тело (Горизонтальный овал)
        ctx.fillStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.beginPath();
        // Грудь шире, таз уже
        ctx.ellipse(0, 0, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Near Legs (Передний план)
        this.drawLeg(ctx, 6 * scale, 7 * scale, cycle, 0, scale);       // Задняя ближняя
        this.drawLeg(ctx, -6 * scale, 7 * scale, cycle, Math.PI, scale); // Передняя ближняя

        // Голова и Шея
        ctx.save();
        ctx.translate(-8 * scale, -2 * scale + headBounceOffset); // Сдвиг к шее + Стабилизация
        // Шея
        ctx.beginPath();
        ctx.moveTo(2 * scale, 2 * scale);
        ctx.lineTo(-2 * scale, -2 * scale);
        ctx.lineWidth = 4 * scale;
        ctx.strokeStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.stroke();

        // Голова
        ctx.translate(-2 * scale, -2 * scale);
        this.drawHeadProfile(ctx, scale);
        ctx.restore();

        // Хвост
        this.drawTail(ctx, 10 * scale, -2 * scale, cycle, scale);
    }

    // === FRONT (ФАС - Бежит на нас) ===
    private drawFront(ctx: CanvasRenderingContext2D, scale: number, cycle: number, isMoving: boolean) {
        const bounce = isMoving ? Math.abs(Math.sin(cycle * 2)) * 3 * scale : 0;
        ctx.translate(0, -bounce);

        // Задние ноги (едва видны по бокам)
        this.drawLeg(ctx, -5 * scale, 4 * scale, cycle, Math.PI, scale);
        this.drawLeg(ctx, 5 * scale, 4 * scale, cycle, 0, scale);

        // Тело (Сжатый круг, вид спереди)
        ctx.fillStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.beginPath();
        ctx.arc(0, 0, 6 * scale, 0, Math.PI * 2); // Грудь
        ctx.fill();

        // Передние ноги (Ярко выражены)
        this.drawLeg(ctx, -3 * scale, 8 * scale, cycle, 0, scale);
        this.drawLeg(ctx, 3 * scale, 8 * scale, cycle, Math.PI, scale);

        // Голова (По центру, ниже плеч)
        ctx.translate(0, 1 * scale);
        this.drawHeadFront(ctx, scale);
    }

    // === BACK (СО СПИНЫ) ===
    private drawBack(ctx: CanvasRenderingContext2D, scale: number, cycle: number, isMoving: boolean) {
        const bounce = isMoving ? Math.abs(Math.sin(cycle * 2)) * 3 * scale : 0;
        ctx.translate(0, -bounce);

        // Передние ноги (едва видны)
        this.drawLeg(ctx, -5 * scale, 4 * scale, cycle, 0, scale);
        this.drawLeg(ctx, 5 * scale, 4 * scale, cycle, Math.PI, scale);

        // Тело (Круп)
        ctx.fillStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.beginPath();
        ctx.arc(0, 0, 5.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Задние ноги
        this.drawLeg(ctx, -3 * scale, 8 * scale, cycle, Math.PI, scale);
        this.drawLeg(ctx, 3 * scale, 8 * scale, cycle, 0, scale);

        // Хвост (По центру)
        this.drawTail(ctx, 0, -2 * scale, cycle, scale);

        // Голова (Видны только уши за спиной)
        ctx.fillStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.beginPath();
        ctx.moveTo(-3 * scale, -4 * scale);
        ctx.lineTo(-4 * scale, -8 * scale); // Левое ухо
        ctx.lineTo(-1 * scale, -5 * scale);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3 * scale, -4 * scale);
        ctx.lineTo(4 * scale, -8 * scale); // Правое ухо
        ctx.lineTo(1 * scale, -5 * scale);
        ctx.fill();
    }

    // --- ДЕТАЛИ ---

    private drawLeg(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, phaseOffset: number, scale: number) {
        const sway = Math.sin(cycle + phaseOffset) * 6 * scale;

        ctx.save();
        ctx.translate(x + sway * 0.5, y); // Двигаем бедро

        // Лапа
        ctx.fillStyle = HellhoundUnitRenderer.SKIN_DARK;
        ctx.beginPath();
        // Упрощенная форма лапы
        ctx.ellipse(0, sway * 0.3, 2 * scale, 6 * scale, sway * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Коготь
        ctx.fillStyle = HellhoundUnitRenderer.CLAW_COLOR;
        ctx.beginPath();
        ctx.arc(0, 4 * scale + sway * 0.3, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private drawHeadProfile(ctx: CanvasRenderingContext2D, scale: number) {
        // Череп
        ctx.fillStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 * scale, 3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Пасть (Длинная)
        ctx.fillStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.fillRect(-5 * scale, 0, 5 * scale, 2 * scale); // Челюсть

        // Глаз (Злой)
        ctx.fillStyle = HellhoundUnitRenderer.MAGMA_COLOR;
        ctx.beginPath();
        ctx.arc(-1 * scale, -1 * scale, 1.2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Ухо
        ctx.fillStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.beginPath();
        ctx.moveTo(1 * scale, -2 * scale);
        ctx.lineTo(3 * scale, -5 * scale); // Острое назад
        ctx.lineTo(3 * scale, -1 * scale);
        ctx.fill();
    }

    private drawHeadFront(ctx: CanvasRenderingContext2D, scale: number) {
        // Форма головы
        ctx.fillStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.beginPath();
        ctx.moveTo(-3 * scale, -2 * scale);
        ctx.lineTo(3 * scale, -2 * scale);
        ctx.lineTo(1.5 * scale, 3 * scale); // Морда сужается
        ctx.lineTo(-1.5 * scale, 3 * scale);
        ctx.fill();

        // Глаза
        ctx.fillStyle = HellhoundUnitRenderer.MAGMA_COLOR;
        ctx.beginPath(); ctx.arc(-1.5 * scale, 0, 1 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(1.5 * scale, 0, 1 * scale, 0, Math.PI * 2); ctx.fill();

        // Уши
        ctx.fillStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.beginPath(); ctx.moveTo(-3 * scale, -2 * scale); ctx.lineTo(-4 * scale, -5 * scale); ctx.lineTo(-2 * scale, -2 * scale); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3 * scale, -2 * scale); ctx.lineTo(4 * scale, -5 * scale); ctx.lineTo(2 * scale, -2 * scale); ctx.fill();
    }

    private drawTail(ctx: CanvasRenderingContext2D, x: number, y: number, cycle: number, scale: number) {
        const sway = Math.sin(cycle * 2) * 0.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(sway - 0.5); // Хвост чуть опущен и виляет

        ctx.fillStyle = HellhoundUnitRenderer.FUR_COLOR;
        ctx.beginPath();
        ctx.moveTo(0, -1 * scale);
        ctx.lineTo(8 * scale, 0); // Длинный хвост
        ctx.lineTo(0, 1 * scale);
        ctx.fill();
        ctx.restore();
    }
    drawEmissive(ctx: CanvasRenderingContext2D, enemy: Enemy, scale: number, rotation: number): void {
        const time = Date.now() * 0.008;
        const runCycle = time * (enemy.baseSpeed * 2.5);
        const isMoving = !enemy.finished && enemy.currentHealth > 0;

        // No bounce/rotation needed for calculation if we translate cleanly? 
        // We MUST repeat the transforms to land in the exact spot.
        // Or we can be lazy and just draw glowy circle at estimated head position?
        // No, let's just repeat the relevant transforms.

        let facing: 'DOWN' | 'UP' | 'SIDE' = 'SIDE';
        const r = rotation;
        if (r > -2.35 && r < -0.78) facing = 'UP';
        else if (r > 0.78 && r < 2.35) facing = 'DOWN';
        else facing = 'SIDE';

        ctx.save();

        if (facing === 'SIDE') {
            if (Math.abs(rotation) > Math.PI / 2) ctx.scale(-1, 1);

            ctx.rotate(0.1);
            const bounce = isMoving ? Math.abs(Math.sin(runCycle * 2)) * 3 * scale : 0;
            const headBounceOffset = bounce * 0.7;

            ctx.translate(0, -bounce);
            // Translate to Neck
            ctx.translate(-8 * scale, -2 * scale + headBounceOffset);
            // Translate to Head
            ctx.translate(-2 * scale, -2 * scale);

            // Eye
            ctx.fillStyle = HellhoundUnitRenderer.MAGMA_COLOR;
            ctx.beginPath();
            ctx.arc(-1 * scale, -1 * scale, 1.2 * scale, 0, Math.PI * 2);
            ctx.fill();

        } else if (facing === 'DOWN') { // 'DOWN'
            const bounce = isMoving ? Math.abs(Math.sin(runCycle * 2)) * 3 * scale : 0;
            ctx.translate(0, -bounce);
            ctx.translate(0, 1 * scale);

            // Eyes
            ctx.fillStyle = HellhoundUnitRenderer.MAGMA_COLOR;
            ctx.beginPath(); ctx.arc(-1.5 * scale, 0, 1 * scale, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(1.5 * scale, 0, 1 * scale, 0, Math.PI * 2); ctx.fill();

        }
        // Back view has no eyes visible

        ctx.restore();
    }
}
