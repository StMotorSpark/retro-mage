/**
 * Placeholder render loop proving the requestAnimationFrame pipeline works.
 *
 * Each frame clears the canvas to a solid color. No real world-tile, sprite,
 * lighting, or skybox rendering happens here yet — those live in their own
 * vertical-slice folders and are wired in by future tasks.
 */
export interface RenderLoop {
  start(): void;
  stop(): void;
}

const CLEAR_COLOR: readonly [number, number, number, number] = [0.05, 0.05, 0.1, 1];

export function createLoop(gl: WebGL2RenderingContext, onFrame?: (time: number) => void): RenderLoop {
  let rafHandle: number | null = null;

  const frame = (time: number): void => {
    gl.clearColor(...CLEAR_COLOR);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    onFrame?.(time);

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
