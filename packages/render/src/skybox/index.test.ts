import { describe, expect, it, vi } from 'vitest';
import { createSkyboxRenderer } from './index.js';
import { mat4Create } from '../matrix.js';

describe('SkyboxRenderer', () => {
  it('creates skybox renderer and calls render without throwing', () => {
    const depthMaskSpy = vi.fn();
    const drawArraysSpy = vi.fn();

    const mockGl = {
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      getShaderParameter: () => true,
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
      getProgramParameter: () => true,
      getAttribLocation: () => 0,
      getUniformLocation: () => ({}),
      createVertexArray: () => ({}),
      bindVertexArray: () => {},
      createBuffer: () => ({}),
      bindBuffer: () => {},
      bufferData: () => {},
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      useProgram: () => {},
      uniformMatrix4fv: () => {},
      uniform3fv: () => {},
      depthMask: depthMaskSpy,
      drawArrays: drawArraysSpy,
      VERTEX_SHADER: 0,
      FRAGMENT_SHADER: 1,
      COMPILE_STATUS: 2,
      LINK_STATUS: 3,
      ARRAY_BUFFER: 4,
      STATIC_DRAW: 5,
      FLOAT: 6,
      TRIANGLES: 7,
    } as unknown as WebGL2RenderingContext;

    const skybox = createSkyboxRenderer(mockGl);
    expect(skybox).toBeDefined();

    const view = mat4Create();
    const proj = mat4Create();

    skybox.setColors([0.1, 0.2, 0.3], [0.8, 0.9, 1.0]);
    skybox.render(view, proj);

    expect(depthMaskSpy).toHaveBeenCalledWith(false);
    expect(depthMaskSpy).toHaveBeenCalledWith(true);
    expect(drawArraysSpy).toHaveBeenCalledWith(mockGl.TRIANGLES, 0, 6);
  });
});
