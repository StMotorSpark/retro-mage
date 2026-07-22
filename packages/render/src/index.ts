import { createContext } from './context.js';
import { createLoop, type RenderLoopOptions, type RenderLoop } from './loop.js';
import type { WorldStateViews } from './world-state/types.js';

export type Renderer = RenderLoop;

/**
 * Public entry point for the render package. Bootstraps a WebGL2 context on
 * the given canvas and wires it to the render loop, drawing placeholder tile
 * and actor sprite geometry when WASM world-state buffer views are provided.
 *
 * Scene rendering targets a capped offscreen framebuffer which is upscaled via
 * a linear-filtered fullscreen-quad blit pass.
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  optionsOrGetViews?: RenderLoopOptions | (() => WorldStateViews | undefined),
): Renderer {
  const gl = createContext(canvas);
  return createLoop(gl, optionsOrGetViews);
}

export * from './resolution.js';
export * from './framebuffer.js';
export * from './blit.js';
export * from './world-state/index.js';
export * from './loop.js';
export * from './world-tiles/index.js';
export * from './sprites/index.js';
export * from './matrix.js';
export * from './textures/index.js';
