import { IMapData, DEMO_MAP } from '../MapData';
import { MapStorage } from '../MapStorage';
import { EventBus, Events } from '../EventBus';
import { MapPreviewRenderer } from '../utils/MapPreviewRenderer';

/**
 * Изолированный UI класс для выбора карты.
 * Выполняет строгий контроль Lifecycle (init/destroy) и Null-Safety.
 * Не содержит игровой логики, только proxy к DOM и отправку событий.
 */
export class MapSelectionUI {
    private container: HTMLElement;
    private listContainer: HTMLElement;
    private previewCanvas: HTMLCanvasElement;
    private titleEl: HTMLElement;
    private descEl: HTMLElement;
    private playBtn: HTMLButtonElement;
    private backBtn: HTMLButtonElement;

    // Массив сборщика мусора для тотальной отписки
    private disposables: (() => void)[] = [];
    private activeMapData: IMapData | null = null;
    private onBackCallback: () => void;
    private isInitialized: boolean = false;

    constructor(onBack: () => void) {
        this.onBackCallback = onBack;

        // Validation: Fail-Fast Null-Safety Check
        const container = document.getElementById('map-selection-ui');
        if (!container) {
            throw new Error('[MapSelectionUI] Root container #map-selection-ui not found. Missing from HTML?');
        }

        this.container = container;
        this.listContainer = document.getElementById('map-list') as HTMLElement;
        this.previewCanvas = document.getElementById('map-preview-canvas') as HTMLCanvasElement;
        this.titleEl = document.getElementById('map-title') as HTMLElement;
        this.descEl = document.getElementById('map-description') as HTMLElement;
        this.playBtn = document.getElementById('map-play-btn') as HTMLButtonElement;
        this.backBtn = document.getElementById('map-back-btn') as HTMLButtonElement;

        if (!this.listContainer || !this.previewCanvas || !this.titleEl || !this.descEl || !this.playBtn || !this.backBtn) {
            throw new Error('[MapSelectionUI] Required internal DOM elements are missing. Check index.html map-selection-ui structure.');
        }
    }

    public init(): void {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // Привязываем события и гарантированно кладем функцию очистки в корзину
        const onPlayClick = () => {
            if (this.activeMapData) {
                EventBus.getInstance().emit(Events.UI_MAP_PLAY_REQUESTED, this.activeMapData);
            }
        };
        this.playBtn.addEventListener('click', onPlayClick);
        this.disposables.push(() => this.playBtn.removeEventListener('click', onPlayClick));

        const onBackClick = () => {
            this.onBackCallback();
        };
        this.backBtn.addEventListener('click', onBackClick);
        this.disposables.push(() => this.backBtn.removeEventListener('click', onBackClick));

        // Размер canvas вычисляется динамически при отрисовке превью в selectMap()

        // Заполняем список
        this.refreshList();
    }

    public destroy(): void {
        this.hide(); // Убираем UI контейнер, чтобы он не перекрывал GameScene
        // Очищаем слушатели и освобождаем память. Никаких querySelector по стилям!
        this.disposables.forEach(d => d());
        this.disposables = [];
        this.listContainer.innerHTML = '';
        this.activeMapData = null;
        this.previewCanvas.getContext('2d')?.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        this.isInitialized = false;
    }

    public show(): void {
        this.container.style.display = 'flex';
        // Автоматически выбрать первую карту если ничего не выбрано (UX)
        if (!this.activeMapData) {
            const firstItem = this.listContainer.querySelector('.map-list-item') as HTMLElement | null;
            if (firstItem) firstItem.click();
        }
    }

    public hide(): void {
        this.container.style.display = 'none';
    }

    private refreshList(): void {
        this.listContainer.innerHTML = '';

        // Демо мапа (скрыта — не нужна, но DEMO_MAP остаётся как fallback в MapData.ts)
        // this.createListElement('Demo Map', DEMO_MAP, '🌟');

        // Локальные мапы (синхронно)
        const local = MapStorage.getLocalMaps();
        const localNames = new Set(Object.keys(local));
        for (const key of localNames) {
            this.createListElement(key, local[key], '💾');
        }

        // Встроенные мапы (асинхронно)
        MapStorage.getBundledMaps().then(bundled => {
            for (const name of Object.keys(bundled).sort()) {
                if (localNames.has(name)) continue;
                this.createListElement(name, bundled[name], '📦');
            }
        }).catch(e => {
            console.warn('[MapSelectionUI] Failed to load bundled maps', e);
        });
    }

    private createListElement(name: string, data: IMapData, icon: string): void {
        const item = document.createElement('div');
        item.className = 'map-list-item';
        item.dataset.mapName = name;
        item.innerHTML = `<span>${icon}</span> <span style="margin-left: 10px;">${name}</span>`;

        // Используем onclick свойства. При destroy мы удаляем элементы через innerHTML = '', сборщик мусора очистит слушатели.
        item.onclick = () => {
            this.selectMap(name, data);

            const allItems = this.listContainer.querySelectorAll('.map-list-item');
            allItems.forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
        };

        this.listContainer.appendChild(item);
    }

    private selectMap(name: string, data: IMapData): void {
        this.activeMapData = data;

        // Обновление текстовых данных
        this.titleEl.innerText = name;
        this.descEl.innerText = `Размер: ${data.width}x${data.height}\nВолн: ${(data.waves || []).length}\nОбъектов: ${(data.objects || []).length}`;

        // Рендеринг превью из StateLess Renderer
        const parent = this.previewCanvas.parentElement;
        if (parent) {
            const rect = parent.getBoundingClientRect();
            // Защита от нулевых размеров, если контейнер еще display: none
            const cssWidth = Math.max(rect.width, 100);
            const cssHeight = Math.max(rect.height, 100);
            const dpr = window.devicePixelRatio || 1;

            this.previewCanvas.width = cssWidth * dpr;
            this.previewCanvas.height = cssHeight * dpr;
            this.previewCanvas.style.width = `${cssWidth}px`;
            this.previewCanvas.style.height = `${cssHeight}px`;
        }

        const ctx = this.previewCanvas.getContext('2d');
        if (ctx) {
            MapPreviewRenderer.drawToCanvas(ctx, data, this.previewCanvas.width, this.previewCanvas.height, window.devicePixelRatio || 1);
        }

        EventBus.getInstance().emit(Events.UI_MAP_SELECTED, data);
        this.playBtn.disabled = false;
    }
}
