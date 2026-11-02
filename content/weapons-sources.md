# Weapons article: sources, measurements and captures

Maintainer evidence for `/weapons/`. Only selected illustrations and plot measurements are published. The complete
measurement fixture, input tapes and capture tools stay in the separate
tfx-reverse research workspace at `analysis/weapons-article/`. They are not
part of this public repository or its published site.

## Reference build

September 1994 CD, TFX 2.05:

- `TFX.DAT` SHA-256: `2cc41a39fa95a2c9fd883c4220d7bdd9cca00c543c89b019eb270763f59d1d9a`.
- `DID.DAT` SHA-256: `e62a4b372a9a4b2d4c881a4ea6ec6b132e8db62f83d5f7e45ba05b772ffbee40`.
- Reconstruction pinned at `6ff369f31402aa9b18add9d7ea4e640ceed19444` in tfx-cpp.
- Manual: the scanned *TFX Tactical Fighter Experiment Manual (Ocean)(1994)*
  in tfx-reverse/literature. Printed pages 19–23, 38–39 and 73–82 supply the
  targeting instructions and advertised weapon specifications. No scan is
  copied to this site.

Weapon records are 27 × 48 bytes at DATA `0x809c`, with object 3 at file
`0xedaa4`. The range conversion is 8 feet = 2.4384 m per world unit. Projectiles
use Q8 position, so one stored position subunit is 0.009525 m. Speed examples use
50 ticks per model second; the hardware clock is 1193182 / 21845 Hz.

## Claim map

Paths are relative to tfx-cpp. Native addresses are TFX.DAT file offsets.

| Subject | Source / original-code comparison |
| --- | --- |
| Records, names, range, categories, carried mass, boost durations | `src/weapons/definition.cpp`; original record and stage pointers at DATA `0x809c` |
| Constructor, launch speed, zero roll | `src/weapons/projectile.cpp`; constructor `0xa2d80` |
| Attached and falling phases | `0xa4380`, `0xa4414`; `tools/check_projectiles.py` |
| Boost cadence and coasting | `0xa422c`, alias `0xa42bc`, coast `0xa42c8`; article measurements below |
| Pure pursuit, angular error, cone, range consumption, Harpoon descent | `0xa3b6c`; `src/weapons/projectile.cpp` |
| CSW guidance-to-dispenser transition | `0xa3d70`; altitude test at Q8 Y = -20480 |
| CMB18 and CSW child release formula, scatter, inherited player state | `0xa4080`, `0xa41a0`; `src/weapons/projectile.cpp`, `tools/check_projectile_runtime.py` |
| Durandal horizontal stop, generic bomblet fall | `0xa3f14`, `0xa3fd8`; these callbacks omit forward travel |
| Pool capacity, oldest recycling, shared designation and decoy references | `src/weapons/runtime.cpp`; `tools/check_projectile_runtime.py` |
| 20 contacts, 50-mile horizontal scan, acquisition cones, aspect and reticle | `src/sensors/air.cpp`; original `0x836ac`, `0x8296c`, `0x93328`; `tools/check_sensors.py` |
| Cruise destination and first mission target binding | mission setup `0x70c40`, acquisition `0x93128`; `src/platform/flight.cpp`, `src/sensors/ground.cpp`; `tools/check_cruise_target.py`, `tools/check_cruise_session.py` |
| Designator controls, zero-plane intersection, F-117 search limits | `src/sensors/ground.cpp`; `0x92c24`, `0x93040`; `tools/check_ground_sensors.py` |
| Locked gimbal follows without search clamp | `0x92a34`; same ground-sensor comparison |
| Mobile designation, emitter and ship selectors | `0x7ca24`, `0x7c998`, `0x7c828`, `0x7cb5c`; same ground-sensor comparison |
| Release gates, auto bays, Harpoon first-press acquisition | `src/platform/flight.cpp`, `src/weapons/loadout.cpp`; original trigger `0x83fa8`, release primitive `0x8bd8c` |
| Mk 82 CCIP and marker viewport | `src/weapons/impact_prediction.cpp`, `src/weapons/runtime.cpp`, `src/cockpit/weapon_display.cpp` |
| Damage and health | SSD initialization through `0xb54dc`; `src/world/instance.cpp`; all fired/secondary definitions measured below |
| Swept collision and reciprocal damage | `src/world/collision.cpp`, `src/world/instance.cpp`; `tools/check_contact_damage.py` |
| Ground contact and special CBU55 effect | `src/platform/flight.cpp`; terrain contact callback spawns `boom` after a new destruction |
| Pixel-sampled impact class | `src/world/impact.cpp`; original `0x7da20`; `tools/check_projectile_impacts.py` |
| Trail eligibility and 4000-world-unit distance gate | `src/weapons/projectile.cpp`, `src/weapons/runtime.cpp`; original `0xa3378` |
| Cartridge strengths / afterburner | `src/flight/defence.cpp`; `0x86124`, `0x86168`; `tools/check_defence.py` |
| Probability, category eligibility, decoy retirement and ECM | `src/weapons/runtime.cpp`, `src/weapons/projectile.cpp`; original `0xa35d0`, `0xa3b6c` |
| AI index-based decoy selection | `src/actors/air.cpp`, `air_runtime::countermeasures`; original AI controller comparisons |
| Cannon round consumption, mount alternation and two trigger paths | `src/weapons/cannon.cpp`, `src/platform/flight.cpp`; `tools/check_cannon.py` |

