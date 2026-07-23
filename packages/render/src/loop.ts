import type { WorldStateViews } from './world-state/types.js';
import { createTileRenderer, type TileRenderer } from './world-tiles/index.js';
import { createSpriteRenderer, type SpriteRenderer } from './sprites/index.js';
import { mat4CameraView, mat4Create, mat4Perspective } from './matrix.js';
import {
  computeCappedResolution,
  DEFAULT_RENDER_RESOLUTION_CONFIG,
  type RenderResolutionConfig,
} from './resolution.js';
import { createOffscreenFramebuffer, type OffscreenFramebuffer } from './framebuffer.js';
import { createBlitPass, type BlitPass } from './blit.js';

export interface RenderLoop {
  start(): void;
  stop(): void;
  /** Exposed for testing / inspection of current internal resolution */
  getOffscreenDimensions(): { width: number; height: number };
  tileRenderer?: TileRenderer | null;
}

export interface RenderLoopOptions {
  getViews?: () => WorldStateViews | undefined;
  onFrame?: (time: number) => void;
  resolutionConfig?: RenderResolutionConfig;
  tileRenderer?: TileRenderer;
}

const CLEAR_COLOR: readonly [number, number, number, number] = [0.05, 0.05, 0.1, 1];

export function createLoop(
  gl: WebGL2RenderingContext,
  optionsOrGetViews?: RenderLoopOptions | (() => WorldStateViews | undefined),
  onFrameCallback?: (time: number) => void,
): RenderLoop {
  let getViews: (() => WorldStateViews | undefined) | undefined;
  let onFrame: ((time: number) => void) | undefined;
  let resolutionConfig: RenderResolutionConfig = DEFAULT_RENDER_RESOLUTION_CONFIG;
  let customTileRenderer: TileRenderer | undefined;

  if (typeof optionsOrGetViews === 'function') {
    getViews = optionsOrGetViews;
    onFrame = onFrameCallback;
  } else if (optionsOrGetViews) {
    getViews = optionsOrGetViews.getViews;
    onFrame = optionsOrGetViews.onFrame ?? onFrameCallback;
    if (optionsOrGetViews.resolutionConfig) {
      resolutionConfig = optionsOrGetViews.resolutionConfig;
    }
    customTileRenderer = optionsOrGetViews.tileRenderer;
  } else {
    onFrame = onFrameCallback;
  }

  let rafHandle: number | null = null;
  let tileRenderer: TileRenderer | null = customTileRenderer ?? null;
  let spriteRenderer: SpriteRenderer | null = null;

  if (getViews) {
    gl.enable(gl.DEPTH_TEST);
    if (!tileRenderer) {
      tileRenderer = createTileRenderer(gl);
    }
    spriteRenderer = createSpriteRenderer(gl);
  }

  const projMatrix = mat4Create();
  const viewMatrix = mat4Create();

  const canvas = gl.canvas as HTMLCanvasElement | undefined;
  const initialDpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const initialCssW = canvas?.clientWidth || canvas?.width || 300;
  const initialCssH = canvas?.clientHeight || canvas?.height || 150;
  const initialRes = computeCappedResolution(initialCssW, initialCssH, initialDpr, resolutionConfig);

  const offscreen: OffscreenFramebuffer = createOffscreenFramebuffer(
    gl,
    initialRes.width,
    initialRes.height,
  );
  const blitPass: BlitPass = createBlitPass(gl);

  const frame = (time: number): void => {
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const cssW = canvas?.clientWidth || canvas?.width || 300;
    const cssH = canvas?.clientHeight || canvas?.height || 150;

    const cappedRes = computeCappedResolution(cssW, cssH, dpr, resolutionConfig);
    offscreen.resize(cappedRes.width, cappedRes.height);

    const canvasWidth = gl.drawingBufferWidth || canvas?.width || Math.round(cssW * dpr);
    const canvasHeight = gl.drawingBufferHeight || canvas?.height || Math.round(cssH * dpr);

    // 1. Scene draw into offscreen framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, offscreen.framebuffer);
    gl.viewport(0, 0, offscreen.width, offscreen.height);
    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(...CLEAR_COLOR);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (getViews) {
      const views = getViews();
      if (views) {
        const aspect = offscreen.height > 0 ? offscreen.width / offscreen.height : 1.0;
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

    // 2. Linear upscale blit pass into default canvas framebuffer
    blitPass.render(offscreen.texture, canvasWidth, canvasHeight);

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
    getOffscreenDimensions(): { width: number; height: number } {
      return { width: offscreen.width, height: offscreen.height };
    },
    tileRenderer,
  };
}
