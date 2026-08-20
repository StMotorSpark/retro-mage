---
feature: consumer-troubleshooting
tags: [consumer, troubleshooting, diagnostics, agents]
summary: Retro Mage consumers diagnose lifecycle, collision, render, asset, and browser integration failures through authoritative transport diagnostics and bounded reproductions.
relates-to:
  - "[Consumer Agent Guide](./agent-guide.md)"
  - "[Consumer Integration](../architecture/consumer-integration.md)"
  - "[Provider Lifecycle](../architecture/provider-lifecycle.md)"
  - "[Scene Capacity](../architecture/scene-capacity.md)"
---

# Consumer Troubleshooting

Start from engine/runtime diagnostics and reproducible state, not from a visual guess. Preserve request IDs, instance IDs, pose, lifecycle state, material diagnostics, and overflow data in a failed browser assertion.

## Symptoms

| Symptom | Inspect | Correct direction |
| --- | --- | --- |
| Target visible but crossing does not occur | active endpoint, target resident/render/collision readiness, direction, anchor volume, re-arm state | Do not add a coordinate threshold. Confirm target readiness and approach link through its directional volume. |
| Target provider failure strands source | request failure, source active/collision state, game error handler | Report failure through matching request ID. Keep source active; game UI offers retry/fallback. |
| Late provider result changes content | request ID, instance ID, cancellation/retry history | Accept only current matching identity. Cancelled/replaced completion stays stale. |
| Player clips/falls in global world | whether frame uses `tick_engine`, active collision state, support surfaces, pose | Use world-aware tick. Repair game collision/support content; never synchronize render tiles manually. |
| Geometry disappears or crossing is rejected | scene overflow diagnostic and configured capacities | Treat overflow as failure. Reduce/split scene content or configure capacity; preserve atomic publication. |
| Surface shows fallback/untextured | material ID, descriptor, asset key, byte resolver, renderer diagnostic | Repair game material registration/asset bytes. Keep GPU ownership in renderer. |
| Sprite has opaque matte or fails depth | source alpha, cutout flags, billboard material/resource binding | Repair source/descriptor and renderer binding. Do not compensate with gameplay geometry. |
| Renderer sees old/invalid views after WASM growth | reader construction and memory-view refresh behavior | Use package readers and current WASM memory; do not cache raw typed-array pointers. |
| Touch/gamepad differs from expected action | normalized `InputState`, `buttons_pressed`, game button mapping | Inspect input state first. Keep semantic mapping in game code. |
| Restore remains pending or instance cannot activate | restore attempt/status, application payload handoff/acknowledgement | Complete game persistence handoff and matching restore result; do not bypass activation safety. |
| Browser uses stale build | build identifier, service worker/controller, HTTP cache | Verify deployed build ID and service-worker update state; change engine code only after ruling out stale delivery. |

## Minimal Failure Report

Record:

```text
consumer revision + Retro Mage package revision
browser/device and build mode
instance ID + provider request ID
lifecycle, active-instance, collision, restore, overflow, material diagnostics
input trace + starting/ending pose
expected behavior + exact observed behavior
minimal automated reproduction command
```

This record distinguishes app content defects from cross-consumer engine defects.

## Related Docs

- [Consumer Agent Guide](./agent-guide.md) — integration entrypoint
- [Consumer Integration](../architecture/consumer-integration.md) — ownership rules
- [Provider Lifecycle](../architecture/provider-lifecycle.md) — identity and cancellation diagnostics
- [Scene Capacity](../architecture/scene-capacity.md) — overflow behavior
