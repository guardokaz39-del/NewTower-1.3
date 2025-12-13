import { IGameScene } from './scenes/IGameScene';
import { ICard } from './CardSystem';

export class ForgeSystem {
    private scene: IGameScene;
    private slotEls: HTMLElement[];

    constructor(scene: IGameScene) {
        this.scene = scene;
        // Кэшируем DOM элементы слотов, чтобы проверять координаты
        this.slotEls = [document.getElementById('forge-slot-0')!, document.getElementById('forge-slot-1')!];
    }

    /**
     * Проверяет, отпустили ли мышь над слотом кузницы.
     * Если да - кладет карту в слот.
     */
    public tryDropCard(mouseX: number, mouseY: number, card: ICard): boolean {
        // Нельзя класть карты, пока идет процесс ковки
        if (this.scene.cardSys.isForging) return false;

        // Проверяем каждый слот
        for (let i = 0; i < this.slotEls.length; i++) {
            const rect = this.slotEls[i].getBoundingClientRect();

            // Простая проверка: курсор внутри прямоугольника слота?
            if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
                // Если слот занят - не кладем (или можно сделать замену, но пока проще)
                if (this.scene.cardSys.forgeSlots[i] !== null) {
                    return false;
                }

                // Успех: сообщаем карточной системе переместить карту
                this.scene.cardSys.putInForgeSlot(i, card);
                return true;
            }
        }
        return false;
    }

    public update() {
        // Здесь можно будет добавить визуальные эффекты (искры, дым)
    }
}
