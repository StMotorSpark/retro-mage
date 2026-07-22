export interface RenderResolutionConfig {
  /** Maximum device pixel ratio allowed for internal 3D framebuffer (default: 1.0) */
  maxDevicePixelRatio: number;
  /** Hard maximum total pixel count allowed for internal 3D framebuffer (default: Infinity) */
  maxPixels: number;
}

/**
 * Default internal render resolution configuration.
 * Hardcoded to maxDevicePixelRatio = 1.0 as a conservative placeholder
 * pending real benchmark data from task:12.
 */
export const DEFAULT_RENDER_RESOLUTION_CONFIG: Readonly<RenderResolutionConfig> = Object.freeze({
  maxDevicePixelRatio: 1.0,
  maxPixels: Number.POSITIVE_INFINITY,
});

/**
 * Compute the internal framebuffer dimensions based on canvas CSS size, DPR, and cap config.
 */
export function computeCappedResolution(
  cssWidth: number,
  cssHeight: number,
  dpr: number = 1.0,
  config: RenderResolutionConfig = DEFAULT_RENDER_RESOLUTION_CONFIG,
): { width: number; height: number } {
  const safeCssWidth = Math.max(1, cssWidth);
  const safeCssHeight = Math.max(1, cssHeight);
  const safeDpr = Math.max(0.1, dpr);

  const effectiveDpr = Math.min(safeDpr, config.maxDevicePixelRatio);
  let targetWidth = Math.round(safeCssWidth * effectiveDpr);
  let targetHeight = Math.round(safeCssHeight * effectiveDpr);

  const totalPixels = targetWidth * targetHeight;
  if (Number.isFinite(config.maxPixels) && config.maxPixels > 0 && totalPixels > config.maxPixels) {
    const scale = Math.sqrt(config.maxPixels / totalPixels);
    targetWidth = Math.max(1, Math.floor(targetWidth * scale));
    targetHeight = Math.max(1, Math.floor(targetHeight * scale));
  }

  return {
    width: Math.max(1, targetWidth),
    height: Math.max(1, targetHeight),
  };
}
