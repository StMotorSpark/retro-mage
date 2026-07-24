import type { WorldStateViews } from './world-state/types.js';
import { createTileRenderer, type TileRenderer } from './world-tiles/index.js';
import { createSpriteRenderer, type SpriteRenderer } from './sprites/index.js';
import { createSkyboxRenderer, type SkyboxRenderer } from './skybox/index.js';
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
  skyboxRenderer?: SkyboxRenderer | null;
  spriteRenderer?: SpriteRenderer | null;
  setSkyboxEnabled(enabled: boolean): void;
}

export interface RenderLoopOptions {
  getViews?: () => WorldStateViews | undefined;
  onFrame?: (time: number) => void;
  resolutionConfig?: RenderResolutionConfig;
  tileRenderer?: TileRenderer;
  skyboxRenderer?: SkyboxRenderer;
  spriteRenderer?: SpriteRenderer;
}

const CLEAR_COLOR: readonly [number, number, number, number] = [0.05, 0.05, 0.1, 1];

// engine-core's camera.y is the player's floor elevation/grid layer (visibility culling and
// collision round it to match tile y positions directly — see docs/architecture/collision.md
// and engine-core's recompute_visibility). Tile geometry (world-tiles) renders each tile as a
// 1-unit-tall block from its y to y+1, so a camera placed exactly at that same y sits at the
// tile's base, inside the block. This constant lifts the *render-only* view position to a
// believable eye height above the floor plane without altering camera.y itself (which must
// stay on the tile's floor layer for engine-core visibility/collision to work).
const EYE_HEIGHT_OFFSET = 1.5;

export function createLoop(
  gl: WebGL2RenderingContext,
  optionsOrGetViews?: RenderLoopOptions | (() => WorldStateViews | undefined),
  onFrameCallback?: (time: number) => void,
): RenderLoop {
  let getViews: (() => WorldStateViews | undefined) | undefined;
  let onFrame: ((time: number) => void) | undefined;
  let resolutionConfig: RenderResolutionConfig = DEFAULT_RENDER_RESOLUTION_CONFIG;
  let customTileRenderer: TileRenderer | undefined;
  let customSkyboxRenderer: SkyboxRenderer | undefined;

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
    customSkyboxRenderer = optionsOrGetViews.skyboxRenderer;
  } else {
    onFrame = onFrameCallback;
  }

  let rafHandle: number | null = null;
  let tileRenderer: TileRenderer | null = customTileRenderer ?? null;
  let skyboxRenderer: SkyboxRenderer | null = customSkyboxRenderer ?? null;
  let spriteRenderer: SpriteRenderer | null = null;
  let skyboxEnabled = false;

  if (getViews) {
    gl.enable(gl.DEPTH_TEST);
    if (!tileRenderer) {
      tileRenderer = createTileRenderer(gl);
    }
    if (!skyboxRenderer) {
      skyboxRenderer = createSkyboxRenderer(gl);
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

    // The canvas element's backing store (width/height attributes) is never sized by the
    // browser to match its CSS layout size — it defaults to 300x150 and stays there unless
    // set explicitly. Without this, gl.drawingBufferWidth/Height (and thus the final blit
    // viewport) stay pinned at 300x150 forever while CSS stretches that tiny buffer to fill
    // the page, producing a blurry/degenerate result. Keep the backing store in sync with the
    // element's displayed CSS size (at device pixel ratio) every frame.
    const desiredWidth = Math.max(1, Math.round(cssW * dpr));
    const desiredHeight = Math.max(1, Math.round(cssH * dpr));
    if (canvas && (canvas.width !== desiredWidth || canvas.height !== desiredHeight)) {
      canvas.width = desiredWidth;
      canvas.height = desiredHeight;
    }

    const canvasWidth = gl.drawingBufferWidth || canvas?.width || desiredWidth;
    const canvasHeight = gl.drawingBufferHeight || canvas?.height || desiredHeight;

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
        const cy = (cam.count > 0 ? (cam.y[0] ?? 0) : 0) + EYE_HEIGHT_OFFSET;
        const cz = cam.count > 0 ? (cam.z[0] ?? 3.0) : 3.0;
        const yaw = cam.count > 0 ? (cam.yaw[0] ?? 0) : 0;
        const pitch = cam.count > 0 ? (cam.pitch[0] ?? 0) : 0;

        mat4CameraView(viewMatrix, cx, cy, cz, yaw, pitch);

        if (skyboxEnabled && skyboxRenderer) {
          skyboxRenderer.render(viewMatrix, projMatrix);
        }
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
    skyboxRenderer,
    spriteRenderer,
    setSkyboxEnabled(enabled: boolean): void {
      skyboxEnabled = enabled;
    },
  };
}
