import { describe, expect, it } from 'vitest';
import { GlobalSceneSubmission } from './scene.js';

describe('GlobalSceneSubmission', () => {
  it('submits multiple already-transformed instances through one global buffer', () => {
    const scene = new GlobalSceneSubmission({ tiles: 4, actors: 2, lights: 2 });
    scene.submit({ id: 'source', tiles: [{ x: 1, y: 0, z: 2, tile_id: 1 }] });
    scene.submit({ id: 'target', tiles: [{ x: 101, y: 0, z: 2, tile_id: 2 }], actors: [{ x: 102, y: 1, z: 2 }] });

    const view = scene.view();
    expect(view.instanceIds).toEqual(['source', 'target']);
    expect(view.tiles.count).toBe(2);
    expect(Array.from(view.tiles.x.slice(0, 2))).toEqual([1, 101]);
    expect(view.tiles.material_id?.[0]).toBe(0);
    expect(view.tiles.render_flags?.[0]).toBe(5);
    expect(view.actors.count).toBe(1);
  });

  it('carries material identity, UV data, and render flags', () => {
    const scene = new GlobalSceneSubmission({ tiles: 1 });
    scene.submit({ id: 'room', tiles: [{ x: 1, y: 2, z: 3, material_id: 7, uv_mode: 1, uv_u: 2.5, uv_v: 3.5, render_flags: 6 }] });
    const tile = scene.view().tiles;
    expect(tile.material_id?.[0]).toBe(7);
    expect(tile.uv_mode?.[0]).toBe(1);
    expect(tile.uv_u?.[0]).toBe(2.5);
    expect(tile.uv_v?.[0]).toBe(3.5);
    expect(tile.render_flags?.[0]).toBe(6);
  });

  it('keeps overlapping source and target geometry in one depth-tested scene', () => {
    const scene = new GlobalSceneSubmission({ tiles: 2, lights: 2 });
    scene.submit({
      id: 'source',
      tiles: [{ x: 4, y: 0, z: 4, tile_id: 1 }],
      lights: [{ x: 4, y: 1, z: 4, intensity: 2 }],
    });
    scene.submit({
      id: 'target',
      tiles: [{ x: 4, y: 0, z: 4, tile_id: 2 }],
      lights: [{ x: 5, y: 1, z: 4, r: 1, g: 0.5, b: 0.25 }],
    });
    expect(scene.view().instanceIds).toEqual(['source', 'target']);
    expect(scene.view().tiles.count).toBe(2);
    expect(scene.view().lights.count).toBe(2);
  });

  it('rejects whole instance on overflow and keeps previous submission intact', () => {
    const scene = new GlobalSceneSubmission({ tiles: 1 });
    scene.submit({ id: 'source', tiles: [{ x: 0, y: 0, z: 0 }] });
    scene.submit({ id: 'target', tiles: [{ x: 1, y: 0, z: 0 }] });
    const view = scene.view();
    expect(view.overflow.overflowed).toBe(true);
    expect(view.overflow.diagnostics[0]).toMatchObject({ category: 'tiles', requested: 2, capacity: 1, instance_id: 'target' });
    expect(view.overflow.skippedInstances).toContain('target');
    expect(scene.counts).toEqual({ tiles: 1, actors: 0, lights: 0, instances: 1 });
    expect(scene.view().instanceIds).toEqual(['source']);
  });

  it('resets frame submission without reallocating buffers', () => {
    const scene = new GlobalSceneSubmission({ tiles: 2 });
    const before = scene.view().tiles.x;
    scene.submit({ id: 'source', tiles: [{ x: 1, y: 2, z: 3 }] });
    scene.reset();
    expect(scene.counts.tiles).toBe(0);
    expect(scene.view().tiles.x).toBe(before);
  });

  it('rejects whole instance on instance capacity overflow', () => {
    const scene = new GlobalSceneSubmission({ instances: 1 });
    scene.submit({ id: 'source' });
    scene.submit({ id: 'target' });
    const view = scene.view();
    expect(view.overflow.overflowed).toBe(true);
    expect(view.overflow.diagnostics[0]).toMatchObject({ category: 'instances', requested: 2, capacity: 1, instance_id: 'target' });
    expect(view.overflow.skippedInstances).toContain('target');
    expect(scene.counts).toEqual({ tiles: 0, actors: 0, lights: 0, instances: 1 });
    expect(scene.view().instanceIds).toEqual(['source']);
  });
});
