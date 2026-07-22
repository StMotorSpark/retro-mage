import type { ActorsView } from '../world-state/types.js';
import { mat4Translation, mat4Create } from '../matrix.js';

const VS_SOURCE = `#version 300 es
in vec3 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

void main() {
  gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
}
`;

const FS_SOURCE = `#version 300 es
precision mediump float;

uniform vec4 u_color;
out vec4 fragColor;

void main() {
  fragColor = u_color;
}
`;

export interface SpriteRenderer {
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
  const uProjection = gl.getUniformLocation(program, 'u_projection');
  const uView = gl.getUniformLocation(program, 'u_view');
  const uModel = gl.getUniformLocation(program, 'u_model');
  const uColor = gl.getUniformLocation(program, 'u_color');

  // Vertical quad standing on ground (width 0.8, height 1.4)
  const vertices = new Float32Array([
    -0.4, 0.0, 0.0,
     0.4, 0.0, 0.0,
     0.4, 1.4, 0.0,
    -0.4, 1.4, 0.0,
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

  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);

  gl.bindVertexArray(null);

  const modelMatrix = mat4Create();

  return {
    render(actors: ActorsView, viewMatrix: Float32Array, projMatrix: Float32Array): void {
      if (actors.count === 0) return;

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.uniformMatrix4fv(uProjection, false, projMatrix);
      gl.uniformMatrix4fv(uView, false, viewMatrix);

      for (let i = 0; i < actors.count; i++) {
        const active = actors.active[i] ?? 0;
        if (active <= 0) continue;

        const x = actors.x[i] ?? 0;
        const y = actors.y[i] ?? 0;
        const z = actors.z[i] ?? 0;
        const spriteId = actors.sprite_id[i] ?? 0;

        mat4Translation(modelMatrix, x, y, z);
        gl.uniformMatrix4fv(uModel, false, modelMatrix);

        // Color based on sprite_id
        if (spriteId === 1) {
          gl.uniform4f(uColor, 0.9, 0.2, 0.2, 1.0); // Bright Red
        } else if (spriteId === 2) {
          gl.uniform4f(uColor, 0.2, 0.8, 0.9, 1.0); // Bright Cyan
        } else {
          gl.uniform4f(uColor, 0.9, 0.8, 0.1, 1.0); // Bright Yellow
        }

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      }

      gl.bindVertexArray(null);
    },
  };
}
