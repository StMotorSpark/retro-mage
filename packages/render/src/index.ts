import { createContext } from './context.js';
import { createLoop } from './loop.js';

export interface Renderer {
  start(): void;
  stop(): void;
}

/**
 * Public entry point for the render package. Bootstraps a WebGL2 context on
 * the given canvas and wires it to the placeholder clear-screen render loop.
 *
 * This is a pipeline skeleton — no tile/sprite/lighting rendering happens
 * yet. See docs/architecture/rendering.md for the feature slices this will
 * grow into (lighting, skybox, sprites, world-tiles).
 */
export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const gl = createContext(canvas);
  const loop = createLoop(gl);

  return {
    start: loop.start,
    stop: loop.stop,
  };
}

export * from './world-state/index.js';
