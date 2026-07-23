import type { TilesView } from '../world-state/types.js';
import { mat4Translation, mat4Create } from '../matrix.js';

const VS_SOURCE = `#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

out vec3 v_normal;
out vec2 v_uv;

void main() {
  v_normal = a_normal;
  v_uv = a_uv;
  gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
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
  setTexture(tileId: number, texture: WebGLTexture): void;
  render(tiles: TilesView, viewMatrix: Float32Array, projMatrix: Float32Array): void;
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

  return {
    setTexture(tileId: number, texture: WebGLTexture): void {
      textures.set(tileId, texture);
    },
    render(tiles: TilesView, viewMatrix: Float32Array, projMatrix: Float32Array): void {
      if (tiles.count === 0) return;

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.uniformMatrix4fv(uProjection, false, projMatrix);
      gl.uniformMatrix4fv(uView, false, viewMatrix);

      let currentTexTileId: number | null = null;

      for (let i = 0; i < tiles.count; i++) {
        const x = tiles.x[i] ?? 0;
        const y = tiles.y[i] ?? 0;
        const z = tiles.z[i] ?? 0;
        const tileId = tiles.tile_id[i] ?? 0;

        mat4Translation(modelMatrix, x, y, z);
        gl.uniformMatrix4fv(uModel, false, modelMatrix);

        if (tileId !== currentTexTileId) {
          currentTexTileId = tileId;
          const tex = textures.get(tileId);
          if (tex) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(uTexture, 0);
            gl.uniform1i(uUseTexture, 1);
          } else {
            gl.uniform1i(uUseTexture, 0);
            // Color fallback based on tile_id
            if (tileId === 2) {
              gl.uniform4f(uColor, 0.6, 0.4, 0.25, 1.0); // Wood brown
            } else if (tileId === 3) {
              gl.uniform4f(uColor, 0.2, 0.5, 0.3, 1.0); // Moss green
            } else {
              gl.uniform4f(uColor, 0.5, 0.55, 0.6, 1.0); // Stone gray
            }
          }
        }

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
      }

      gl.bindVertexArray(null);
    },
  };
}

