interface IEditorAction {
    type: 'tile' | 'waypoint' | 'fog';
    undo: () => void;
    redo: () => void;
}

export class EditorHistory {
    private undoStack: IEditorAction[] = [];
    private redoStack: IEditorAction[] = [];
    private readonly maxSize = 50;

    public push(action: IEditorAction): void {
        this.undoStack.push(action);

        // Clear redo stack when new action is added
        this.redoStack = [];

        // Maintain max size
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
    }

    public undo(): boolean {
        const action = this.undoStack.pop();
        if (!action) return false;

        action.undo();
        this.redoStack.push(action);

        return true;
    }

    public redo(): boolean {
        const action = this.redoStack.pop();
        if (!action) return false;

        action.redo();
        this.undoStack.push(action);

        return true;
    }

    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }

    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    // --- Compound Action Support ---

    private pendingCompound: IEditorAction[] | null = null;
    private pendingLabel: string = '';

    public beginCompound(label: string): void {
        this.pendingCompound = [];
        this.pendingLabel = label;
    }

    public pushInCompound(action: IEditorAction): void {
        if (this.pendingCompound) {
            this.pendingCompound.push(action);
        } else {
            // Fallback: no active compound, push directly
            this.push(action);
        }
    }

    public commitCompound(): void {
        if (!this.pendingCompound || this.pendingCompound.length === 0) {
            this.pendingCompound = null;
            return;
        }

        const actions = this.pendingCompound;
        this.pendingCompound = null;

        // Single undo step that reverses all sub-actions
        this.push({
            type: actions[0].type,
            undo: () => {
                for (let i = actions.length - 1; i >= 0; i--) {
                    actions[i].undo();
                }
            },
            redo: () => {
                for (let i = 0; i < actions.length; i++) {
                    actions[i].redo();
                }
            }
        });
    }

    public cancelCompound(): void {
        // Undo any already applied actions in the compound
        if (this.pendingCompound) {
            for (let i = this.pendingCompound.length - 1; i >= 0; i--) {
                this.pendingCompound[i].undo();
            }
        }
        this.pendingCompound = null;
    }
}

// Action factory helpers
export class EditorActions {
    /**
     * Create a tile change action
     */
    static createTileAction(
        grid: any[][],
        col: number,
        row: number,
        oldType: number,
        newType: number
    ): IEditorAction {
        return {
            type: 'tile',
            undo: () => {
                grid[row][col].type = oldType;
            },
            redo: () => {
                grid[row][col].type = newType;
            }
        };
    }

    /**
     * Create a fog change action
     */
    static createFogAction(
        fog: any,
        col: number,
        row: number,
        oldDensity: number,
        newDensity: number
    ): IEditorAction {
        return {
            type: 'fog',
            undo: () => {
                fog.setFog(col, row, oldDensity);
            },
            redo: () => {
                fog.setFog(col, row, newDensity);
            }
        };
    }

    /**
     * Create a waypoint action
     */
    static createWaypointAction(
        waypointMgr: any,
        actionType: 'addWaypoint' | 'setStart' | 'setEnd',
        position: { x: number; y: number },
        oldState?: any
    ): IEditorAction {
        return {
            type: 'waypoint',
            undo: () => {
                // Restore old state (for simplicity, clear and rebuild)
                if (oldState) {
                    waypointMgr.clearAll();
                    if (oldState.start) waypointMgr.setStart(oldState.start);
                    if (oldState.end) waypointMgr.setEnd(oldState.end);
                    oldState.waypoints?.forEach((wp: any) => waypointMgr.addWaypoint(wp));
                }
            },
            redo: () => {
                if (actionType === 'addWaypoint') {
                    waypointMgr.addWaypoint(position);
                } else if (actionType === 'setStart') {
                    waypointMgr.setStart(position);
                } else if (actionType === 'setEnd') {
                    waypointMgr.setEnd(position);
                }
            }
        };
    }
}
