# Demo Assets

This directory contains application-owned visual assets for the Retro Mage showcase demo. Asset keys map to source files below; filenames do not need to match asset keys.

## Current Source Mapping

| Asset key | Source file |
| :--- | :--- |
| `demo.dungeon.wall` | `dungeon/textures/dungeon.wall.png` |
| `demo.dungeon.floor` | `dungeon/textures/dungeon.floor.png` |
| `demo.dungeon.ceiling` | `dungeon/textures/dungeon.ceiling.png` |
| `demo.castle.exterior` | `castle/textures/castle.exterior.wall.png` |
| `demo.castle.interior` | `castle/textures/castle.interior.floor.png` |
| `demo.outdoor.grass` | `outdoor/textures/forest.floor.png` |
| `demo.outdoor.road` | `outdoor/textures/road.png` |
| `demo.outdoor.cobblestone` | `outdoor/textures/cobblestone.png` |
| `demo.outdoor.mountain` | `outdoor/textures/mountain.rock.png` |
| `demo.outdoor.water` | `outdoor/textures/stream.water.png` |
| `demo.sprite.torch` | `sprite/torch.1.png` |
| `demo.sky.background` | `sky/textures/sky.background.png` |

## Temporary Placeholders

Flat-color 128×128 PNGs for dungeon ceiling, road, cobblestone, mountain rock, and stream water, plus a 512×256 sky color, are temporary integration assets. Replace them with supplied art before visual acceptance. They exist only to unblock material, geometry, and browser integration work.

## Human Handoff and Blocker Rule
**CRITICAL:** Image assets are human-supplied. Tasks must NOT generate replacement art, invent image binaries, or move ownership into engine-core or render. If required assets are missing when implementing a demo slice, developers must:
1. Continue non-visual integration only (e.g., geometry, collision, material wiring).
2. Explicitly record the missing assets as a visual-acceptance blocker in the task outcome.
3. Allow the deterministic fallback appearance to render, so browser playtests expose incomplete asset wiring.

## Required Assets

### Dungeon
| Asset Key | Material Role / ID | UV Mode | Alpha Expectation | Compression Expectation |
| :--- | :--- | :--- | :--- | :--- |
| `demo.dungeon.wall` | `mat_dungeon_stone` (lit, opaque) | tile-repeat | opaque | KTX2 transcode / app pipeline |
| `demo.dungeon.floor` | `mat_dungeon_stone` (lit, opaque) | tile-repeat | opaque | KTX2 transcode / app pipeline |
| `demo.dungeon.ceiling` | `mat_dungeon_stone` (lit, opaque) | tile-repeat | opaque | KTX2 transcode / app pipeline |

### Castle
| Asset Key | Material Role / ID | UV Mode | Alpha Expectation | Compression Expectation |
| :--- | :--- | :--- | :--- | :--- |
| `demo.castle.exterior` | `mat_castle_exterior` (lit, opaque) | explicit polygon | opaque | KTX2 transcode / app pipeline |
| `demo.castle.interior` | `mat_castle_interior` (lit, opaque) | tile-repeat | opaque | KTX2 transcode / app pipeline |

### Outdoor
| Asset Key | Material Role / ID | UV Mode | Alpha Expectation | Compression Expectation |
| :--- | :--- | :--- | :--- | :--- |
| `demo.outdoor.grass` | `mat_grass` (lit, opaque) | tile-repeat | opaque | KTX2 transcode / app pipeline |
| `demo.outdoor.road` | `mat_road` (lit, opaque) | explicit polygon | opaque | KTX2 transcode / app pipeline |
| `demo.outdoor.cobblestone` | `mat_cobblestone` (lit, opaque) | explicit polygon | opaque | KTX2 transcode / app pipeline |
| `demo.outdoor.mountain` | `mat_mountain_rock` (lit, opaque) | explicit polygon | opaque | KTX2 transcode / app pipeline |
| `demo.outdoor.water` | `mat_water` (lit, opaque, water) | explicit polygon | opaque | KTX2 transcode / app pipeline |

### Sprite
| Asset Key | Material Role / ID | UV Mode | Alpha Expectation | Compression Expectation |
| :--- | :--- | :--- | :--- | :--- |
| `demo.sprite.torch` | `mat_emissive_torch` (emissive, cutout) | billboard | cutout | KTX2 transcode / app pipeline |
| `demo.sprite.tree` | `mat_forest_tree` (lit, cutout) | billboard | cutout | KTX2 transcode / app pipeline |
| `demo.sprite.statue` | `mat_castle_statue` (lit, cutout) | billboard | cutout | KTX2 transcode / app pipeline |
| `demo.sprite.dungeon_deco` | `mat_dungeon_deco` (lit, cutout) | billboard | cutout | KTX2 transcode / app pipeline |

### Sky
| Asset Key | Material Role / ID | UV Mode | Alpha Expectation | Compression Expectation |
| :--- | :--- | :--- | :--- | :--- |
| `demo.sky.background` | `mat_sky` (unlit, sky) | explicit polygon | opaque | KTX2 transcode / app pipeline |
| `demo.sky.cloud` | `mat_cloud` (unlit, cutout) | billboard | cutout | KTX2 transcode / app pipeline |

## Optional Assets
The following assets are optional and not required for visual acceptance:
- **Baked LUT Textures:** Can be supplied to override runtime LUT generation.
- **Additional Decorative Sprites:** E.g., scattered debris, bushes, variations of statues.
