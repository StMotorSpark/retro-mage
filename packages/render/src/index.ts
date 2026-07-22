import { createContext } from './context.js';
import { createLoop, type RenderLoopOptions } from './loop.js';
import type { WorldStateViews } from './world-state/types.js';

export interface Renderer {
  start(): void;
  stop(): void;
}

/**
 * Public entry point for the render package. Bootstraps a WebGL2 context on
 * the given canvas and wires it to the render loop, drawing placeholder tile
 * and actor sprite geometry when WASM world-state buffer views are provided.
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  optionsOrGetViews?: RenderLoopOptions | (() => WorldStateViews | undefined),
): Renderer {
  const gl = createContext(canvas);
  const loop = createLoop(gl, optionsOrGetViews);

  return {
    start: loop.start,
    stop: loop.stop,
  };
}

export * from './world-state/index.js';
export * from './loop.js';
export * from './world-tiles/index.js';
export * from './sprites/index.js';
export * from './matrix.js';
