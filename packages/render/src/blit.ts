export interface BlitPass {
  render(texture: WebGLTexture | null, targetWidth: number, targetHeight: number): void;
  dispose(): void;
}

const BLIT_VS = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const BLIT_FS = `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
out vec4 fragColor;
void main() {
  fragColor = texture(u_texture, v_texCoord);
}
`;

export function createBlitPass(gl: WebGL2RenderingContext): BlitPass {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  if (vs) {
    gl.shaderSource(vs, BLIT_VS);
    gl.compileShader(vs);
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (fs) {
    gl.shaderSource(fs, BLIT_FS);
    gl.compileShader(fs);
  }

  const program = gl.createProgram();
  if (program && vs && fs) {
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
  }

  const posLoc = program ? gl.getAttribLocation(program, 'a_position') : -1;
  const texLoc = program ? gl.getUniformLocation(program, 'u_texture') : null;

  const vao = gl.createVertexArray ? gl.createVertexArray() : null;
  const vbo = gl.createBuffer ? gl.createBuffer() : null;

  const quadPositions = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);

  if (vao) gl.bindVertexArray(vao);
  if (vbo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadPositions, gl.STATIC_DRAW);
  }
  if (posLoc !== -1 && posLoc !== undefined && posLoc !== null) {
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  }
  if (vao) gl.bindVertexArray(null);

  return {
    render(texture: WebGLTexture | null, targetWidth: number, targetHeight: number): void {
      // Bind default framebuffer (null) for final output to canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, targetWidth, targetHeight);
      gl.disable(gl.DEPTH_TEST);

      if (program) {
        gl.useProgram(program);
      }
      if (texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
      }
      if (texLoc !== null) {
        gl.uniform1i(texLoc, 0);
      }

      if (vao) gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (vao) gl.bindVertexArray(null);
    },
    dispose(): void {
      if (program) gl.deleteProgram(program);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      if (vbo) gl.deleteBuffer(vbo);
      if (vao) gl.deleteVertexArray(vao);
    },
  };
}
