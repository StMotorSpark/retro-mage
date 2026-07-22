/**
 * Initializes a WebGL2 rendering context from a provided canvas element.
 *
 * Throws a clear error if the browser/context does not support WebGL2,
 * since the rendering pipeline is WebGL2-only for this skeleton (see
 * docs/architecture/tech-stack.md).
 */
export function createContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2');

  if (!gl) {
    throw new Error(
      'Failed to acquire a WebGL2 context. This browser/device does not support WebGL2, ' +
        'or the canvas element already has a conflicting context of a different type.',
    );
  }

  return gl;
}
