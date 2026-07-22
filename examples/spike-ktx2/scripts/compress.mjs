// One-time manual compression script for task:16 (texture-compression-spike).
// Converts the source PNGs in ../assets to UASTC-mode .ktx2 using the ktx2-encoder
// npm package (JS/WASM build of the Basis Universal encoder — no native toktx/basisu
// binary install required, works cross-platform in Node).
//
// Usage: pnpm --filter spike-ktx2 run compress

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'public', 'assets');

const sources = [
  { in: 'example-wall-texture.png', out: 'wall.ktx2' },
  { in: 'example-floor-texture.png', out: 'floor.ktx2' },
];

async function imageDecoder(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

async function main() {
  for (const { in: inFile, out: outFile } of sources) {
    const srcPath = path.join(assetsDir, inFile);
    const outPath = path.join(assetsDir, outFile);
    console.log(`Compressing ${inFile} -> ${outFile} (UASTC, mipmaps)...`);
    const buffer = new Uint8Array(await readFile(srcPath));
    const ktx2Data = await encodeToKTX2(buffer, {
      isUASTC: true,
      generateMipmap: true,
      needSupercompression: false,
      imageDecoder,
    });
    await writeFile(outPath, ktx2Data);
    console.log(`  wrote ${outPath} (${ktx2Data.byteLength} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
