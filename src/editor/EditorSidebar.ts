import { UIUtils } from '../UIUtils';
import { VISUALS } from '../VisualConfig';
import { EditorState, EditorMode } from './EditorState';

export class EditorSidebar {
    private container: HTMLElement;
    private state: EditorState;
    private isCollapsed: boolean = false;
    private contentContainer!: HTMLElement;

    // Callbacks for actions
    public onSaveMode?: () => void;
    public onExport?: () => void;
    public onImport?: () => void;
    public onMenu?: () => void;
    public onToggle?: (isCollapsed: boolean) => void;

    // References for dynamic updates
    private timeBtn!: HTMLButtonElement;
    private gridBtn!: HTMLButtonElement;

    constructor(state: EditorState) {
        this.state = state;
        this.container = this.createContainer();
        this.render();

        // Subscribe to state changes to update UI
        this.state.onChange = () => this.updateUI();
    }

    private createContainer(): HTMLElement {
        const el = UIUtils.createContainer({
            position: 'absolute', // absolute for overlay mode
            top: '0',
            left: '0',
            width: '240px',
            height: '100%',
            background: VISUALS.UI.COLORS.glass.bgDark,
            display: 'flex',
            flexDirection: 'column',
            zIndex: '50', // high z-index to overlay canvas
            pointerEvents: 'auto'
        });
        el.style.transition = 'transform 160ms ease'; // transition transform, not width
        el.style.borderRight = `1px solid ${VISUALS.UI.COLORS.glass.border}`;
        return el;
    }

