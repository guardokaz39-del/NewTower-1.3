export interface Scene {
    // Вызывается при переключении на эту сцену
    onEnter(): void;

    // Вызывается при уходе со сцены
    onExit(): void;

    // Обновление логики (60 раз в сек)
    update(dt: number): void;

    // Отрисовка
    draw(ctx: CanvasRenderingContext2D): void;
}
