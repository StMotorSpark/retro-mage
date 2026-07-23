import { mat4Create, mat4Invert, mat4Multiply } from '../matrix.js';

const VS_SOURCE = `#version 300 es
in vec2 a_position;

uniform mat4 u_inv_view_proj;

out vec3 v_ray_dir;

void main() {
  vec4 far_pos = u_inv_view_proj * vec4(a_position, 1.0, 1.0);
  v_ray_dir = far_pos.xyz / far_pos.w;
  gl_Position = vec4(a_position, 0.9999, 1.0);
}
`;

const FS_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_ray_dir;

uniform vec3 u_zenith_color;
uniform vec3 u_horizon_color;

out vec4 fragColor;

void main() {
  vec3 ray = normalize(v_ray_dir);
  float height = clamp(ray.y * 0.5 + 0.5, 0.0, 1.0);
  // Atmospheric scattering gradient
  vec3 skyColor = mix(u_horizon_color, u_zenith_color, pow(height, 0.6));
  fragColor = vec4(skyColor, 1.0);
}
`;

export interface SkyboxRenderer {
  setColors(zenith: readonly [number, number, number], horizon: readonly [number, number, number]): void;
  render(viewMatrix: Float32Array, projMatrix: Float32Array): void;
}

export function createSkyboxRenderer(gl: WebGL2RenderingContext): SkyboxRenderer {
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, VS_SOURCE);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    throw new Error(`Skybox VS compile error: ${gl.getShaderInfoLog(vs)}`);
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, FS_SOURCE);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    throw new Error(`Skybox FS compile error: ${gl.getShaderInfoLog(fs)}`);
  }

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Skybox program link error: ${gl.getProgramInfoLog(program)}`);
  }

  const aPosition = gl.getAttribLocation(program, 'a_position');
  const uInvViewProj = gl.getUniformLocation(program, 'u_inv_view_proj');
  const uZenithColor = gl.getUniformLocation(program, 'u_zenith_color');
  const uHorizonColor = gl.getUniformLocation(program, 'u_horizon_color');

  // Fullscreen quad in NDC
  const quadVertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  let zenithColor: readonly [number, number, number] = [0.2, 0.45, 0.85]; // Deep atmospheric blue
  let horizonColor: readonly [number, number, number] = [0.75, 0.85, 0.95]; // Soft horizon glow

  const viewNoTrans = mat4Create();
  const viewProj = mat4Create();
  const invViewProj = mat4Create();

  return {
    setColors(zenith: readonly [number, number, number], horizon: readonly [number, number, number]): void {
      zenithColor = zenith;
      horizonColor = horizon;
    },
    render(viewMatrix: Float32Array, projMatrix: Float32Array): void {
      // Strip translation from viewMatrix so skybox stays centered around camera
      viewNoTrans.set(viewMatrix);
      viewNoTrans[12] = 0;
      viewNoTrans[13] = 0;
      viewNoTrans[14] = 0;

      // Multiply projMatrix * viewNoTrans
      mat4Multiply(viewProj, projMatrix, viewNoTrans);
      if (!mat4Invert(invViewProj, viewProj)) {
        return;
      }

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.uniformMatrix4fv(uInvViewProj, false, invViewProj);
      gl.uniform3fv(uZenithColor, new Float32Array(zenithColor));
      gl.uniform3fv(uHorizonColor, new Float32Array(horizonColor));

      gl.depthMask(false);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.depthMask(true);

      gl.bindVertexArray(null);
    },
  };
}
