import { describe, expect, it, vi } from 'vitest';
import { createTileRenderer } from './index.js';
import type { TilesView } from '../world-state/types.js';

function createMockGl() {
  const bindTexture = vi.fn();
  const mockGl = {
    createShader: () => ({}), shaderSource: () => {}, compileShader: () => {},
    createProgram: () => ({}), attachShader: () => {}, linkProgram: () => {},
    getAttribLocation: () => 0, getUniformLocation: () => ({}),
    createVertexArray: () => ({}), bindVertexArray: () => {},
    createBuffer: () => ({}), bindBuffer: () => {}, bufferData: () => {},
    enableVertexAttribArray: () => {}, vertexAttribPointer: () => {},
    useProgram: () => {}, uniformMatrix4fv: () => {}, uniform1f: () => {},
    uniform1i: () => {}, uniform4f: () => {}, activeTexture: () => {}, bindTexture,
    drawElements: () => {},
    VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963, STATIC_DRAW: 35044, FLOAT: 5126,
    TRIANGLES: 4, UNSIGNED_SHORT: 5123, TEXTURE_2D: 3553, TEXTURE0: 33984,
  } as unknown as WebGL2RenderingContext;
  return { mockGl, bindTexture };
}

function tiles(materialId?: number): TilesView {
  return {
    x: new Float32Array([0]), y: new Float32Array([0]), z: new Float32Array([0]),
    tile_id: new Float32Array([16]), variant: new Float32Array([0]),
    solid: new Float32Array([0]), vertical_opening: new Float32Array([0]),
    direction: new Float32Array([0]), material_id: materialId === undefined ? undefined : new Float32Array([materialId]),
    count: 1,
  };
}

const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

describe('TileRenderer material texture binding', () => {
  it('uses scene material_id rather than the authored tile_id', () => {
    const { mockGl, bindTexture } = createMockGl();
    const renderer = createTileRenderer(mockGl);
    const materialTexture = { name: 'material' } as unknown as WebGLTexture;
    const tileTexture = { name: 'tile' } as unknown as WebGLTexture;
    renderer.setTexture(7, materialTexture);
    renderer.setTexture(16, tileTexture);

    renderer.render(tiles(7), identity, identity);

    expect(bindTexture).toHaveBeenCalledWith(mockGl.TEXTURE_2D, materialTexture);
    expect(bindTexture).not.toHaveBeenCalledWith(mockGl.TEXTURE_2D, tileTexture);
  });

  it('uses tile_id for legacy views without material metadata', () => {
    const { mockGl, bindTexture } = createMockGl();
    const renderer = createTileRenderer(mockGl);
    const legacyTexture = {} as WebGLTexture;
    renderer.setTexture(16, legacyTexture);

    renderer.render(tiles(), identity, identity);

    expect(bindTexture).toHaveBeenCalledWith(mockGl.TEXTURE_2D, legacyTexture);
  });
});
