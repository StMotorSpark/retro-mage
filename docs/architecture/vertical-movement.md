---
feature: vertical-movement
tags: [architecture, collision, movement, physics, ramps]
summary: Retro Mage resolves smooth grounded vertical movement through explicit ramp support surfaces, gravity, landing, and static ceiling clearance while preserving global-world collision ownership.
relates-to:
  - "[Collision](./collision.md)"
  - "[Collision Bridge](./collision-bridge.md)"
  - "[World Model](../features/world-model.md)"
  - "[Demo Scope](../features/demo-scope.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Vertical Movement

Retro Mage supports smooth vertical dungeon movement through explicit walkable support surfaces. Ramps provide canonical movement geometry; stairs and other decorative forms remain application-owned visual content that can be presented over a matching ramp.

## Scope

The vertical movement slice provides:

- smooth XZ movement over changing elevation
- upright player body with vertical extent
- gravity when support is absent
- walking off ledges and falling
- landing on valid support surfaces
- static ceiling clearance
- configurable walkable slope limit
- deterministic bounded movement resolution
- camera elevation following the player while remaining upright

Jumping, crouching, moving platforms, elevators, ladders, actor collision, fall damage, and slope sliding are outside this slice.

## Player Body

The player body is represented by horizontal radius plus vertical body interval. The body remains upright on ramps; its orientation does not follow the support normal. Player pose uses global coordinates and retains existing XZ movement and wall sliding behavior.

The camera uses a fixed eye offset from the player body/support elevation. Camera elevation follows movement smoothly through the ramp, while camera roll and ramp-following pitch remain disabled. Look pitch remains independent.

## Support Surfaces

Collision content exposes explicit support surfaces rather than requiring movement to infer floor geometry from render tiles. Initial support surfaces are flat planes and planar ramps represented by a height function and normal:

```text
y = a*x + b*z + c
```

A flat surface has zero slope. A ramp has a non-zero slope. Surface bounds define its valid horizontal region. Instance transforms convert local support surfaces into global collision geometry alongside existing walls and solids.

Each surface carries:

- bounded horizontal region
- height function
- surface normal
- walkable classification
- optional content metadata

Render geometry does not activate support collision. Runtime-owned collision state remains authoritative.

## Walkability

The default maximum walkable slope is 35 degrees. The value is configurable through movement/world configuration. A surface is walkable when its normal satisfies the configured slope limit:

```text
dot(surfaceNormal, up) >= cos(maxWalkableSlope)
```

Too-steep surfaces are not valid support. The player blocks against an uphill attempt on such a surface. Slope sliding is not part of this slice.

## Support Selection

Movement queries candidate surfaces using horizontal body overlap and vertical reach. When multiple valid surfaces occupy the same XZ region, the runtime selects the highest valid support below the player body.

Grounded movement uses a small configurable `support_snap_distance` to remove numerical gaps and stabilize contact. Initial default is 0.02 world units. Landing snap applies only while descending, only with horizontal overlap, and only to walkable support within the tolerance. It does not teleport a rising player upward onto a distant surface.

Adjacent floor and ramp surfaces meet at authored matching endpoints. Endpoint elevation uses numerical epsilon only; large mismatches produce a gap and falling rather than gameplay teleportation.

## Gravity and Landing

The player is grounded when the body is supported by a valid walkable surface. Gravity applies whenever no valid support exists. The player can walk off a ledge, enters falling state, and lands when a swept vertical movement intersects a valid support surface.

Landing sets the body bottom to the support height within snap tolerance and clears downward vertical velocity. The system does not apply jump impulses or fall damage.

Vertical queries use swept movement and bounded substeps so large frame deltas do not tunnel through thin floors or ceilings. Frame delta is clamped before substeps. Resolution order is deterministic.

## Ceiling Clearance

Static ceiling geometry prevents the player body from entering insufficient space. Ceiling checks apply to the full vertical body interval, including movement over ramps. Dynamic geometry and crouch-dependent clearance are outside this slice.

Malformed spawn poses are rejected or corrected through existing safe-arrival validation rather than silently allowing the body to begin embedded in floor or ceiling geometry.

## World Runtime Integration

`WorldRuntime` continues to own transformed collision content and collision activation. `EngineState` owns player pose, velocity, camera, and movement resolution. `WorldTransport` drives one world-aware tick and provides an immutable collision query for each movement resolution.

Frame ordering remains:

```text
input
→ horizontal intent
→ support/gravity resolution
→ ceiling resolution
→ pose publication
→ crossing evaluation
→ streaming and render publication
```

Crossing evaluates the post-resolution global pose. Initial vertical traversal requires grounded state at the crossing anchor. Successful links publish any explicit arrival elevation and clear vertical velocity. Failed or pending targets preserve source movement and collision state.

## Content and Demo

Applications may place decorative stair meshes over matching ramp collision. Engine collision does not inspect or validate stair presentation. Applications can reuse existing floor materials and texture a simple ramp mesh for the demo; polished stair presentation is content work.

The demo proves:

- ramp ascent and descent
- changing grounded elevation
- ledge departure and falling
- landing
- too-steep uphill blocking
- static ceiling clearance
- preservation of existing seamless dungeon/outdoor traversal

A debug view may render support planes, normals, grounded state, and selected support surface to diagnose content alignment.

## Acceptance Invariants

- Player never remains grounded on a surface above the configured slope limit.
- Player never tunnels through tested static support or ceiling geometry under bounded frame deltas.
- Support selection is deterministic with overlapping floors.
- Ramp movement changes Y continuously without changing body upright orientation.
- Walking off support enters falling state.
- Landing clears downward velocity and restores grounded state.
- World-aware movement uses runtime collision state without caller-managed snapshots.
- Existing horizontal collision, crossing, streaming, and persistence proofs remain valid.

## Related Docs

- [Collision](./collision.md) — base movement ownership and collision capability
- [Collision Bridge](./collision-bridge.md) — runtime-to-movement orchestration
- [World Model](../features/world-model.md) — global coordinates and transformed instances
- [Demo Scope](../features/demo-scope.md) — browser proof scene
- [Known Gaps](../research/known-gaps.md) — deferred physics capabilities
