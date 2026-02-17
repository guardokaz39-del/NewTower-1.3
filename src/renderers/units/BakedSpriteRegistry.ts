import { AssetCache } from '../../utils/AssetCache';
import type { SpriteFacing } from './CachedUnitRenderer';

const FRAME_COUNT = 32;

type Dir3Frames = {
    SIDE: Array<HTMLCanvasElement | undefined>;
    UP: Array<HTMLCanvasElement | undefined>;
    DOWN: Array<HTMLCanvasElement | undefined>;
};

export class BakedSpriteRegistry {
    private static frames: Map<string, Array<HTMLCanvasElement | undefined>> = new Map();
    private static dir3Frames: Map<string, Dir3Frames> = new Map();

    public static registerSide(typeId: string): void {
        const sideFrames: Array<HTMLCanvasElement | undefined> = [];

        for (let i = 0; i < FRAME_COUNT; i++) {
            const key = `unit_${typeId}_walk_${i}`;
            sideFrames.push(AssetCache.peek(key));
        }

        this.frames.set(typeId, sideFrames);
    }

    public static registerDir3(typeId: string): void {
        const buildFacingFrames = (facing: SpriteFacing): Array<HTMLCanvasElement | undefined> => {
            const facingFrames: Array<HTMLCanvasElement | undefined> = [];
            for (let i = 0; i < FRAME_COUNT; i++) {
                const key = `unit_${typeId}_${facing.toLowerCase()}_walk_${i}`;
                facingFrames.push(AssetCache.peek(key));
            }
            return facingFrames;
        };

        this.dir3Frames.set(typeId, {
            SIDE: buildFacingFrames('SIDE'),
            UP: buildFacingFrames('UP'),
            DOWN: buildFacingFrames('DOWN'),
        });
    }

    public static get(typeId: string, facing: SpriteFacing, frameIdx: number): HTMLCanvasElement | undefined {
        if (frameIdx < 0 || frameIdx >= FRAME_COUNT) return undefined;

        const dir3Entry = this.dir3Frames.get(typeId);
        if (dir3Entry) {
            return dir3Entry[facing][frameIdx];
        }

        const sideEntry = this.frames.get(typeId);
        if (sideEntry) {
            return sideEntry[frameIdx];
        }

        return undefined;
    }
}
