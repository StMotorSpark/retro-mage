import { describe, expect, it, vi } from 'vitest';
import { createSpriteRenderer } from './index.js';
import type { ActorsView } from '../world-state/types.js';

describe('SpriteRenderer', () => {
  const createMockGl = () => {
    const drawElementsSpy = vi.fn();
    const recordedMatrices: Float32Array[] = [];
    const uniformMatrix4fvSpy = vi.fn((_loc: any, _transpose: any, value: Float32Array) => {
      recordedMatrices.push(new Float32Array(value));
    });
    const activeTextureSpy = vi.fn();
    const bindTextureSpy = vi.fn();

    const mockGl = {
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
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
      enable: () => {},
      blendFunc: () => {},
      depthMask: () => {},
      uniformMatrix4fv: uniformMatrix4fvSpy,
      uniform4f: () => {},
      uniform1i: () => {},
      drawElements: drawElementsSpy,
      activeTexture: activeTextureSpy,
      bindTexture: bindTextureSpy,
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      ARRAY_BUFFER: 34962,
      ELEMENT_ARRAY_BUFFER: 34963,
      STATIC_DRAW: 35044,
      FLOAT: 5126,
      TRIANGLES: 4,
      UNSIGNED_SHORT: 5123,
      TEXTURE_2D: 3553,
      TEXTURE0: 33984,
      BLEND: 3042,
      SRC_ALPHA: 770,
      ONE_MINUS_SRC_ALPHA: 771,
      DEPTH_TEST: 2929,
    } as unknown as WebGL2RenderingContext;

    return { mockGl, drawElementsSpy, uniformMatrix4fvSpy, recordedMatrices, activeTextureSpy, bindTextureSpy };
  };

  it('creates sprite renderer instance', () => {
    const { mockGl } = createMockGl();
    const renderer = createSpriteRenderer(mockGl);

    expect(renderer).toBeDefined();
    expect(typeof renderer.setTexture).toBe('function');
    expect(typeof renderer.render).toBe('function');
  });

  it('handles empty actors view without errors', () => {
    const { mockGl, drawElementsSpy } = createMockGl();
    const renderer = createSpriteRenderer(mockGl);

    const emptyActors: ActorsView = {
      x: new Float32Array(),
      y: new Float32Array(),
      z: new Float32Array(),
      facing: new Float32Array(),
      sprite_id: new Float32Array(),
      active: new Float32Array(),
      count: 0,
    };

    const identityMat = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);

    renderer.render(emptyActors, identityMat, identityMat);
    expect(drawElementsSpy).not.toHaveBeenCalled();
  });

  it('draws active actors and sorts them back-to-front (painter algorithm)', () => {
    const { mockGl, drawElementsSpy, recordedMatrices } = createMockGl();
    const renderer = createSpriteRenderer(mockGl);

    // View matrix looking down -Z from camera (0, 0, 0)
    const viewMatrix = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
    const projMatrix = new Float32Array(16);

    // Actor 0: Z = -5 (near)
    // Actor 1: Z = -20 (far)
    // Actor 2: Z = -10 (middle)
    const actors: ActorsView = {
      x: new Float32Array([0, 0, 0]),
      y: new Float32Array([0, 0, 0]),
      z: new Float32Array([-5, -20, -10]),
      facing: new Float32Array([0, 0, 0]),
      sprite_id: new Float32Array([1, 1, 1]),
      active: new Float32Array([1, 1, 1]),
      count: 3,
    };

    renderer.render(actors, viewMatrix, projMatrix);

    expect(drawElementsSpy).toHaveBeenCalledTimes(3);

    // Filter matrices that represent u_model translations (mat[15] === 1 and mat[14] !== 0)
    const modelZTranslations = recordedMatrices
      .filter((mat) => mat[15] === 1 && mat[14] !== 0)
      .map((mat) => mat[14]);

    // Must be in order: -20, -10, -5
    expect(modelZTranslations).toEqual([-20, -10, -5]);
  });

  it('binds texture when registered via setTexture', () => {
    const { mockGl, activeTextureSpy, bindTextureSpy } = createMockGl();
    const renderer = createSpriteRenderer(mockGl);

    const dummyTexture = {} as WebGLTexture;
    renderer.setTexture(1, dummyTexture);

    const actors: ActorsView = {
      x: new Float32Array([1]),
      y: new Float32Array([0]),
      z: new Float32Array([2]),
      facing: new Float32Array([0]),
      sprite_id: new Float32Array([1]),
      active: new Float32Array([1]),
      count: 1,
    };

    const identityMat = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);

    renderer.render(actors, identityMat, identityMat);

    expect(activeTextureSpy).toHaveBeenCalledWith(mockGl.TEXTURE0);
    expect(bindTextureSpy).toHaveBeenCalledWith(mockGl.TEXTURE_2D, dummyTexture);
  });
});
