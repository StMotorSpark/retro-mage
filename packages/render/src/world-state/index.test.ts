import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { initSync, EngineState } from 'engine-core';
import {
  readActorsView,
  readCameraView,
  readLightsView,
  readTilesView,
  WorldStateReader,
} from './index.js';

function setupWasmEngine() {
  const wasmPath = path.resolve(__dirname, '../../../engine-core/pkg/engine_core_bg.wasm');
  const wasmBytes = fs.readFileSync(wasmPath);
  const initOutput = initSync({ module: wasmBytes });
  const engine = new EngineState();
  engine.set_ambient_light(1.0);
  return { engine, memory: initOutput.memory };
}

describe('world-state reader', () => {
  it('reads actors buffer views with real WASM round-trip values', () => {
    const { engine, memory } = setupWasmEngine();

    expect(engine.actors_count()).toBe(0);
    engine.set_actor(0, 10.5, 20.25, -5.0, 1.57, 42.0, 1.0);
    engine.set_actor(1, 1.0, 2.0, 3.0, 0.0, 7.0, 1.0);

    const actorsView = readActorsView(engine, memory);
    expect(actorsView.count).toBe(2);
    expect(actorsView.x[0]).toBeCloseTo(10.5);
    expect(actorsView.y[0]).toBeCloseTo(20.25);
    expect(actorsView.z[0]).toBeCloseTo(-5.0);
    expect(actorsView.facing[0]).toBeCloseTo(1.57);
    expect(actorsView.sprite_id[0]).toBeCloseTo(42.0);
    expect(actorsView.active[0]).toBe(1.0);

    expect(actorsView.x[1]).toBeCloseTo(1.0);
    expect(actorsView.y[1]).toBeCloseTo(2.0);
    expect(actorsView.z[1]).toBeCloseTo(3.0);
    expect(actorsView.facing[1]).toBeCloseTo(0.0);
    expect(actorsView.sprite_id[1]).toBeCloseTo(7.0);
    expect(actorsView.active[1]).toBe(1.0);
  });

  it('reads lights buffer views with real WASM round-trip values', () => {
    const { engine, memory } = setupWasmEngine();

    expect(engine.lights_count()).toBe(0);
    engine.set_light(0, 5.0, 6.0, 7.0, 1.0, 0.5, 0.25, 3.5, 1.0);

    const lightsView = readLightsView(engine, memory);
    expect(lightsView.count).toBe(1);
    expect(lightsView.x[0]).toBeCloseTo(5.0);
    expect(lightsView.y[0]).toBeCloseTo(6.0);
    expect(lightsView.z[0]).toBeCloseTo(7.0);
    expect(lightsView.r[0]).toBeCloseTo(1.0);
    expect(lightsView.g[0]).toBeCloseTo(0.5);
    expect(lightsView.b[0]).toBeCloseTo(0.25);
    expect(lightsView.intensity[0]).toBeCloseTo(3.5);
    expect(lightsView.active[0]).toBe(1.0);
  });

  it('reads tiles buffer views with real WASM round-trip values', () => {
    const { engine, memory } = setupWasmEngine();

    expect(engine.tiles_count()).toBe(0);
    engine.set_camera(100.0, 0.0, 200.0, 0.0, 0.0);
    engine.set_tile(0, 100.0, 0.0, 200.0, 12.0, 3.0, 0.0);

    const tilesView = readTilesView(engine, memory);
    expect(tilesView.count).toBe(1);
    expect(tilesView.x[0]).toBeCloseTo(100.0);
    expect(tilesView.y[0]).toBeCloseTo(0.0);
    expect(tilesView.z[0]).toBeCloseTo(200.0);
    expect(tilesView.tile_id[0]).toBeCloseTo(12.0);
    expect(tilesView.variant[0]).toBeCloseTo(3.0);
  });

  it('reads camera buffer view with real WASM round-trip values', () => {
    const { engine, memory } = setupWasmEngine();

    engine.set_camera(1.2, 3.4, 5.6, 0.78, -0.9);

    const cameraView = readCameraView(engine, memory);
    expect(cameraView.count).toBe(1);
    expect(cameraView.x[0]).toBeCloseTo(1.2);
    expect(cameraView.y[0]).toBeCloseTo(3.4);
    expect(cameraView.z[0]).toBeCloseTo(5.6);
    expect(cameraView.yaw[0]).toBeCloseTo(0.78);
    expect(cameraView.pitch[0]).toBeCloseTo(-0.9);
  });

  it('reuses typed-array views in steady state (zero per-frame allocation)', () => {
    const { engine, memory } = setupWasmEngine();
    const reader = new WorldStateReader(engine, memory);

    const views1 = reader.read();
    const views2 = reader.read();

    expect(views1.actors.x).toBe(views2.actors.x);
    expect(views1.lights.x).toBe(views2.lights.x);
    expect(views1.tiles.x).toBe(views2.tiles.x);
    expect(views1.camera.x).toBe(views2.camera.x);
  });

  it('defensively re-fetches views when WASM memory grows', () => {
    const { engine, memory } = setupWasmEngine();
    const reader = new WorldStateReader(engine, memory);

    const viewsBefore = reader.read();
    const xViewBefore = viewsBefore.actors.x;

    // Trigger WASM memory allocation / growth
    memory.grow(1);

    const viewsAfter = reader.read();
    const xViewAfter = viewsAfter.actors.x;

    // Old buffer is detached by WASM memory growth
    expect(xViewBefore.buffer.byteLength).toBe(0);
    // View is recreated pointing to the newly grown memory buffer
    expect(xViewAfter.buffer).toBe(memory.buffer);
    expect(xViewAfter.buffer.byteLength).toBeGreaterThan(0);
  });
});
