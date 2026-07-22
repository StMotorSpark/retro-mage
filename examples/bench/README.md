# Render Resolution Benchmark Scene (Non-Canonical)

> **NOTE:** This package is a **non-canonical throwaway benchmarking tool** built specifically for task:12. It is **not** a game demo or canonical architecture example. For the canonical demo application, see [`examples/demo/`](../demo/).

## Overview

This benchmark scene stress-tests the WebGL2 rendering pipeline under realistic scene complexity (long draw-distance corridor, floor/wall/pillar tile grid, multiple sprite actors, and dynamic light sources) to determine the optimal internal resolution pixel-budget cap (`maxDevicePixelRatio`) for target mobile hardware (e.g., iPhone 16 reference device).

## Features

- **Stress-Case Geometry & Actors:** Renders a 30-tile-deep corridor with wall/pillar geometry, 8 billboard sprite actors, and moving light sources targeted at long-view-distance rendering.
- **Offscreen Framebuffer & Blit Pipeline:** Exercises the full offscreen framebuffer rendering path and linear-upscaled blit pass from `packages/render`.
- **Live Frame-Timing Overlay:** Measures wall-clock frame durations (`performance.now()`) across a 300-frame rolling window and displays live **rolling average**, **p95**, and **p99** frame times in milliseconds.
- **Runtime DPR Cap Override:** Switch between candidate DPR cap settings (`100% / 1.0`, `85% / 0.85`, `70% / 0.70`, `50% / 0.50`) at runtime using on-screen buttons or via URL query parameter (`?capDPR=0.85`) without restarting the server or rebuilding.

## Running Over LAN (Mobile Testing)

To test on physical phone hardware over WiFi / LAN:

1. **Start the bench dev server:**
   From the repository root:
   ```bash
   pnpm --filter bench dev
   ```
   Or from inside `examples/bench/`:
   ```bash
   pnpm dev
   ```

2. **Find host machine LAN IP:**
   On macOS/Linux:
   ```bash
   ifconfig | grep "inet "
   ```
   Or look at the Vite CLI output:
   ```
   ➜  Network: http://192.168.x.x:5173/
   ```

3. **Open on Phone Browser:**
   Navigate your phone browser to `http://<LAN-IP>:5173/` (e.g., `http://192.168.1.50:5173/`).

4. **Test Resolution Caps:**
   - Tap the on-screen DPR buttons (`100%`, `85%`, `70%`, `50%`) to test internal resolution limits live.
   - Alternatively, load with custom query params: `http://<LAN-IP>:5173/?capDPR=0.75`.
   - Observe rolling average, p95, and p99 frame times in ms to evaluate 60 FPS (16.6ms) stability.

## Limitations & Known Gaps

- Uses placeholder lighting until full LUT lighting pipeline is completed in future feature tasks.
- Non-canonical code: does not reflect full game loop or player movement input.