The manual's ASRAAM and AIM 9L descriptions were compared with the category
bytes themselves and each category consumer, rather than inferred from a model
name. In the reference table ASRAAM is category 0 and AIM 9L is category 1.

## Measurements generated for this article

From tfx-cpp, using the analysis Python environment:

```sh
python ../tfx-reverse/analysis/weapons-article/capture-weapons-checks.py \
  --output ../tfx-reverse/analysis/weapons-article/weapons-native-checks.json
```

The script imports `tools/check_projectiles.original`, executes native machine
instructions, and compares every motion state with `build/projectile_probe`.
It also executes each fired/secondary SSD initializer with symbolic model
binding and compares impact/health with `build/instance_probe`.

- 22 boost runs: 11 weapon indices × two fixed substeps (4 and 10 ticks),
  each 100 updates, with initial speed 400, level launch at 2400 m and a ground
  point 20 km ahead.
- Nine GBU24 paths: 200, 700 and 1800 m altitude × 0, 30 and 60 degrees down;
  speed 400, elapsed 4, target 5 km ahead, maximum 500 updates.
- The fixture retains 4698 matching updates, ending release paths at their
  first nonnegative Y. Native world height clamping still executes. No terrain
  contacts, object hits or proximity effects are included in these isolated
  movement plots.
- The supplied player mount is fixed at launch position + (1000,-500,2000)
  Q8 subunits, matching the existing harness's explicit anchor boundary.
- The row whose state switches to guided has completed the previous callback;
  the following movement is the first guided one. The diagram draws that
  transition correctly.
- 54 native SSD initializers: 27 weapons × fired and secondary objects.
  This includes definitions absent from some earlier analysis name lists.

The separate research check verifies conversions and phase boundaries against
the captured native states. In this repository, `make-weapons-diagrams.mjs`
generates SVGs from the selected plot measurements. `check-weapons-data.mjs`
checks that those SVGs and the published data stay consistent; it is part of
`npm run check`. No original bytes are embedded in a diagram or plot dataset.

Additional original/C++ checks run while writing:

- `check_sensors.py`: 1024 persistent radar frames, 4096 seeker states and 1024
  mission-start resets agree.
- `check_defence.py`: 8192 complete defensive-key states agree.
- `check_cruise_target.py`: 4096 cruise designation/guidance/projection cases agree.

## Original-renderer screenshots

Run `analysis/weapons-article/capture-weapons-images.py --work /an/empty/temporary/directory`
from the tfx-reverse research workspace
with the analysis Python environment. It uses the existing native arming and
full-flight harnesses. Raw framebuffers, palettes, logs and session state stay
in that temporary directory. Only ten selected 320 × 200 PNGs enter
`public/images/weapons/`.

| Published image | Original capture |
| --- | --- |
| `loadout-air.png` | NativeArming, aircraft 0, first weapon 1 |
| `loadout-bombs.png` | NativeArming, aircraft 1, first weapon 8 |
| `loadout-dispensers.png` | NativeArming, aircraft 0, first weapon 14 |
| `loadout-missiles.png` | NativeArming, aircraft 1, first weapon 18 |
| `harm-launch.png` | Mission 503, Arcade, 18 ticks/frame, frame 318 |
| `harm-flight.png` | Same, frame 321 |
| `target-fireball.png` | Same, frame 334 |
| `target-smoke.png` | Same, frame 337 |
| `cruise-lock.png` | Mission 703, Military-spec, 4 ticks/frame, frame 12 |
| `cruise-target.png` | Same, frame 14 |

Arming uses the real model renderer and one idle frame after opening, no weapon
selected, empty mounts, pointer (100,75). Flight input tapes are kept with the
research capture tools. They use original cheat/input mechanisms to set up repeatable
captures, not injected hits or modified weapon code. The mission 503 tape is
the existing ground-strike regression with F8, F9 and Shift+Home camera inputs
added; its final mission state credits one target. Mission 703 fits AGM109H
through the actual arming UI and observes the automatic lock, F9 and landed
fire inhibition. No graphics or simulation routine is replaced for the images.

RGB conversion is `(DAC6 × 255 + 31) // 63`. Flight frames use their own observed
hardware palettes; loadout frames use the original arming palette. There is no
retouching, invented effect, resized source or composited HUD.

## Publication boundary

The existing build still publishes only `public/` and explicitly selected site
components. This article adds ten PNGs, four SVG fallbacks and the named
weapons CSS/JS/plot-data assets. It does not publish input tapes, full native
state fixtures, capture outputs, installation files, archives, music or ROMs.
References outside the site use GitHub source links.

## Browser and publication checks

Chromium review covered 320, 390 (2× device pixels), 768, 1024, 1366 and 1440 CSS
pixel widths, all three release-altitude choices, the collapsed navigation, image
loading and the no-JavaScript SVG fallback. No page overflow, JavaScript errors
or failed resource requests were observed. The site checks cover local links,
article measurements, diagram freshness and the existing no-download boundary.
