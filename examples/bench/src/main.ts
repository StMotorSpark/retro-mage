/**
 * NON-CANONICAL BENCHMARK APP FOR INTERNAL RENDER RESOLUTION (TASK 12)
 *
 * NOTE: This is a throwaway benchmarking tool designed to measure GPU frame times
 * across different internal rendering DPR caps on real device hardware (e.g., iPhone 16)
 * over LAN.
 *
 * DO NOT USE THIS FILE AS A CANONICAL EXAMPLE FOR GAME LOGIC OR ENGINE USAGE.
 * FOR THE CANONICAL EXAMPLE APP, SEE `examples/demo/`.
 */

import init, { EngineState } from 'engine-core';
import { createRenderer, WorldStateReader, type RenderResolutionConfig } from 'render';

function parseCapFromUrl(): number {
  const params = new URLSearchParams(window.location.search);
  const capVal = params.get('capDPR');
  if (capVal !== null) {
    const parsed = Number.parseFloat(capVal);
    if (!Number.isNaN(parsed) && parsed > 0.1 && parsed <= 4.0) {
      return parsed;
    }
  }
  return 1.0; // Default placeholder cap
}

class FrameTimer {
  private samples: number[] = [];
  private readonly maxSamples: number = 300;
  private lastTime: number = performance.now();

  public tick(now: number): { avg: number; p95: number; p99: number; fps: number } {
    const dt = now - this.lastTime;
    this.lastTime = now;

    if (dt > 0 && dt < 1000) {
      this.samples.push(dt);
      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }
    }

    if (this.samples.length === 0) {
      return { avg: 0, p95: 0, p99: 0, fps: 0 };
    }

    const sorted = [...this.samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? avg;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? avg;
    const fps = avg > 0 ? 1000 / avg : 0;

    return { avg, p95, p99, fps };
  }
}

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  const statsEl = document.querySelector<HTMLElement>('#stats-render');
  const buttons = document.querySelectorAll<HTMLButtonElement>('.cap-btn');

  if (!canvas || !statsEl) {
    throw new Error('Expected #scene canvas and #stats-render elements in index.html');
  }

  // 1. Parse initial resolution cap configuration
  const initialCap = parseCapFromUrl();
  const resolutionConfig: RenderResolutionConfig = {
    maxDevicePixelRatio: initialCap,
    maxPixels: Number.POSITIVE_INFINITY,
  };

  // 2. Initialize WASM module & EngineState
  const wasmOutput = await init();
  const engineState = new EngineState();

  // 3. Build stress-case corridor scene
  // Camera pose at (0, 1.5, 4.0) looking down long corridor (-Z direction)
  engineState.set_camera(0, 1.5, 4.0, 0, 0);

  let tileIdx = 0;
  // Floor grid extending 30 units into background (Z = +4 to -26)
  for (let x = -3; x <= 3; x++) {
    for (let z = -26; z <= 4; z++) {
      engineState.set_tile(tileIdx++, x, 0, z, 1, 0, 0, 0);
    }
  }

  // Corridor walls (left & right)
  for (let z = -26; z <= 4; z++) {
    engineState.set_tile(tileIdx++, -4, 1, z, 2, 0, 1, 0);
    engineState.set_tile(tileIdx++, -4, 2, z, 2, 0, 1, 0);
    engineState.set_tile(tileIdx++, 4, 1, z, 2, 0, 1, 0);
    engineState.set_tile(tileIdx++, 4, 2, z, 2, 0, 1, 0);
  }

  // Back wall at Z = -26
  for (let x = -3; x <= 3; x++) {
    engineState.set_tile(tileIdx++, x, 1, -26, 3, 0, 1, 0);
    engineState.set_tile(tileIdx++, x, 2, -26, 3, 0, 1, 0);
  }

  // Obstacle/pillar blocks placed along corridor to increase polygon count
  const pillarZ = [-2, -7, -12, -17, -22];
  for (const pz of pillarZ) {
    engineState.set_tile(tileIdx++, -2, 1, pz, 3, 0, 1, 0);
    engineState.set_tile(tileIdx++, 2, 1, pz, 3, 0, 1, 0);
  }

  // 8 active sprite actors placed along the corridor depth
  const actorPositions = [
    { x: -1, z: -1, sprite: 1 },
    { x: 1, z: -3, sprite: 1 },
    { x: 0, z: -6, sprite: 2 },
    { x: -1.5, z: -10, sprite: 2 },
    { x: 1.5, z: -14, sprite: 1 },
    { x: 0, z: -18, sprite: 2 },
    { x: -1, z: -21, sprite: 1 },
    { x: 1, z: -24, sprite: 2 },
  ];

  actorPositions.forEach((pos, idx) => {
    engineState.set_actor(idx, pos.x, 0.5, pos.z, 0, pos.sprite, 1);
  });

  // Dynamic light sources (1 stationary ambient light, 1 moving light)
  engineState.set_light(0, 0, 3, 0, 1.0, 0.9, 0.7, 5.0, 1);
  engineState.set_light(1, 0, 2, -10, 0.4, 0.8, 1.0, 4.0, 1);

  // 4. Initialize reader & renderer with resolution cap config
  const reader = new WorldStateReader(engineState, wasmOutput.memory);
  const renderer = createRenderer(canvas, {
    getViews: () => reader.read(),
    resolutionConfig,
  });

  renderer.start();

  // 5. Setup runtime cap controls & UI state sync
  const updateActiveButtons = (currentCap: number): void => {
    buttons.forEach((btn) => {
      const capVal = Number.parseFloat(btn.dataset.cap ?? '1.0');
      if (Math.abs(capVal - currentCap) < 0.01) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  updateActiveButtons(resolutionConfig.maxDevicePixelRatio);

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const newCap = Number.parseFloat(btn.dataset.cap ?? '1.0');
      resolutionConfig.maxDevicePixelRatio = newCap;
      updateActiveButtons(newCap);

      // Update URL query param without full page reload
      const url = new URL(window.location.href);
      url.searchParams.set('capDPR', newCap.toFixed(2));
      window.history.replaceState({}, '', url.toString());
    });
  });

  // 6. Frame timing overlay loop
  const timer = new FrameTimer();
  let movingLightZ = -10;
  let lightDirection = -1;

  const updateStats = (now: number): void => {
    // Animate moving light along corridor for dynamic stress
    movingLightZ += lightDirection * 0.05;
    if (movingLightZ < -22 || movingLightZ > -2) {
      lightDirection *= -1;
    }
    engineState.set_light(1, 0, 2, movingLightZ, 0.4, 0.8, 1.0, 4.0, 1);

    const metrics = timer.tick(now);
    const nativeDpr = window.devicePixelRatio || 1;
    const offscreenDim = renderer.getOffscreenDimensions();

    statsEl.innerHTML = `
      <strong>Cap DPR:</strong> ${resolutionConfig.maxDevicePixelRatio.toFixed(2)} (Native DPR: ${nativeDpr.toFixed(2)})<br/>
      <strong>Render Size:</strong> ${offscreenDim.width}x${offscreenDim.height} px<br/>
      <strong>Avg Frame:</strong> ${metrics.avg.toFixed(2)} ms (${metrics.fps.toFixed(1)} FPS)<br/>
      <strong>p95 Frame:</strong> ${metrics.p95.toFixed(2)} ms<br/>
      <strong>p99 Frame:</strong> ${metrics.p99.toFixed(2)} ms
    `;

    requestAnimationFrame(updateStats);
  };

  requestAnimationFrame(updateStats);
}

main().catch((err) => {
  console.error('Benchmark failed to start:', err);
});
