import { describe, expect, it } from 'vitest';
import { generateLut, applyEmissive } from './lut.js';
const warm = { paletteColors: ['#32100a', '#ffb060'], intensityBandCount: 8, ambientLevel: .1, rgbLightColorMode: 'multiply' as const, emissiveMapping: 'add' };
const cool = { ...warm, paletteColors: ['#08152f', '#80c8ff'], ambientLevel: .25, rgbLightColorMode: 'tint' as const };
describe('runtime LUT', () => {
  it('is deterministic', () => expect(generateLut(warm).data).toEqual(generateLut(warm).data));
  it('changes with config and supports warm/cool palettes', () => {
    expect(generateLut(warm).data).not.toEqual(generateLut(cool).data);
    expect(generateLut(warm).height).toBe(8);
  });
  it('maps emissive color/intensity', () => expect(applyEmissive({ color: '#ff0000', intensity: .5 }, [10, 10, 10])).toEqual([138, 10, 10]));
});
