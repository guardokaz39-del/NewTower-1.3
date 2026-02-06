import { UIUtils } from '../UIUtils';
import { VISUALS } from '../VisualConfig';

export type EditorMode =
    | 'paint_road'
    | 'paint_grass'
    | 'set_start'
    | 'set_end'
    | 'place_waypoint'
    | 'eraser'
    | 'paint_fog'
    | 'place_stone'
    | 'place_rock'
    | 'place_tree'
    | 'place_wheat'
    | 'place_flowers';

interface ITool {
    id: EditorMode;
    label: string;
    icon: string;
    color: string;
    hotkey?: string;
}

interface IToolCategory {
    id: string;
    name: string;
    icon: string;
    tools: ITool[];
}

export class EditorToolbar {
    private container: HTMLElement;
    private categoriesContainer: HTMLElement;
    private toolsContainer: HTMLElement;

    private categories: IToolCategory[] = [];
    private selectedCategory: number = 0;
    private onModeChange: (mode: EditorMode) => void;

    constructor(onModeChange: (mode: EditorMode) => void) {
        this.onModeChange = onModeChange;

        // Define categories
        this.categories = [
            {
                id: 'environment',
                name: 'Окружение',
                icon: '🌲',
                tools: [
                    { id: 'paint_grass', label: 'Трава', icon: '🌲', color: '#388e3c' },
                    { id: 'paint_road', label: 'Дорога', icon: '🟫', color: '#795548' },
                    { id: 'paint_fog', label: 'Туман', icon: '🌫️', color: '#607d8b' },
                ]
            },
            {
                id: 'path',
                name: 'Путь',
                icon: '🚩',
                tools: [
                    { id: 'set_start', label: 'Старт', icon: '🏁', color: '#00bcd4' },
                    { id: 'set_end', label: 'Финиш', icon: '🛑', color: '#e91e63' },
                    { id: 'place_waypoint', label: 'Точка', icon: '📍', color: '#9c27b0' },
                ]
            },
            {
                id: 'objects',
                name: 'Объекты',
                icon: '🪨',
                tools: [
                    { id: 'place_stone', label: 'Камни', icon: '🪨', color: '#757575' },
                    { id: 'place_rock', label: 'Скалы', icon: '⛰️', color: '#616161' },
                    { id: 'place_tree', label: 'Лес', icon: '🌲', color: '#2e7d32' },
                    { id: 'place_wheat', label: 'Пшеница', icon: '🌾', color: '#f9a825' },
                    { id: 'place_flowers', label: 'Цветы', icon: '🌸', color: '#c2185b' },
                ]
            },
            {
                id: 'erase',
                name: 'Стереть',
                icon: '🧹',
                tools: [
                    { id: 'eraser', label: 'Ластик', icon: '🧹', color: '#ff6600', hotkey: 'E' },
                ]
            }
        ];

        this.container = this.createContainer();
        this.categoriesContainer = this.createCategoriesView();
        this.toolsContainer = this.createToolsView();

        this.container.appendChild(this.categoriesContainer);
        this.container.appendChild(this.toolsContainer);

        document.body.appendChild(this.container);

        this.selectCategory(0);
    }

    private createContainer(): HTMLElement {
        return UIUtils.createContainer({
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: `${VISUALS.UI.SPACING.sm}px`,
            padding: `${VISUALS.UI.SPACING.md}px`,
            background: VISUALS.UI.COLORS.glass.bgDark,
            borderRadius: VISUALS.UI.BORDERS.radius.lg,
            zIndex: '1000'
        });
    }

    private createCategoriesView(): HTMLElement {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            gap: `${VISUALS.UI.SPACING.xs}px`,
            borderBottom: `${VISUALS.UI.BORDERS.width.normal} solid #444`,
            paddingBottom: `${VISUALS.UI.SPACING.sm}px`
        });

        this.categories.forEach((cat, idx) => {
            const btn = document.createElement('button');
            btn.textContent = `${cat.icon} ${cat.name}`;
            btn.dataset.categoryIndex = idx.toString();

            Object.assign(btn.style, {
                background: VISUALS.UI.COLORS.neutral.medium,
                color: VISUALS.UI.COLORS.text.primary,
                border: `${VISUALS.UI.BORDERS.width.normal} solid ${VISUALS.UI.COLORS.neutral.light}`,
                padding: `${VISUALS.UI.SPACING.sm}px ${VISUALS.UI.SPACING.lg}px`,
                borderRadius: VISUALS.UI.BORDERS.radius.md,
                cursor: 'pointer',
                fontSize: VISUALS.UI.FONTS.size.md,
                fontWeight: VISUALS.UI.FONTS.weight.bold,
                transition: VISUALS.UI.TRANSITIONS.presets.fast
            });

            btn.onclick = () => this.selectCategory(idx);
            container.appendChild(btn);
        });

        return container;
    }

    private createToolsView(): HTMLElement {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
        });

        return container;
    }

    public selectCategory(index: number): void {
        if (index < 0 || index >= this.categories.length) return;

        this.selectedCategory = index;

        // Update category button states
        const categoryBtns = this.categoriesContainer.querySelectorAll('button');
        categoryBtns.forEach((btn, idx) => {
            if (idx === index) {
                Object.assign((btn as HTMLElement).style, {
                    background: VISUALS.UI.COLORS.info,
                    borderColor: '#2196f3',
                    transform: 'translateY(-2px)'
                });
            } else {
                Object.assign((btn as HTMLElement).style, {
                    background: VISUALS.UI.COLORS.neutral.medium,
                    borderColor: VISUALS.UI.COLORS.neutral.light,
                    transform: 'translateY(0)'
                });
            }
        });

        // Update tools display
        this.renderTools();
    }

    private renderTools(): void {
        this.toolsContainer.innerHTML = '';

        const category = this.categories[this.selectedCategory];

        category.tools.forEach(tool => {
            const btn = document.createElement('button');
            btn.textContent = `${tool.icon} ${tool.label}`;
            if (tool.hotkey) {
                btn.textContent += ` (${tool.hotkey})`;
            }

            Object.assign(btn.style, {
                background: tool.color,
                color: VISUALS.UI.COLORS.text.primary,
                border: `${VISUALS.UI.BORDERS.width.thin} solid ${VISUALS.UI.COLORS.glass.borderHover}`,
                padding: `${VISUALS.UI.SPACING.sm}px ${VISUALS.UI.SPACING.lg}px`,
                borderRadius: VISUALS.UI.BORDERS.radius.md,
                cursor: 'pointer',
                fontSize: VISUALS.UI.FONTS.size.md,
                fontWeight: VISUALS.UI.FONTS.weight.bold,
                transition: VISUALS.UI.TRANSITIONS.presets.fast
            });

            btn.onmouseenter = () => {
                btn.style.transform = 'scale(1.05)';
                btn.style.boxShadow = VISUALS.UI.SHADOWS.md;
            };

            btn.onmouseleave = () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            };

            btn.onclick = () => {
                console.log('[EditorToolbar] Tool clicked:', tool.id, tool.label);
                this.onModeChange(tool.id);
            };

            this.toolsContainer.appendChild(btn);
        });
    }

    public show(): void {
        this.container.style.display = 'flex';
    }

    public hide(): void {
        this.container.style.display = 'none';
    }

    public destroy(): void {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
