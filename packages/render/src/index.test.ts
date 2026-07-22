import { describe, expect, it } from 'vitest';
import { createRenderer } from './index.js';

describe('render', () => {
  it('exports createRenderer', () => {
    expect(createRenderer).toBeDefined();
    expect(typeof createRenderer).toBe('function');
  });
});
