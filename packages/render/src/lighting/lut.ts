import type { EmissiveConfig, LutConfig } from '../materials/types.js';

export interface GeneratedLut { width: number; height: number; data: Uint8Array; }

function color(value: string): [number, number, number] {
  const s = value.trim().replace(/^#/, '');
  const n = s.length === 3 ? s.split('').map(x => x + x).join('') : s;
  const v = Number.parseInt(n, 16);
  if (!Number.isFinite(v) || n.length !== 6) return [255, 0, 255];
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Pure, stable LUT generator. Same config always yields byte-identical output. */
export function generateLut(config: LutConfig): GeneratedLut {
  const bands = Math.max(1, Math.min(32, Math.floor(config.intensityBandCount)));
  const palette = config.paletteColors.length ? config.paletteColors.map(color) : [[255, 0, 255]];
  const data = new Uint8Array(256 * bands * 4);
  const ambient = Math.max(0, Math.min(1, config.ambientLevel));
  for (let y = 0; y < bands; y++) for (let x = 0; x < 256; x++) {
    const light = Math.max(ambient, bands === 1 ? ambient : y / (bands - 1));
    const p = palette[Math.min(palette.length - 1, Math.floor(x * palette.length / 256))]!;
    const i = (y * 256 + x) * 4;
    let r = p[0]!, g = p[1]!, b = p[2]!;
    if (config.rgbLightColorMode === 'multiply') { r *= light; g *= light; b *= light; }
    else if (config.rgbLightColorMode === 'tint') { r *= light; g *= light; b *= light; }
    else { r = p[0]! * (light > 0 ? 1 : 0); g = p[1]! * (light > 0 ? 1 : 0); b = p[2]! * (light > 0 ? 1 : 0); }
    data[i] = Math.round(r); data[i + 1] = Math.round(g); data[i + 2] = Math.round(b); data[i + 3] = 255;
  }
  return { width: 256, height: bands, data };
}

export function applyEmissive(config: EmissiveConfig, base: [number, number, number]): [number, number, number] {
  const e = color(config.color), amount = Math.max(0, config.intensity);
  return [Math.min(255, Math.round(base[0] + e[0] * amount)), Math.min(255, Math.round(base[1] + e[1] * amount)), Math.min(255, Math.round(base[2] + e[2] * amount))];
}

export function uploadLut(gl: WebGL2RenderingContext, config: LutConfig): WebGLTexture {
  const lut = generateLut(config), texture = gl.createTexture();
  if (!texture) throw new Error('Failed to create LUT WebGLTexture');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, lut.width, lut.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut.data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}
