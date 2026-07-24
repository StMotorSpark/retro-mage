---
name: test-demo-playwright
description: Headlessly test the WebGL demo (`examples/demo`) using Playwright. Covers WebGL Chromium flags, synthetic touch input dispatch, coordinate sign inversions, asset loading wait conditions, WASM/Vite cache invalidation, and temporary debug hooks.
---

# Test Demo Playwright Skill

Guidance and non-obvious patterns for headlessly testing the WebGL demo (`examples/demo`) using Playwright.

---

## 1. Headless WebGL Chromium Flags

Headless Chromium requires SwiftShader software rendering flags. Without these flags, the WebGL context dies immediately on startup:

```ts
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=swiftshader',
    '--enable-webgl',
    '--enable-unsafe-swiftshader'
  ]
});
```

---

## 2. Synthetic Touch Input Handling

The `input` package has no keyboard input binding — movement and camera look rely on touch zones (`.retro-input-move-zone` and `.retro-input-look-zone`). Standard Playwright keyboard inputs (`page.keyboard.press`) will not drive movement.

Dispatch synthetic `TouchEvent` instances directly via `page.evaluate`:

```ts
await page.evaluate(({ selector, dx, dy }) => {
  const target = document.querySelector(selector);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const touch = new Touch({
    identifier: Date.now(),
    target,
    clientX: centerX + dx,
    clientY: centerY + dy,
  });

  target.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true }));
}, { selector: '.retro-input-move-zone', dx: 0, dy: -20 });
```

---

## 3. Coordinate System & Movement Signs

Movement axes differ from intuitive screen space:
- **`dy` negative** $\rightarrow$ **`move.y` negative** $\rightarrow$ **`z` coordinate increases** (moves forward/into the world).
- Pay close attention to movement signs when scripting automated walks to avoid wasting cycles on wrong-direction movement.

---

## 4. Dev Server Asset Loading & Wait Conditions

- The dev server encodes KTX2 textures on the fly on the first request, making initial asset loading slow.
- **Never use fixed timeouts** (`page.waitForTimeout` / `setTimeout`).
- Always use explicit element or selector wait guards:
  ```ts
  await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });
  ```

---

## 5. WASM & Vite Cache Invalidation

When making changes to `engine-core` (Rust), rebuild WASM and clear Vite cache on `examples/demo` to prevent stale-bundle false negatives:

```bash
# 1. Rebuild engine-core WASM bindings
cd packages/engine-core && wasm-pack build --target web --out-dir pkg

# 2. Clear Vite dependency cache on demo app
rm -rf examples/demo/node_modules/.vite
```

Failing to clear `node_modules/.vite` can cause Vite to serve previously cached WASM wrappers, masking working fixes.

---

## 6. Temporary Debug Hooks Pattern

When diagnosing spatial, transition, or state bugs:
1. Stash internal engine state in the main tick loop on `window`:
   ```ts
   // In main tick loop / frame handler
   (window as any).__debugPos = { x: player.x, y: player.y, z: player.z, room: currentRoom.id };
   ```
2. Read state directly in Playwright tests:
   ```ts
   const pos = await page.evaluate(() => (window as any).__debugPos);
   console.log('Player position:', pos);
   ```
3. Remove debug hooks from codebase prior to completing the task.

This technique provides immediate ground-truth verification and is significantly faster and more reliable than guessing from screenshots alone.
