import type { LightsView } from '../world-state/types.js';
export * from './lut.js';

export interface ActiveLight {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  intensity: number;
}

/** Copy active scene lights into renderer-owned uniform data. */
export function collectActiveLights(lights: LightsView | undefined): ActiveLight[] {
  if (!lights) return [];
  const result: ActiveLight[] = [];
  for (let i = 0; i < lights.count; i++) {
    if ((lights.active[i] ?? 0) <= 0) continue;
    result.push({
      x: lights.x[i] ?? 0,
      y: lights.y[i] ?? 0,
      z: lights.z[i] ?? 0,
      r: lights.r[i] ?? 1,
      g: lights.g[i] ?? 1,
      b: lights.b[i] ?? 1,
      intensity: lights.intensity[i] ?? 1,
    });
  }
  return result;
}

/** Evaluate stylized point-light contribution for one global-space surface point. */
export function evaluateLighting(
  x: number,
  y: number,
  z: number,
  lights: readonly ActiveLight[],
  ambient = 0,
): [number, number, number] {
  let red = ambient;
  let green = ambient;
  let blue = ambient;
  for (const light of lights) {
    const dx = x - light.x;
    const dy = y - light.y;
    const dz = z - light.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    const attenuation = Math.max(0, 1 - distanceSquared / 64) * light.intensity;
    red += attenuation * light.r;
    green += attenuation * light.g;
    blue += attenuation * light.b;
  }
  return [Math.min(1, red), Math.min(1, green), Math.min(1, blue)];
}
