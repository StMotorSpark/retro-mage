import type { ActorsView } from '../world-state/types.js';
import { mat4Create } from '../matrix.js';

const VS_SOURCE = `#version 300 es
in vec3 a_position;
in vec2 a_uv;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

out vec2 v_uv;

void main() {
  v_uv = a_uv;
  gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
}
`;

const FS_SOURCE = `#version 300 es
precision mediump float;

in vec2 v_uv;

uniform vec4 u_color;
uniform sampler2D u_texture;
uniform bool u_use_texture;

out vec4 fragColor;

void main() {
  vec4 baseColor = u_use_texture ? texture(u_texture, v_uv) : u_color;
  if (baseColor.a < 0.1) {
    discard;
  }
  fragColor = baseColor;
}
`;

export interface SpriteRenderer {
  setTexture(spriteId: number, texture: WebGLTexture): void;
  render(actors: ActorsView, viewMatrix: Float32Array, projMatrix: Float32Array): void;
}

export function createSpriteRenderer(gl: WebGL2RenderingContext): SpriteRenderer {
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, VS_SOURCE);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, FS_SOURCE);
  gl.compileShader(fs);

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  const aPosition = gl.getAttribLocation(program, 'a_position');
  const aUv = gl.getAttribLocation(program, 'a_uv');
  const uProjection = gl.getUniformLocation(program, 'u_projection');
  const uView = gl.getUniformLocation(program, 'u_view');
  const uModel = gl.getUniformLocation(program, 'u_model');
  const uColor = gl.getUniformLocation(program, 'u_color');
  const uTexture = gl.getUniformLocation(program, 'u_texture');
  const uUseTexture = gl.getUniformLocation(program, 'u_use_texture');

  const textures = new Map<number, WebGLTexture>();

  // Billboard quad geometry (width 1.2, height 2.4, anchored at bottom y=0)
  // Position (3), UV (2)
  const vertices = new Float32Array([
    -0.6, 0.0, 0.0,  0.0, 1.0,
     0.6, 0.0, 0.0,  1.0, 1.0,
     0.6, 2.4, 0.0,  1.0, 0.0,
    -0.6, 2.4, 0.0,  0.0, 0.0,
  ]);

  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const ibo = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const stride = 5 * Float32Array.BYTES_PER_ELEMENT;
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, stride, 0);

  if (aUv !== -1) {
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
  }

  gl.bindVertexArray(null);

  const modelMatrix = mat4Create();

  return {
    setTexture(spriteId: number, texture: WebGLTexture): void {
      textures.set(spriteId, texture);
    },
    render(actors: ActorsView, viewMatrix: Float32Array, projMatrix: Float32Array): void {
      if (actors.count === 0) return;

      // Extract camera world position from viewMatrix
      const v0 = viewMatrix[0] ?? 0;
      const v1 = viewMatrix[1] ?? 0;
      const v2 = viewMatrix[2] ?? 0;
      const v4 = viewMatrix[4] ?? 0;
      const v5 = viewMatrix[5] ?? 0;
      const v6 = viewMatrix[6] ?? 0;
      const v8 = viewMatrix[8] ?? 0;
      const v9 = viewMatrix[9] ?? 0;
      const v10 = viewMatrix[10] ?? 0;
      const v12 = viewMatrix[12] ?? 0;
      const v13 = viewMatrix[13] ?? 0;
      const v14 = viewMatrix[14] ?? 0;

      const cx = -(v0 * v12 + v1 * v13 + v2 * v14);
      const cy = -(v4 * v12 + v5 * v13 + v6 * v14);
      const cz = -(v8 * v12 + v9 * v13 + v10 * v14);

      // Collect active actors and compute squared distance to camera for depth sorting
      const activeActors: Array<{ index: number; x: number; y: number; z: number; spriteId: number; distSq: number }> = [];

      for (let i = 0; i < actors.count; i++) {
        const active = actors.active[i] ?? 0;
        if (active <= 0) continue;

        const ax = actors.x[i] ?? 0;
        const ay = actors.y[i] ?? 0;
        const az = actors.z[i] ?? 0;
        const spriteId = actors.sprite_id[i] ?? 0;

        const dx = ax - cx;
        const dy = ay - cy;
        const dz = az - cz;
        const distSq = dx * dx + dy * dy + dz * dz;

        activeActors.push({ index: i, x: ax, y: ay, z: az, spriteId, distSq });
      }

      if (activeActors.length === 0) return;

      // Painter's algorithm: sort back-to-front (farthest actor first)
      activeActors.sort((a, b) => b.distSq - a.distSq);

      // Y-axis billboarding rotation vector from viewMatrix
      let rx = v0;
      let rz = v8;
      const len = Math.hypot(rx, rz);
      if (len > 1e-5) {
        rx /= len;
        rz /= len;
      } else {
        rx = 1.0;
        rz = 0.0;
      }

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);

      gl.uniformMatrix4fv(uProjection, false, projMatrix);
      gl.uniformMatrix4fv(uView, false, viewMatrix);

      let currentSpriteId: number | null = null;

      for (const actor of activeActors) {
        // Build Y-axis billboarding model matrix
        modelMatrix[0] = rx;
        modelMatrix[1] = 0.0;
        modelMatrix[2] = rz;
        modelMatrix[3] = 0.0;

        modelMatrix[4] = 0.0;
        modelMatrix[5] = 1.0;
        modelMatrix[6] = 0.0;
        modelMatrix[7] = 0.0;

        modelMatrix[8] = -rz;
        modelMatrix[9] = 0.0;
        modelMatrix[10] = rx;
        modelMatrix[11] = 0.0;

        modelMatrix[12] = actor.x;
        modelMatrix[13] = actor.y;
        modelMatrix[14] = actor.z;
        modelMatrix[15] = 1.0;

        gl.uniformMatrix4fv(uModel, false, modelMatrix);

        if (actor.spriteId !== currentSpriteId) {
          currentSpriteId = actor.spriteId;
          const tex = textures.get(actor.spriteId);
          if (tex) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(uTexture, 0);
            gl.uniform1i(uUseTexture, 1);
          } else {
            gl.uniform1i(uUseTexture, 0);
            if (actor.spriteId === 1) {
              gl.uniform4f(uColor, 0.15, 0.55, 0.25, 1.0); // Pine green
            } else if (actor.spriteId === 2) {
              gl.uniform4f(uColor, 0.2, 0.8, 0.9, 1.0); // Bright Cyan
            } else {
              gl.uniform4f(uColor, 0.9, 0.8, 0.1, 1.0); // Bright Yellow
            }
          }
        }

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      }

      gl.bindVertexArray(null);
    },
  };
}
