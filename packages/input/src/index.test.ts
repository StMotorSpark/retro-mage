import { describe, expect, it } from 'vitest';
import { createInputSource } from './index.js';

describe('input', () => {
  it('exports createInputSource', () => {
    expect(createInputSource).toBeDefined();
    expect(typeof createInputSource).toBe('function');
  });
});
