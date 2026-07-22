import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'tinyglobby';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';
import type { Plugin, ViteDevServer } from 'vite';

export interface VitePluginKtx2EncodeOptions {
  isUASTC?: boolean;
  generateMipmap?: boolean;
  needSupercompression?: boolean;
}

export interface VitePluginKtx2Options {
  /**
   * Source directory containing PNG textures, relative to Vite root.
   * @default 'assets/textures'
   */
  assetsDir?: string;

  /**
   * Glob pattern(s) to match PNG texture files within assetsDir.
   * @default '**' + '/*.png'
   */
  include?: string | string[];

  /**
   * Glob pattern(s) to exclude from compression.
   */
  exclude?: string | string[];

  /**
   * Relative output path inside dist directory.
   * Defaults to match `assetsDir`.
   */
  outputDir?: string;

  /**
   * KTX2 encoder options pass-through.
   * Default: { isUASTC: true, generateMipmap: true, needSupercompression: false }
   */
  encodeOptions?: VitePluginKtx2EncodeOptions;
}

async function imageDecoder(buffer: Uint8Array) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

export function vitePluginKtx2(options: VitePluginKtx2Options = {}): Plugin {
  const assetsDir = options.assetsDir ?? 'assets/textures';
  const outputDir = options.outputDir ?? assetsDir;
  const include = options.include ?? '**/*.png';
  const exclude = options.exclude;

  const encodeOpts = {
    isUASTC: options.encodeOptions?.isUASTC ?? true,
    generateMipmap: options.encodeOptions?.generateMipmap ?? true,
    needSupercompression: options.encodeOptions?.needSupercompression ?? false,
  };

  let viteRoot = process.cwd();

  return {
    name: 'vite-plugin-ktx2',

    configResolved(config) {
      viteRoot = config.root;
    },

    configureServer(server: ViteDevServer) {
      const absAssetsDir = path.resolve(viteRoot, assetsDir);
      // Normalize URL prefix with leading and trailing slashes
      let urlPrefix = outputDir;
      if (!urlPrefix.startsWith('/')) urlPrefix = '/' + urlPrefix;
      if (!urlPrefix.endsWith('/')) urlPrefix = urlPrefix + '/';

      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();

        const urlObj = new URL(req.url, 'http://localhost');
        const pathname = urlObj.pathname;

        if (pathname.startsWith(urlPrefix)) {
          const relativePath = pathname.slice(urlPrefix.length);
          // If requesting .ktx2 or .png, serve the raw source .png from assetsDir
          let pngRelative = relativePath;
          if (pngRelative.endsWith('.ktx2')) {
            pngRelative = pngRelative.replace(/\.ktx2$/i, '.png');
          }

          const localPngPath = path.resolve(absAssetsDir, pngRelative);
          if (fs.existsSync(localPngPath) && fs.statSync(localPngPath).isFile()) {
            res.setHeader('Content-Type', 'image/png');
            fs.createReadStream(localPngPath).pipe(res);
            return;
          }
        }

        next();
      });
    },

    async buildStart() {
      // Only execute during build command (or Rollup build)
      const absAssetsDir = path.resolve(viteRoot, assetsDir);

      if (!fs.existsSync(absAssetsDir)) {
        return;
      }

      const patterns = Array.isArray(include) ? include : [include];
      const ignore = exclude ? (Array.isArray(exclude) ? exclude : [exclude]) : undefined;

      const matchedFiles = await glob(patterns, {
        cwd: absAssetsDir,
        ignore,
        onlyFiles: true,
      });

      for (const relFile of matchedFiles) {
        const srcPath = path.join(absAssetsDir, relFile);
        const pngBuffer = await fs.promises.readFile(srcPath);

        const ktx2Data = await encodeToKTX2(new Uint8Array(pngBuffer), {
          ...encodeOpts,
          imageDecoder,
        });

        const outRelFile = relFile.replace(/\.png$/i, '.ktx2');
        const fileName = path.posix.join(outputDir, outRelFile);

        this.emitFile({
          type: 'asset',
          fileName,
          source: ktx2Data,
        });
      }
    },
  };
}

export default vitePluginKtx2;
