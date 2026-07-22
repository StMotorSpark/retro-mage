import { load } from '@loaders.gl/core';
import { CompressedTextureLoader } from '@loaders.gl/textures';

type LogKind = 'info' | 'error';

const logEl = document.getElementById('log') as HTMLDivElement;

function log(msg: string, kind: LogKind = 'info') {
  const line = document.createElement('div');
  if (kind === 'error') line.className = 'err';
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
  // eslint-disable-next-line no-console
  kind === 'error' ? console.error(msg) : console.log(msg);
}

window.addEventListener('error', (e) => log(`window.onerror: ${e.message}`, 'error'));
window.addEventListener('unhandledrejection', (e) => log(`unhandledrejection: ${e.reason}`, 'error'));

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2');

if (!gl) {
  log('FATAL: WebGL2 context could not be created on this device/browser.', 'error');
  throw new Error('no webgl2');
}

log(`WebGL2 context OK. Renderer: ${gl.getParameter(gl.RENDERER)}`);
log(`Vendor: ${gl.getParameter(gl.VENDOR)}`);

// Report which compressed-texture extensions this browser/device actually exposes.
const COMPRESSED_EXTENSIONS = [
  'WEBGL_compressed_texture_s3tc',
  'WEBGL_compressed_texture_s3tc_srgb',
  'WEBGL_compressed_texture_etc',
  'WEBGL_compressed_texture_etc1',
  'WEBGL_compressed_texture_pvrtc',
  'WEBGL_compressed_texture_astc',
  'EXT_texture_compression_bptc',
  'EXT_texture_compression_rgtc',
];
const exposed = COMPRESSED_EXTENSIONS.filter((name) => gl.getExtension(name) !== null);
log(`Compressed-texture extensions exposed: ${exposed.length ? exposed.join(', ') : '(none)'}`);

// --- Minimal quad shader program ---
const vsSource = `#version 300 es
in vec2 aPos;
in vec2 aUv;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const fsSource = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
void main() {
  outColor = texture(uTex, vUv);
}`;

function compileShader(type: number, src: string): WebGLShader {
  const shader = gl!.createShader(type)!;
  gl!.shaderSource(shader, src);
  gl!.compileShader(shader);
  if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
    const info = gl!.getShaderInfoLog(shader);
    gl!.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

const program = gl.createProgram()!;
gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vsSource));
gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
}
gl.useProgram(program);

// Two quads side by side: left = wall texture, right = floor texture.
// prettier-ignore
const LEFT_QUAD = new Float32Array([
  -0.98, -0.9,  0, 0,
  -0.02, -0.9,  1, 0,
  -0.02,  0.9,  1, 1,
  -0.98, -0.9,  0, 0,
  -0.02,  0.9,  1, 1,
  -0.98,  0.9,  0, 1,
]);
// prettier-ignore
const RIGHT_QUAD = new Float32Array([
   0.02, -0.9,  0, 0,
   0.98, -0.9,  1, 0,
   0.98,  0.9,  1, 1,
   0.02, -0.9,  0, 0,
   0.98,  0.9,  1, 1,
   0.02,  0.9,  0, 1,
]);

function makeQuadBuffer(data: Float32Array) {
  const buf = gl!.createBuffer()!;
  gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
  gl!.bufferData(gl!.ARRAY_BUFFER, data, gl!.STATIC_DRAW);
  return buf;
}

const leftBuf = makeQuadBuffer(LEFT_QUAD);
const rightBuf = makeQuadBuffer(RIGHT_QUAD);

const aPosLoc = gl.getAttribLocation(program, 'aPos');
const aUvLoc = gl.getAttribLocation(program, 'aUv');

function drawQuad(buf: WebGLBuffer, tex: WebGLTexture) {
  gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
  gl!.enableVertexAttribArray(aPosLoc);
  gl!.vertexAttribPointer(aPosLoc, 2, gl!.FLOAT, false, 16, 0);
  gl!.enableVertexAttribArray(aUvLoc);
  gl!.vertexAttribPointer(aUvLoc, 2, gl!.FLOAT, false, 16, 8);
  gl!.activeTexture(gl!.TEXTURE0);
  gl!.bindTexture(gl!.TEXTURE_2D, tex);
  gl!.uniform1i(gl!.getUniformLocation(program, 'uTex'), 0);
  gl!.drawArrays(gl!.TRIANGLES, 0, 6);
}

interface TextureLevel {
  width: number;
  height: number;
  data: Uint8Array;
  compressed: boolean;
  format?: number;
}

async function loadKtx2Texture(url: string, label: string): Promise<WebGLTexture | null> {
  log(`[${label}] loading ${url} ...`);
  try {
    const result = (await load(url, CompressedTextureLoader, {
      worker: false,
      'compressed-texture': { useBasis: true },
      basis: { format: 'auto' },
    })) as TextureLevel[];

    log(`[${label}] raw transcoder result: ${JSON.stringify({ isArray: Array.isArray(result), levelCount: result?.length })}`);
    const levels = result;
    if (!levels || levels.length === 0) {
      throw new Error('no mip levels returned from transcoder');
    }

    const tex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, tex);

    // Out of scope for this spike: full mipmap chain upload/tuning (see task Out of Scope).
    // Upload base level only and use non-mipmapped filtering so an incomplete/rounded
    // mip chain doesn't cause WebGL to sample the texture as black (a texture with a
    // partially-uploaded mip chain is treated as "incomplete" and renders black).
    const base: TextureLevel = levels[0]!;
    if (base.compressed && base.format !== undefined) {
      gl!.compressedTexImage2D(gl!.TEXTURE_2D, 0, base.format, base.width, base.height, 0, base.data);
    } else {
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, base.width, base.height, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, base.data);
    }

    const sample = base.data.slice(0, 64);
    let nonZero = 0;
    for (const b of sample) if (b !== 0) nonZero++;
    const mid = base.data.slice(Math.floor(base.data.length / 2), Math.floor(base.data.length / 2) + 64);
    let midNonZero = 0;
    for (const b of mid) if (b !== 0) midNonZero++;
    log(
      `[${label}] transcoded ok. levels=${levels.length} base=${base.width}x${base.height} compressed=${base.compressed} format=${base.format ?? 'RGBA (uncompressed fallback)'} dataBytes=${base.data.length} nonZeroInFirst64=${nonZero} nonZeroMid64=${midNonZero}`
    );

    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);

    const glErr = gl!.getError();
    if (glErr !== gl!.NO_ERROR) {
      log(`[${label}] gl.getError() after upload: 0x${glErr.toString(16)}`, 'error');
    }

    log(`[${label}] PASS — texture uploaded to WebGL2.`);
    return tex;
  } catch (err) {
    log(`[${label}] FAIL — ${(err as Error).message}`, 'error');
    return null;
  }
}

async function main() {
  gl!.clearColor(0.07, 0.07, 0.07, 1);
  gl!.clear(gl!.COLOR_BUFFER_BIT);

  const wallTex = await loadKtx2Texture('/assets/wall.ktx2', 'wall');
  const floorTex = await loadKtx2Texture('/assets/floor.ktx2', 'floor');

  gl!.clear(gl!.COLOR_BUFFER_BIT);
  if (wallTex) drawQuad(leftBuf, wallTex);
  if (floorTex) drawQuad(rightBuf, floorTex);

  log('Done. Left = wall.ktx2, Right = floor.ktx2. Inspect visually for garbling/black output.');
}

main();
