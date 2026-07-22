import type { WorldStateViews } from './world-state/types.js';
import { createTileRenderer, type TileRenderer } from './world-tiles/index.js';
import { createSpriteRenderer, type SpriteRenderer } from './sprites/index.js';
import { mat4CameraView, mat4Create, mat4Perspective } from './matrix.js';

export interface RenderLoop {
  start(): void;
  stop(): void;
}

export interface RenderLoopOptions {
  getViews?: () => WorldStateViews | undefined;
  onFrame?: (time: number) => void;
}

const CLEAR_COLOR: readonly [number, number, number, number] = [0.05, 0.05, 0.1, 1];

export function createLoop(
  gl: WebGL2RenderingContext,
  optionsOrGetViews?: RenderLoopOptions | (() => WorldStateViews | undefined),
  onFrameCallback?: (time: number) => void,
): RenderLoop {
  let getViews: (() => WorldStateViews | undefined) | undefined;
  let onFrame: ((time: number) => void) | undefined;

  if (typeof optionsOrGetViews === 'function') {
    getViews = optionsOrGetViews;
    onFrame = onFrameCallback;
  } else if (optionsOrGetViews) {
    getViews = optionsOrGetViews.getViews;
    onFrame = optionsOrGetViews.onFrame ?? onFrameCallback;
  } else {
    onFrame = onFrameCallback;
  }

  let rafHandle: number | null = null;
  let tileRenderer: TileRenderer | null = null;
  let spriteRenderer: SpriteRenderer | null = null;

  if (getViews) {
    gl.enable(gl.DEPTH_TEST);
    tileRenderer = createTileRenderer(gl);
    spriteRenderer = createSpriteRenderer(gl);
  }

  const projMatrix = mat4Create();
  const viewMatrix = mat4Create();

  const frame = (time: number): void => {
    const width = gl.drawingBufferWidth || gl.canvas.width;
    const height = gl.drawingBufferHeight || gl.canvas.height;
    gl.viewport(0, 0, width, height);

    gl.clearColor(...CLEAR_COLOR);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (getViews) {
      const views = getViews();
      if (views) {
        const aspect = height > 0 ? width / height : 1.0;
        mat4Perspective(projMatrix, Math.PI / 3.0, aspect, 0.1, 100.0);

        const cam = views.camera;
        const cx = cam.count > 0 ? (cam.x[0] ?? 0) : 0;
        const cy = cam.count > 0 ? (cam.y[0] ?? 1.5) : 1.5;
        const cz = cam.count > 0 ? (cam.z[0] ?? 3.0) : 3.0;
        const yaw = cam.count > 0 ? (cam.yaw[0] ?? 0) : 0;
        const pitch = cam.count > 0 ? (cam.pitch[0] ?? 0) : 0;

        mat4CameraView(viewMatrix, cx, cy, cz, yaw, pitch);

        if (tileRenderer) {
          tileRenderer.render(views.tiles, viewMatrix, projMatrix);
        }
        if (spriteRenderer) {
          spriteRenderer.render(views.actors, viewMatrix, projMatrix);
        }
      }
    }

    if (onFrame) {
      onFrame(time);
    }

    rafHandle = requestAnimationFrame(frame);
  };

  return {
    start(): void {
      if (rafHandle !== null) return;
      rafHandle = requestAnimationFrame(frame);
    },
    stop(): void {
      if (rafHandle === null) return;
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    },
  };
}
