
export interface IButtonOptions {
    background?: string;
    color?: string;
    fontSize?: string;
    padding?: string;
    border?: string;
    borderRadius?: string;
    width?: string;
    zIndex?: string;
    fontFamily?: string;
    cursor?: string;
    position?: string;
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
    title?: string;
    pointerEvents?: string;
    fontWeight?: string;
    marginTop?: string;
    id?: string;
    height?: string;
    boxShadow?: string;
    display?: string;
    alignItems?: string;
    justifyContent?: string;
    marginLeft?: string;
    flex?: string;
    flexShrink?: string;
    flexGrow?: string;
}

export interface IContainerOptions {
    position?: string;
    top?: string;
    left?: string;
    bottom?: string;
    right?: string;
    width?: string;
    height?: string;
    display?: string;
    flexDirection?: string;
    alignItems?: string;
    justifyContent?: string;
    gap?: string;
    background?: string;
    color?: string;
    padding?: string;
    border?: string;
    borderRadius?: string;
    zIndex?: string;
    pointerEvents?: string;
    maxWidth?: string;
    maxHeight?: string;
    overflowY?: string;
    overflowX?: string;
    transform?: string;
}

export class UIUtils {
    /**
     * Creates a styled button and appends it to the parent.
     */
    public static createButton(
        parent: HTMLElement,
        text: string,
        onClick: (e: MouseEvent) => void,
        options: IButtonOptions = {}
    ): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.innerHTML = text;

        // Defaults
        const defaults: Partial<CSSStyleDeclaration> = {
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            background: '#333',
            color: '#fff',
            border: '2px solid #555',
            borderRadius: '8px',
            fontFamily: 'Segoe UI, sans-serif',
            pointerEvents: 'auto'
        };

        // Merge options
        Object.assign(btn.style, defaults);

        // Apply overrides
        if (options.background) btn.style.background = options.background;
        if (options.color) btn.style.color = options.color;
        if (options.fontSize) btn.style.fontSize = options.fontSize;
        if (options.padding) btn.style.padding = options.padding;
        if (options.border) btn.style.border = options.border;
        if (options.borderRadius) btn.style.borderRadius = options.borderRadius;
        if (options.width) btn.style.width = options.width;
        if (options.zIndex) btn.style.zIndex = options.zIndex;
        if (options.fontFamily) btn.style.fontFamily = options.fontFamily;
        if (options.cursor) btn.style.cursor = options.cursor;
        if (options.position) btn.style.position = options.position;
        if (options.top) btn.style.top = options.top;
        if (options.right) btn.style.right = options.right;
        if (options.bottom) btn.style.bottom = options.bottom;
        if (options.left) btn.style.left = options.left;
        if (options.title) btn.title = options.title;
        if (options.pointerEvents) btn.style.pointerEvents = options.pointerEvents;
        if (options.fontWeight) btn.style.fontWeight = options.fontWeight;
        if (options.marginTop) btn.style.marginTop = options.marginTop;
        if (options.id) btn.id = options.id;
        if (options.height) btn.style.height = options.height;
        if (options.boxShadow) btn.style.boxShadow = options.boxShadow;
        if (options.display) btn.style.display = options.display;
        if (options.alignItems) btn.style.alignItems = options.alignItems;
        if (options.justifyContent) btn.style.justifyContent = options.justifyContent;
        if (options.marginLeft) btn.style.marginLeft = options.marginLeft;
        if (options.flex) btn.style.flex = options.flex;
        if (options.flexShrink) btn.style.flexShrink = options.flexShrink;
        if (options.flexGrow) btn.style.flexGrow = options.flexGrow;

        btn.onclick = onClick;

        // Simple hover effect
        const originalBg = btn.style.background;
        btn.onmouseover = () => {
            btn.style.filter = 'brightness(1.2)';
        };
        btn.onmouseout = () => {
            btn.style.filter = 'none';
        };

        parent.appendChild(btn);
        return btn;
    }

    /**
     * Creates a container (div) with standard styling options.
     */
    public static createContainer(options: IContainerOptions = {}): HTMLElement {
        const div = document.createElement('div');

        // Apply options
        if (options.position) div.style.position = options.position;
        if (options.top) div.style.top = options.top;
        if (options.left) div.style.left = options.left;
        if (options.bottom) div.style.bottom = options.bottom;
        if (options.right) div.style.right = options.right;
        if (options.width) div.style.width = options.width;
        if (options.height) div.style.height = options.height;
        if (options.display) div.style.display = options.display;
        if (options.flexDirection) div.style.flexDirection = options.flexDirection;
        if (options.alignItems) div.style.alignItems = options.alignItems;
        if (options.justifyContent) div.style.justifyContent = options.justifyContent;
        if (options.gap) div.style.gap = options.gap;
        if (options.background) div.style.background = options.background;
        if (options.color) div.style.color = options.color;
        if (options.padding) div.style.padding = options.padding;
        if (options.border) div.style.border = options.border;
        if (options.borderRadius) div.style.borderRadius = options.borderRadius;
        if (options.zIndex) div.style.zIndex = options.zIndex;
        if (options.pointerEvents) div.style.pointerEvents = options.pointerEvents;
        if (options.maxWidth) div.style.maxWidth = options.maxWidth;
        if (options.maxHeight) div.style.maxHeight = options.maxHeight;
        if (options.overflowY) div.style.overflowY = options.overflowY;
        if (options.overflowX) div.style.overflowX = options.overflowX;
        if (options.transform) div.style.transform = options.transform;

        return div;
    }

    /**
     * Creates a full-screen overlay for menus/modals.
     */
    public static createOverlay(id?: string): HTMLElement {
        const overlay = document.createElement('div');
        if (id) overlay.id = id;
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: '2000',
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'Segoe UI, sans-serif'
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * Animates an element with a flash effect.
     */
    public static flashElement(el: HTMLElement, color: string, durationMs: number = 200) {
        const originalColor = el.style.color;
        const originalTransform = el.style.transform;

        el.style.transition = `color ${durationMs / 2}ms, transform ${durationMs / 2}ms`;
        el.style.color = color;
        el.style.transform = 'scale(1.3)';

        setTimeout(() => {
            el.style.color = originalColor;
            el.style.transform = originalTransform || 'scale(1)';
        }, durationMs);
    }
}
