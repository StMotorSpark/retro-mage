import type { LightsView, TilesView } from '../world-state/types.js';
import { mat4Translation, mat4Create } from '../matrix.js';
import { collectActiveLights, evaluateLighting } from '../lighting/index.js';

const VS_SOURCE = `#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;
uniform float u_direction;

out vec3 v_normal;
out vec2 v_uv;

void main() {
  v_normal = a_normal;
  v_uv = a_uv;
  vec3 pos = a_position;
  if (pos.y > 0.5) {
    if (u_direction == 1.0) pos.y = 0.5 - a_position.z;
    else if (u_direction == 2.0) pos.y = 0.5 + a_position.z;
    else if (u_direction == 3.0) pos.y = 0.5 + a_position.x;
    else if (u_direction == 4.0) pos.y = 0.5 - a_position.x;
  }
  gl_Position = u_projection * u_view * u_model * vec4(pos, 1.0);
}
`;

const FS_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec2 v_uv;

uniform vec4 u_color;
uniform sampler2D u_texture;
uniform bool u_use_texture;

out vec4 fragColor;

void main() {
  vec3 lightDir = normalize(vec3(0.4, 1.0, 0.3));
  float diff = max(dot(normalize(v_normal), lightDir), 0.35);
  vec4 baseColor = u_use_texture ? texture(u_texture, v_uv) : u_color;
  fragColor = vec4(baseColor.rgb * diff, baseColor.a);
}
`;

export interface TileRenderer {
  /** Registers a texture under a stable scene material ID. */
  setTexture(materialId: number, texture: WebGLTexture): void;
  render(
    tiles: TilesView,
    viewMatrix: Float32Array,
    projMatrix: Float32Array,
    lights?: LightsView,
    ambientLight?: number,
  ): void;
}

export function createTileRenderer(gl: WebGL2RenderingContext): TileRenderer {
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
  const aNormal = gl.getAttribLocation(program, 'a_normal');
  const aUv = gl.getAttribLocation(program, 'a_uv');
  const uProjection = gl.getUniformLocation(program, 'u_projection');
  const uView = gl.getUniformLocation(program, 'u_view');
  const uModel = gl.getUniformLocation(program, 'u_model');
  const uColor = gl.getUniformLocation(program, 'u_color');
  const uTexture = gl.getUniformLocation(program, 'u_texture');
  const uUseTexture = gl.getUniformLocation(program, 'u_use_texture');
  const uDirection = gl.getUniformLocation(program, 'u_direction');

  const textures = new Map<number, WebGLTexture>();

  // 1x1x1 Unit cube geometry centered at (0, 0.5, 0)
  // Position (3), Normal (3), UV (2)
  const vertices = new Float32Array([
    // Front (z = 0.5)
    -0.5, 0,  0.5,  0,  0,  1,  0, 1,
     0.5, 0,  0.5,  0,  0,  1,  1, 1,
     0.5, 1,  0.5,  0,  0,  1,  1, 0,
    -0.5, 1,  0.5,  0,  0,  1,  0, 0,
    // Back (z = -0.5)
    -0.5, 0, -0.5,  0,  0, -1,  1, 1,
    -0.5, 1, -0.5,  0,  0, -1,  1, 0,
     0.5, 1, -0.5,  0,  0, -1,  0, 0,
     0.5, 0, -0.5,  0,  0, -1,  0, 1,
    // Top (y = 1)
    -0.5, 1, -0.5,  0,  1,  0,  0, 0,
    -0.5, 1,  0.5,  0,  1,  0,  0, 1,
     0.5, 1,  0.5,  0,  1,  0,  1, 1,
     0.5, 1, -0.5,  0,  1,  0,  1, 0,
    // Bottom (y = 0)
    -0.5, 0, -0.5,  0, -1,  0,  0, 1,
     0.5, 0, -0.5,  0, -1,  0,  1, 1,
     0.5, 0,  0.5,  0, -1,  0,  1, 0,
    -0.5, 0,  0.5,  0, -1,  0,  0, 0,
    // Right (x = 0.5)
     0.5, 0, -0.5,  1,  0,  0,  1, 1,
     0.5, 1, -0.5,  1,  0,  0,  1, 0,
     0.5, 1,  0.5,  1,  0,  0,  0, 0,
     0.5, 0,  0.5,  1,  0,  0,  0, 1,
    // Left (x = -0.5)
    -0.5, 0, -0.5, -1,  0,  0,  0, 1,
    -0.5, 0,  0.5, -1,  0,  0,  1, 1,
    -0.5, 1,  0.5, -1,  0,  0,  1, 0,
    -0.5, 1, -0.5, -1,  0,  0,  0, 0,
  ]);

  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3, // Front
     4,  5,  6,   4,  6,  7, // Back
     8,  9, 10,   8, 10, 11, // Top
    12, 13, 14,  12, 14, 15, // Bottom
    16, 17, 18,  16, 18, 19, // Right
    20, 21, 22,  20, 22, 23, // Left
  ]);

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const ibo = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const stride = 8 * Float32Array.BYTES_PER_ELEMENT;
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, stride, 0);

  gl.enableVertexAttribArray(aNormal);
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

  if (aUv !== -1) {
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
  }

  gl.bindVertexArray(null);

  const modelMatrix = mat4Create();

  // Base cube geometry is 1 unit tall (y: 0..1). Floor tiles render at that height;
  // solid (wall) tiles are scaled taller so they occlude the player's eye-height view
  // (camera render eye sits at tile elevation + EYE_HEIGHT_OFFSET, see loop.ts) instead
  // of appearing flush with the floor top.
  const WALL_HEIGHT = 3.0;

  return {
    setTexture(materialId: number, texture: WebGLTexture): void {
      textures.set(materialId, texture);
    },
    render(
      tiles: TilesView,
      viewMatrix: Float32Array,
      projMatrix: Float32Array,
      _lights?: LightsView,
      _ambientLight?: number,
    ): void {
      if (tiles.count === 0) return;

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.uniformMatrix4fv(uProjection, false, projMatrix);
      gl.uniformMatrix4fv(uView, false, viewMatrix);

      let currentTexTileId: number | null = null;
      const activeLights = collectActiveLights(_lights);
      const ambient = _ambientLight ?? 0.35;

      for (let i = 0; i < tiles.count; i++) {
        const x = tiles.x[i] ?? 0;
        const y = tiles.y[i] ?? 0;
        const z = tiles.z[i] ?? 0;
        const tileId = tiles.tile_id[i] ?? 0;
        // Scene transport carries material identity separately from authored tile
        // shape. Legacy tile views do not have material_id, so retain tile-ID
        // lookup for them only.
        const textureKey = tiles.material_id ? (tiles.material_id[i] ?? 0) : tileId;
        const solid = tiles.solid[i] ?? 0;
        const dir = tiles.direction ? (tiles.direction[i] ?? 0) : 0;

        mat4Translation(modelMatrix, x, y, z);
        if (solid !== 0) {
          modelMatrix[5] = WALL_HEIGHT; // scale local Y axis before translation offset
        }
        gl.uniformMatrix4fv(uModel, false, modelMatrix);
        if (uDirection !== null) {
          gl.uniform1f(uDirection, dir);
        }

        if (textureKey !== currentTexTileId) {
          currentTexTileId = textureKey;
          const tex = textures.get(textureKey);
          if (tex) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(uTexture, 0);
            gl.uniform1i(uUseTexture, 1);
          } else {
            gl.uniform1i(uUseTexture, 0);
            // Color fallback based on tile_id, shaded from global scene lights.
            const base = tileId === 2 ? [0.6, 0.4, 0.25] : tileId === 3 ? [0.2, 0.5, 0.3] : [0.5, 0.55, 0.6];
            const light = evaluateLighting(x, y + 0.5, z, activeLights, ambient);
            gl.uniform4f(
              uColor,
              (base[0] ?? 0) * (light[0] ?? 0),
              (base[1] ?? 0) * (light[1] ?? 0),
              (base[2] ?? 0) * (light[2] ?? 0),
              1.0,
            );
          }
        }

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
      }

      gl.bindVertexArray(null);
    },
  };
}

