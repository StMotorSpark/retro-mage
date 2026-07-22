import { loadKtx2Texture } from 'render';

const vsSource = `#version 300 es
in vec2 aPos;
in vec2 aUv;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const fsSource = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
void main() {
  outColor = texture(uTex, vUv);
}
`;

export class TextureQuadDemo {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private aPosLoc = -1;
  private aUvLoc = -1;
  private uTexLoc: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  private initShader(): void {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('TextureQuadDemo shader link error:', gl.getProgramInfoLog(prog));
      return;
    }

    this.program = prog;
    this.aPosLoc = gl.getAttribLocation(prog, 'aPos');
    this.aUvLoc = gl.getAttribLocation(prog, 'aUv');
    this.uTexLoc = gl.getUniformLocation(prog, 'uTex');

    // A small floating preview quad in top-right corner of viewport
    // x: 0.5 to 0.95, y: 0.5 to 0.95
    // prettier-ignore
    const quadData = new Float32Array([
      0.5,  0.5, 0, 1,
      0.95, 0.5, 1, 1,
      0.95, 0.95, 1, 0,
      0.5,  0.5, 0, 1,
      0.95, 0.95, 1, 0,
      0.5,  0.95, 0, 0,
    ]);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);
    this.quadBuffer = buf;
  }

  async loadTexture(url: string): Promise<void> {
    const gl = this.gl;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
      }

      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Check for KTX2 magic header: 0xAB 0x4B 0x54 0x58 0x20 0x32 0x30
      const isKtx2 =
        bytes.length >= 7 &&
        bytes[0] === 0xab &&
        bytes[1] === 0x4b &&
        bytes[2] === 0x54 &&
        bytes[3] === 0x58;

      if (isKtx2) {
        const result = await loadKtx2Texture(gl, bytes);
        this.texture = result.texture;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } else {
        // Fallback for raw PNG (e.g. dev server passthrough)
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        const blob = new Blob([buffer], { type: 'image/png' });
        const bitmap = await createImageBitmap(blob);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.texture = tex;
      }

      this.initShader();
    } catch (err) {
      console.error('Failed to load demo texture:', err);
    }
  }

  render(): void {
    if (!this.program || !this.quadBuffer || !this.texture) return;
    const gl = this.gl;

    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.aPosLoc);
    gl.vertexAttribPointer(this.aPosLoc, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(this.aUvLoc);
    gl.vertexAttribPointer(this.aUvLoc, 2, gl.FLOAT, false, 16, 8);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (this.uTexLoc) {
      gl.uniform1i(this.uTexLoc, 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.DEPTH_TEST);
  }
}
