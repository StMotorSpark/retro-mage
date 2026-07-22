import { describe, expect, it, vi } from 'vitest';
import {
  createRenderer,
  createLoop,
  mat4CameraView,
  mat4Perspective,
  mat4Translation,
  computeCappedResolution,
  DEFAULT_RENDER_RESOLUTION_CONFIG,
  createOffscreenFramebuffer,
} from './index.js';
import type { WorldStateViews } from './world-state/types.js';

describe('render', () => {
  it('exports createRenderer, createLoop and resolution utils', () => {
    expect(createRenderer).toBeDefined();
    expect(typeof createRenderer).toBe('function');
    expect(createLoop).toBeDefined();
    expect(typeof createLoop).toBe('function');
    expect(computeCappedResolution).toBeDefined();
    expect(DEFAULT_RENDER_RESOLUTION_CONFIG).toBeDefined();
  });

  describe('resolution capping logic', () => {
    it('uses default config of maxDevicePixelRatio = 1.0', () => {
      expect(DEFAULT_RENDER_RESOLUTION_CONFIG.maxDevicePixelRatio).toBe(1.0);
      expect(DEFAULT_RENDER_RESOLUTION_CONFIG.maxPixels).toBe(Number.POSITIVE_INFINITY);
    });

    it('caps resolution when DPR exceeds maxDevicePixelRatio', () => {
      const res = computeCappedResolution(1920, 1080, 3.0, {
        maxDevicePixelRatio: 1.5,
        maxPixels: Number.POSITIVE_INFINITY,
      });
      // 1920 * 1.5 = 2880, 1080 * 1.5 = 1620
      expect(res.width).toBe(2880);
      expect(res.height).toBe(1620);
    });

    it('uses DPR directly when lower than maxDevicePixelRatio', () => {
      const res = computeCappedResolution(800, 600, 1.0, {
        maxDevicePixelRatio: 2.0,
        maxPixels: Number.POSITIVE_INFINITY,
      });
      expect(res.width).toBe(800);
      expect(res.height).toBe(600);
    });

    it('applies hard maxPixels limit when total pixels exceed budget', () => {
      const res = computeCappedResolution(3840, 2160, 2.0, {
        maxDevicePixelRatio: 2.0,
        maxPixels: 1920 * 1080, // 2073600 max pixels
      });
      const totalPixels = res.width * res.height;
      expect(totalPixels).toBeLessThanOrEqual(1920 * 1080);
      expect(res.width).toBe(1920);
      expect(res.height).toBe(1080);
    });
  });

  describe('offscreen framebuffer and linear filtering', () => {
    it('configures linear min/mag filtering on offscreen texture', () => {
      const texParameteriSpy = vi.fn();
      const mockGl = {
        createFramebuffer: () => ({}),
        createTexture: () => ({}),
        createRenderbuffer: () => ({}),
        bindFramebuffer: () => {},
        bindTexture: () => {},
        bindRenderbuffer: () => {},
        texImage2D: () => {},
        texParameteri: texParameteriSpy,
        renderbufferStorage: () => {},
        framebufferTexture2D: () => {},
        framebufferRenderbuffer: () => {},
        TEXTURE_2D: 0x0de1,
        TEXTURE_MIN_FILTER: 0x2801,
        TEXTURE_MAG_FILTER: 0x2800,
        TEXTURE_WRAP_S: 0x2802,
        TEXTURE_WRAP_T: 0x2803,
        LINEAR: 0x2601,
        CLAMP_TO_EDGE: 0x812f,
        RGBA: 0x1908,
        UNSIGNED_BYTE: 0x1401,
        RENDERBUFFER: 0x8d41,
        DEPTH_COMPONENT16: 0x81a5,
        FRAMEBUFFER: 0x8d40,
        COLOR_ATTACHMENT0: 0x8ce0,
        DEPTH_ATTACHMENT: 0x8d00,
      } as unknown as WebGL2RenderingContext;

      const fb = createOffscreenFramebuffer(mockGl, 640, 480);

      expect(texParameteriSpy).toHaveBeenCalledWith(mockGl.TEXTURE_2D, mockGl.TEXTURE_MIN_FILTER, mockGl.LINEAR);
      expect(texParameteriSpy).toHaveBeenCalledWith(mockGl.TEXTURE_2D, mockGl.TEXTURE_MAG_FILTER, mockGl.LINEAR);

      fb.resize(1280, 720);
      expect(fb.width).toBe(1280);
      expect(fb.height).toBe(720);
    });
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
      expect(mat[12]).toBeCloseTo(0);
      expect(mat[13]).toBeCloseTo(-1.5);
      expect(mat[14]).toBeCloseTo(-3.5);
    });
  });

  describe('loop initialization and frame blit', () => {
    it('creates loop object with start, stop, and getOffscreenDimensions', () => {
      const bindFramebufferSpy = vi.fn();
      const mockGl = {
        clearColor: () => {},
        clear: () => {},
        enable: () => {},
        disable: () => {},
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
        uniform1i: () => {},
        drawElements: () => {},
        drawArrays: () => {},
        viewport: () => {},
        createFramebuffer: () => ({ name: 'offscreen-fb' }),
        bindFramebuffer: bindFramebufferSpy,
        framebufferTexture2D: () => {},
        framebufferRenderbuffer: () => {},
        createRenderbuffer: () => ({}),
        bindRenderbuffer: () => {},
        renderbufferStorage: () => {},
        createTexture: () => ({}),
        bindTexture: () => {},
        texImage2D: () => {},
        texParameteri: () => {},
        activeTexture: () => {},
        canvas: { width: 800, height: 600, clientWidth: 800, clientHeight: 600 },
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
        FRAMEBUFFER: 0x8d40,
        COLOR_ATTACHMENT0: 0x8ce0,
        DEPTH_ATTACHMENT: 0x8d00,
        RENDERBUFFER: 0x8d41,
        TEXTURE_2D: 0x0de1,
        TEXTURE0: 0x84c0,
        TEXTURE_MIN_FILTER: 0x2801,
        TEXTURE_MAG_FILTER: 0x2800,
        TEXTURE_WRAP_S: 0x2802,
        TEXTURE_WRAP_T: 0x2803,
        LINEAR: 0x2601,
        CLAMP_TO_EDGE: 0x812f,
        RGBA: 0x1908,
        UNSIGNED_BYTE: 0x1401,
        DEPTH_COMPONENT16: 0x81a5,
      } as unknown as WebGL2RenderingContext;

      const mockViews: WorldStateViews = {
        actors: { x: new Float32Array([0]), y: new Float32Array([0]), z: new Float32Array([-2]), facing: new Float32Array([0]), sprite_id: new Float32Array([1]), active: new Float32Array([1]), count: 1 },
        lights: { x: new Float32Array([0]), y: new Float32Array([0]), z: new Float32Array([0]), r: new Float32Array([1]), g: new Float32Array([1]), b: new Float32Array([1]), intensity: new Float32Array([1]), active: new Float32Array([1]), count: 1 },
        tiles: { x: new Float32Array([0]), y: new Float32Array([0]), z: new Float32Array([-1]), tile_id: new Float32Array([1]), variant: new Float32Array([0]), count: 1 },
        camera: { x: new Float32Array([0]), y: new Float32Array([1.5]), z: new Float32Array([3.5]), yaw: new Float32Array([0]), pitch: new Float32Array([0]), count: 1 },
      };

      const loop = createLoop(mockGl, {
        getViews: () => mockViews,
        resolutionConfig: { maxDevicePixelRatio: 1.0, maxPixels: Infinity },
      });

      expect(loop).toBeDefined();
      expect(typeof loop.start).toBe('function');
      expect(typeof loop.stop).toBe('function');
      expect(loop.getOffscreenDimensions()).toEqual({ width: 800, height: 600 });
    });
  });
});
