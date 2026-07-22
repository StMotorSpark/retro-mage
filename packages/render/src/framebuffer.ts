export interface OffscreenFramebuffer {
  framebuffer: WebGLFramebuffer | null;
  texture: WebGLTexture | null;
  depthBuffer: WebGLRenderbuffer | null;
  width: number;
  height: number;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createOffscreenFramebuffer(
  gl: WebGL2RenderingContext,
  initialWidth: number,
  initialHeight: number,
): OffscreenFramebuffer {
  const framebuffer = gl.createFramebuffer ? gl.createFramebuffer() : null;
  const texture = gl.createTexture ? gl.createTexture() : null;
  const depthBuffer = gl.createRenderbuffer ? gl.createRenderbuffer() : null;

  let currentWidth = 0;
  let currentHeight = 0;

  function resize(width: number, height: number): void {
    const safeW = Math.max(1, width);
    const safeH = Math.max(1, height);
    if (safeW === currentWidth && safeH === currentHeight) return;

    currentWidth = safeW;
    currentHeight = safeH;

    if (texture) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        safeW,
        safeH,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    if (depthBuffer) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, safeW, safeH);
    }

    if (framebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      if (texture) {
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          texture,
          0,
        );
      }
      if (depthBuffer) {
        gl.framebufferRenderbuffer(
          gl.FRAMEBUFFER,
          gl.DEPTH_ATTACHMENT,
          gl.RENDERBUFFER,
          depthBuffer,
        );
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  resize(initialWidth, initialHeight);

  return {
    framebuffer,
    texture,
    depthBuffer,
    get width() {
      return currentWidth;
    },
    get height() {
      return currentHeight;
    },
    resize,
    dispose() {
      if (framebuffer) gl.deleteFramebuffer(framebuffer);
      if (texture) gl.deleteTexture(texture);
      if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
    },
  };
}
