export type EditorMode =
    | 'paint_grass'
    | 'paint_road'
    | 'paint_water'
    | 'paint_sand'
    | 'paint_bridge'
    | 'paint_lava'
    | 'paint_fog'
    | 'place_stone'
    | 'place_rock'
    | 'place_tree'
    | 'place_wheat'
    | 'place_flowers'
    | 'place_bush'
    | 'place_pine'
    | 'place_crate'
    | 'place_barrel'
    | 'place_torch_stand'
    | 'set_start'
    | 'set_end'
    | 'place_waypoint'
    | 'eraser'
    | 'fill'
    | 'eyedropper';

export class EditorState {
    public mode: EditorMode = 'paint_road';
    public brushSize: 1 | 2 | 3 = 1;
    public gridVisible: boolean = true;
    public timeOfDay: 'day' | 'night' = 'day';

    // Callbacks
    public onChange: (() => void) | null = null;

    public setMode(mode: EditorMode) {
        if (this.mode !== mode) {
            this.mode = mode;
            this.notify();
        }
    }

    public setBrushSize(size: 1 | 2 | 3) {
        if (this.brushSize !== size) {
            this.brushSize = size;
            this.notify();
        }
    }

    public setGridVisible(visible: boolean) {
        if (this.gridVisible !== visible) {
            this.gridVisible = visible;
            this.notify();
        }
    }

    public setTimeOfDay(time: 'day' | 'night') {
        if (this.timeOfDay !== time) {
            this.timeOfDay = time;
            this.notify();
        }
    }

    private notify() {
        if (this.onChange) {
            this.onChange();
        }
    }
}
