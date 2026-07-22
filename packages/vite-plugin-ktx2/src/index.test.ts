import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { vitePluginKtx2 } from './index.js';

describe('vitePluginKtx2', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vite-plugin-ktx2-test-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates plugin with default name and hooks', () => {
    const plugin = vitePluginKtx2();
    expect(plugin.name).toBe('vite-plugin-ktx2');
    expect(plugin.configureServer).toBeDefined();
    expect(plugin.buildStart).toBeDefined();
  });

  it('compresses PNG files to KTX2 on buildStart', async () => {
    const assetsDir = path.join(tmpDir, 'assets', 'textures');
    await fs.promises.mkdir(assetsDir, { recursive: true });

    // Create a 16x16 test PNG
    const pngBuffer = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    await fs.promises.writeFile(path.join(assetsDir, 'test.png'), pngBuffer);

    const emittedFiles: Array<{ fileName: string; source: Uint8Array }> = [];
    const mockContext = {
      emitFile(file: { type: string; fileName: string; source: Uint8Array }) {
        emittedFiles.push(file);
      },
    };

    const plugin = vitePluginKtx2({ assetsDir: 'assets/textures' });
    if (typeof plugin.configResolved === 'function') {
      // @ts-expect-error partial config mock
      plugin.configResolved({ root: tmpDir });
    }

    if (typeof plugin.buildStart === 'function') {
      await plugin.buildStart.call(mockContext as any, {} as any);
    }

    expect(emittedFiles.length).toBe(1);
    expect(emittedFiles[0]!.fileName).toBe('assets/textures/test.ktx2');
    expect(emittedFiles[0]!.source).toBeInstanceOf(Uint8Array);
    expect(emittedFiles[0]!.source.byteLength).toBeGreaterThan(0);
  });
});
