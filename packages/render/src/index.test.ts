import { describe, expect, it } from 'vitest';
import { createRenderer, createLoop, mat4CameraView, mat4Perspective, mat4Translation } from './index.js';
import type { WorldStateViews } from './world-state/types.js';

describe('render', () => {
  it('exports createRenderer and createLoop', () => {
    expect(createRenderer).toBeDefined();
    expect(typeof createRenderer).toBe('function');
    expect(createLoop).toBeDefined();
    expect(typeof createLoop).toBe('function');
  });

  describe('matrix math', () => {
    it('creates translation matrix correctly', () => {
      const mat = mat4Translation(new Float32Array(16), 1, 2, 3);
      expect(mat[12]).toBe(1);
      expect(mat[13]).toBe(2);
      expect(mat[14]).toBe(3);
      expect(mat[15]).toBe(1);
    });

    it('creates perspective projection matrix correctly', () => {
      const mat = mat4Perspective(new Float32Array(16), Math.PI / 3, 16 / 9, 0.1, 100);
      expect(mat[11]).toBe(-1);
      expect(mat[5]).toBeGreaterThan(0);
    });

    it('creates camera view matrix correctly', () => {
      const mat = mat4CameraView(new Float32Array(16), 0, 1.5, 3.5, 0, 0);
      // Translation component for eye (0, 1.5, 3.5)
      expect(mat[12]).toBeCloseTo(0);
      expect(mat[13]).toBeCloseTo(-1.5);
      expect(mat[14]).toBeCloseTo(-3.5);
    });
  });

  describe('loop initialization', () => {
    it('creates loop object with start and stop handlers', () => {
      const mockGl = {
        clearColor: () => {},
        clear: () => {},
        enable: () => {},
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
        uniformMatrix4fv: () => {},
        uniform4f: () => {},
        drawElements: () => {},
        viewport: () => {},
        canvas: { width: 800, height: 600 },
        drawingBufferWidth: 800,
        drawingBufferHeight: 600,
        COLOR_BUFFER_BIT: 1,
        DEPTH_BUFFER_BIT: 2,
        DEPTH_TEST: 3,
        VERTEX_SHADER: 4,
        FRAGMENT_SHADER: 5,
        ARRAY_BUFFER: 6,
        ELEMENT_ARRAY_BUFFER: 7,
        STATIC_DRAW: 8,
        FLOAT: 9,
        TRIANGLES: 10,
        UNSIGNED_SHORT: 11,
      } as unknown as WebGL2RenderingContext;

      const mockViews: WorldStateViews = {
        actors: { x: new Float32Array([0]), y: new Float32Array([0]), z: new Float32Array([-2]), facing: new Float32Array([0]), sprite_id: new Float32Array([1]), active: new Float32Array([1]), count: 1 },
        lights: { x: new Float32Array([0]), y: new Float32Array([0]), z: new Float32Array([0]), r: new Float32Array([1]), g: new Float32Array([1]), b: new Float32Array([1]), intensity: new Float32Array([1]), active: new Float32Array([1]), count: 1 },
        tiles: { x: new Float32Array([0]), y: new Float32Array([0]), z: new Float32Array([-1]), tile_id: new Float32Array([1]), variant: new Float32Array([0]), count: 1 },
        camera: { x: new Float32Array([0]), y: new Float32Array([1.5]), z: new Float32Array([3.5]), yaw: new Float32Array([0]), pitch: new Float32Array([0]), count: 1 },
      };

      const loop = createLoop(mockGl, () => mockViews);
      expect(loop).toBeDefined();
      expect(typeof loop.start).toBe('function');
      expect(typeof loop.stop).toBe('function');
    });
  });
});