    private render() {
        this.container.innerHTML = '';

        // Header with toggle
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            borderBottom: `1px solid ${VISUALS.UI.COLORS.glass.border}`,
            color: '#fff',
            fontWeight: 'bold'
        });

        const title = document.createElement('span');
        title.innerText = 'Editor Tools';
        title.style.transition = 'opacity 160ms ease'; // Smooth fade
        title.style.opacity = this.isCollapsed ? '0' : '1';
        title.style.pointerEvents = this.isCollapsed ? 'none' : 'auto';

        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = '≡';
        Object.assign(toggleBtn.style, {
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px'
        });
        toggleBtn.onclick = () => {
            this.isCollapsed = !this.isCollapsed;
            this.container.style.transform = this.isCollapsed ? 'translateX(-200px)' : 'translateX(0)';

            // Fade out content instead of display:none to prevent reflow
            title.style.opacity = this.isCollapsed ? '0' : '1';
            title.style.pointerEvents = this.isCollapsed ? 'none' : 'auto';
            this.contentContainer.style.opacity = this.isCollapsed ? '0' : '1';
            this.contentContainer.style.pointerEvents = this.isCollapsed ? 'none' : 'auto';

            // Notify listeners (like EditorScene overlay)
            this.onToggle?.(this.isCollapsed);
        };

        header.appendChild(title);
        header.appendChild(toggleBtn);
        this.container.appendChild(header);

        // Content
        this.contentContainer = document.createElement('div');
        Object.assign(this.contentContainer.style, {
            flex: '1',
            overflowY: 'auto',
            display: 'flex', // always flex, visibility handled by opacity
            flexDirection: 'column',
            gap: '10px',
            padding: '10px',
            pointerEvents: this.isCollapsed ? 'none' : 'auto',
            opacity: this.isCollapsed ? '0' : '1',
            transition: 'opacity 160ms ease'
        });
        this.container.appendChild(this.contentContainer);

        this.renderSections();

        // Initial state sync
        this.container.style.transform = this.isCollapsed ? 'translateX(-200px)' : 'translateX(0)';
    }

    private renderSections() {
        this.createSection('🌍 Terrain', [
            { id: 'paint_grass', icon: '🌲', label: 'Grass (0)' },
            { id: 'paint_road', icon: '🟫', label: 'Road (1)' },
            { id: 'paint_water', icon: '💧', label: 'Water (2)' },
            { id: 'paint_sand', icon: '🏜️', label: 'Sand (3)' },
            { id: 'paint_bridge', icon: '🌉', label: 'Bridge(4)' },
            { id: 'paint_lava', icon: '🌋', label: 'Lava (5)' },
            { id: 'paint_fog', icon: '🌫️', label: 'Fog' },
        ]);

        this.createSection('📦 Objects', [
            { id: 'place_stone', icon: '🪨', label: 'Stone' },
            { id: 'place_rock', icon: '⛰️', label: 'Rock' },
            { id: 'place_tree', icon: '🌲', label: 'Tree' },
            { id: 'place_wheat', icon: '🌾', label: 'Wheat' },
            { id: 'place_flowers', icon: '🌸', label: 'Flowers' },
            { id: 'place_bush', icon: '🌿', label: 'Bush' },
            { id: 'place_pine', icon: '🌲', label: 'Pine' },
            { id: 'place_crate', icon: '📦', label: 'Crate' },
            { id: 'place_barrel', icon: '🛢️', label: 'Barrel' },
            { id: 'place_torch_stand', icon: '🔥', label: 'Torch' },
        ]);

        this.createSection('🛤️ Path', [
            { id: 'set_start', icon: '🏁', label: 'Start' },
            { id: 'set_end', icon: '🛑', label: 'End' },
            { id: 'place_waypoint', icon: '📍', label: 'Waypoint' },
        ]);

        // Tools
        this.createSection('🔧 Tools', [
            { id: 'eraser', icon: '🧹', label: 'Eraser (E)' }
        ]);

        // Settings
        const settingsDiv = document.createElement('div');
        settingsDiv.style.border = '1px solid #444';
        settingsDiv.style.borderRadius = '4px';
        settingsDiv.style.padding = '5px';
        settingsDiv.innerHTML = `<div style="color:#aaa; font-size:12px; margin-bottom:5px;">🌓 Settings</div>`;

        this.timeBtn = document.createElement('button');
        this.timeBtn.innerText = this.state.timeOfDay === 'day' ? '☀️ Day' : '🌙 Night';
        this.timeBtn.onclick = () => {
            this.state.setTimeOfDay(this.state.timeOfDay === 'day' ? 'night' : 'day');
        };
        Object.assign(this.timeBtn.style, {
            width: '100%', padding: '5px', background: '#333', color: '#fff', border: '1px solid #555', cursor: 'pointer', borderRadius: '4px'
        });
        settingsDiv.appendChild(this.timeBtn);

        this.gridBtn = document.createElement('button');
        this.gridBtn.innerText = `Grid: ${this.state.gridVisible ? 'ON' : 'OFF'}`;
        this.gridBtn.onclick = () => {
            this.state.setGridVisible(!this.state.gridVisible);
        };
        Object.assign(this.gridBtn.style, {
            width: '100%', padding: '5px', background: '#333', color: '#fff', border: '1px solid #555', cursor: 'pointer', borderRadius: '4px', marginTop: '5px'
        });
        settingsDiv.appendChild(this.gridBtn);
        this.contentContainer.appendChild(settingsDiv);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.style.border = '1px solid #444';
        actionsDiv.style.borderRadius = '4px';
        actionsDiv.style.padding = '5px';
        actionsDiv.innerHTML = `<div style="color:#aaa; font-size:12px; margin-bottom:5px;">💾 Actions</div>`;

        const createActionBtn = (text: string, color: string, onClick: () => void) => {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.onclick = onClick;
            Object.assign(btn.style, {
                width: '100%', padding: '8px', background: color, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px', marginTop: '5px', fontWeight: 'bold'
            });
            actionsDiv.appendChild(btn);
        };

        createActionBtn('⚙️ WAVES & SAVE', '#ff9800', () => this.onSaveMode?.());
        createActionBtn('📥 Export JSON', '#2196f3', () => this.onExport?.());
        createActionBtn('📤 Import JSON', '#9c27b0', () => this.onImport?.());
        createActionBtn('🚪 MENU', '#d32f2f', () => this.onMenu?.());

        this.contentContainer.appendChild(actionsDiv);

        this.updateUI();
    }

    private createSection(title: string, tools: { id: string, icon: string, label: string }[]) {
        const section = document.createElement('div');
        section.style.border = '1px solid #444';
        section.style.borderRadius = '4px';
        section.style.padding = '5px';

        const header = document.createElement('div');
        header.innerText = title;
        header.style.color = '#aaa';
        header.style.fontSize = '12px';
        header.style.marginBottom = '5px';
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '4px';

        tools.forEach(tool => {
            const btn = document.createElement('button');
            btn.dataset.toolId = tool.id;
            btn.innerHTML = `${tool.icon} <span style="font-size:10px">${tool.label}</span>`;
            Object.assign(btn.style, {
                background: '#333', color: '#fff', border: '1px solid #555', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center'
            });
            btn.onclick = () => this.state.setMode(tool.id as EditorMode);
            grid.appendChild(btn);
        });

        section.appendChild(grid);
        this.contentContainer.appendChild(section);
    }

    private updateUI() {
        if (this.isCollapsed) return;

        // Update selected tool
        const buttons = this.contentContainer.querySelectorAll('button[data-tool-id]');
        buttons.forEach(btn => {
            const b = btn as HTMLButtonElement;
            if (b.dataset.toolId === this.state.mode) {
                b.style.background = '#2196f3';
                b.style.borderColor = '#64b5f6';
            } else {
                b.style.background = '#333';
                b.style.borderColor = '#555';
            }
        });

        // Update settings
        if (this.timeBtn) {
            this.timeBtn.innerText = this.state.timeOfDay === 'day' ? '☀️ Day' : '🌙 Night';
        }
        if (this.gridBtn) {
            this.gridBtn.innerText = `Grid: ${this.state.gridVisible ? 'ON' : 'OFF'}`;
        }
    }

    public getElement(): HTMLElement {
        return this.container;
    }

    /**
     * Injects a custom DOM element section into the sidebar content container.
     */
    public injectCustomElement(title: string, element: HTMLElement): void {
        const section = document.createElement('div');
        section.style.border = '1px solid #444';
        section.style.borderRadius = '4px';
        section.style.padding = '5px';
        section.style.marginTop = '10px';

        // Hide if sidebar is collapsed
        if (this.isCollapsed) {
            section.style.opacity = '0';
            section.style.pointerEvents = 'none';
        }

        const header = document.createElement('div');
        header.innerText = title;
        header.style.color = '#aaa';
        header.style.fontSize = '12px';
        header.style.marginBottom = '5px';
        header.style.fontWeight = 'bold';
        section.appendChild(header);

        section.appendChild(element);
        this.contentContainer.appendChild(section);

        // Store reference for toggling visibility
        this.container.dataset.customSections = (parseInt(this.container.dataset.customSections || '0') + 1).toString();
    }

    public destroy(): void {
        this.state.onChange = null;
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    // --- Overlay API ---
    public getIsCollapsed(): boolean {
        return this.isCollapsed;
    }

    public collapse(): void {
        if (!this.isCollapsed) {
            this.isCollapsed = true;
            this.container.style.transform = 'translateX(-200px)';

            // Fade out content
            const title = this.container.querySelector('span');
            if (title) {
                title.style.opacity = '0';
                title.style.pointerEvents = 'none';
            }
            this.contentContainer.style.opacity = '0';
            this.contentContainer.style.pointerEvents = 'none';

            this.onToggle?.(this.isCollapsed);
        }
    }
}
