# Flight physics article: sources and numerical checks

This is a maintainer record for `/flight/`, not an extra public page. The build
copies neither this file nor its numerical fixtures into `dist/`.

## Reference

The article describes the September 1994 CD's TFX 2.05. Original code lives in
`TFX.DAT`, SHA-256
`2cc41a39fa95a2c9fd883c4220d7bdd9cca00c543c89b019eb270763f59d1d9a`.
File offsets below refer to that LE image; DATA offsets refer to object 3.
The linked reconstruction is pinned at tfx-cpp commit
`6ff369f31402aa9b18add9d7ea4e640ceed19444`.

The TFX pilot's manual supplies the introductory engineering credit and the
contemporary explanation of prototype information and aircraft estimates.
See Roderick Victor Kennedy's flight-model appendix in the scanned manual held
in tfx-reverse/literature. The article's numerical and behavioural descriptions
follow the executable, including places where it differs from the manual.

## Claim map

All source paths here are relative to `tfx-cpp`.

| Article subject | Reconstruction and original-code checks |
| --- | --- |
| Callback selection; four models; autopilot overrides; disabled aircraft | `src/flight/player_dispatch.cpp`, `src/flight/player_flight.cpp`, `src/flight/player_frame.cpp`; `tools/check_player_dispatch.py` |
| Aircraft geometry, mass, fuel, thrust, coefficients and carrier setup | `src/flight/airframes.cpp`; `tools/check_aerodynamic_airframes.py`, original full initializer `0x95f3c`, carrier modifier `0x968d4` |
| Advanced update order and retained state | `src/flight/aerodynamic_step.cpp`, `src/flight/aerodynamic_airdata.cpp`, `src/flight/aerodynamic_motion.cpp` |
| Density, temperature and sound speed | `src/flight/atmosphere.cpp`, `src/flight/aerodynamic_airdata.cpp`; `tools/check_aerodynamic_airdata.py` |
| Wind and weather binding | `src/flight/aerodynamic_wind.cpp`, `src/flight/aerodynamic_wind.h`, `src/platform/flight.cpp`; `tools/check_weather_bindings.py` |
| Mach-dependent lift slope, wave drag, stability and control derivatives | `src/flight/aerodynamic_coefficients.cpp`; original `0x99bc0`, `tools/check_aerodynamic_coefficients.py` |
| Lift limits, flap effects, stall flag, drag and aerodynamic moments | `src/flight/aerodynamic_surfaces.cpp`; original `0x9c7f0`, `tools/check_aerodynamic_surfaces.py` |
| Stores and rotational inertia | `src/flight/stores.cpp`, `src/flight/aerodynamic_forces.cpp`, original variable-reference check below |
| Summed forces, gravity, G reading, pitch/roll acceleration | `src/flight/aerodynamic_forces.cpp`; `tools/check_aerodynamic_forces.py` |
| Numerical damping fallback and rudder/yaw shortcut | `src/flight/aerodynamic_response.cpp`, `src/flight/aerodynamic_commands.cpp`; corresponding native comparison scripts |
| Trim, G limits, automatic stick pressure, speed protection, flap demand and F-22 nozzles | `src/flight/aerodynamic_manual.cpp`; `tools/check_aerodynamic_manual.py` |
| Keyboard, mouse, joystick and combat/cruise response | `src/flight/aerodynamic_controls.cpp`, `src/flight/joystick.cpp`, `src/flight/aerodynamic.cpp`, `src/flight/player_shared.cpp`, `src/platform/flight.cpp` |
| Thrust, fuel, engine decay and afterburner | `src/flight/aerodynamic_powerplant.cpp`; `tools/check_aerodynamic_powerplant.py`, original `0x99424`, `0x995e0`, `0x9cc54` |
| Six contact points, spring/damper response, friction and impact damage | `src/flight/aerodynamic_contact.cpp`, `src/flight/aerodynamic_ground.cpp`; `tools/check_aerodynamic_contact.py`, original point routine `0x9d734` |
| Realistic-mode ground simplifications | `src/flight/aerodynamic_realistic_ground.cpp`; `tools/check_aerodynamic_realistic_ground.py` |
| Carrier launch, hook engagement and cable force | `src/flight/aerodynamic_ground.cpp`, `src/flight/airframes.cpp`; ground and airframe native comparisons |
| System damage, repair and handling disturbances | `src/flight/damage.cpp`, `src/flight/aerodynamic_manual.cpp`; damage and manual-controller native comparisons |
| Blackout/redout and breathing | `src/render/g_effects.cpp`, player-frame delivery in `src/platform/flight.cpp`; native G-effect comparisons |
| Autopilot, speed hold, recovery, refuelling and automatic landing | `src/flight/aerodynamic_autopilot.cpp`, `src/flight/aerodynamic_recovery_trigger.cpp`, `src/flight/automatic_landing.cpp`, `src/flight/aerodynamic_forces.cpp` |
| Arcade and Simple movement, fuel and ground handling | `src/flight/arcade.cpp`, `src/flight/simple.cpp`, `src/flight/simple_ground.cpp`; basic/simple original-code comparisons |
| Frame gates, elapsed limits, integration and integer angles | `src/simulation/timing.cpp`, `src/flight/aerodynamic_response.cpp`, `src/flight/aerodynamic_motion.cpp`; `docs/verification.md` |

## Two findings checked beyond the formulas

### Stores drag

The loadout accumulator at DATA `0x14358` is cleared and updated but never added
to the flight drag equation. Reading the LE relocation records identifies these
references in the reference executable:

| File offset | Operation |
| --- | --- |
| `0x95dd2` | Clear accumulator low word |
| `0x95ddc` | Clear high word at DATA `0x1435c` |
| `0x95e5c` | `fadd qword ptr [0x14358]` while accumulating stores |
| `0x95e62` | `fstp qword ptr [0x14358]` |
| `0x8aa2d` | `fld qword ptr [0x14358]` in the arming-screen readout |

The reconstruction's store-drag field has the same consumers. Mass and pitch/
roll inertia have separate consumers in the advanced physics. The article does
not generalise this finding to other TFX builds or claim that the loaded
weapons have no effect on handling.

### Weather selection

The physical initializer sets the profile byte DATA `0x1496b` to zero at file
`0x95f55`. The temperature column DATA `0x14956` has readers but no writer in the
relocation check. The preset zero temperature is 29 Celsius; the native Kelvin
conversion adds 273. The disabled-temperature path uses 288.15 K. Density has
its own height-only expression.

The five wind rows begin at DATA `0x8e40`, `0x8e68`, `0x8e90`, `0x8eb8`;
temperature words start at `0x8c98`. The wind routine consumes the upper-wind
speed directly in metres per second; profile zero is 100. Environmental flags
still boost the surface component. The vertical-gust scale is zero with no
subsequent writer. `check_weather_bindings.py` covers 33 environments and 1,056
native initialization cases. These are existing reconstruction comparisons;
the article does not infer profile selection from a weather label.

## Interactive equations

`src/flight-math.js` uses only the constants needed for the plots. The drawing
module is shared by the live SVG diagrams and their static fallbacks. There is
no model loader, original executable, network dependency or continuous
simulation in the article.

`content/flight-native-checks.json` contains **444 isolated original-code cases**:

- 36 coefficient samples, covering all three aircraft and transonic/supersonic
  branches between Mach 0 and 3.
- 144 lift/surface samples, covering 60 to 350 m/s, 0 to 15 km, negative and
  positive angles, the stall branch, failed flaps and all three aircraft.
- 192 thrust samples, including zero/one/two engines, the 60% dry-thrust boundary,
  intermediate throttle, afterburner steps, 10 km, cutoff height and above it.
- 72 nosewheel samples, including upward motion, three compressions, and values
  exactly at and just above each aircraft's two sink-damage thresholds.

`capture-flight-checks.py` creates a fresh native image per aircraft and executes
its complete initializer with an empty loadout. It then executes each original
routine with declared inputs. The surface inputs use the manual controller's
weight-support flap equation, neutral elevator, retracted gear, no air brake or
chute, and zero previous leading-edge fraction. The atmosphere inputs use the
altitude formula with temperature disabled. The wheel samples use a level
basis, no forward/rotational velocity, the native nosewheel offset, healthy
gear, flat ground and enabled gear-damage checks. Only delivery of the resulting
failed-gear notification is intercepted in that routine.

Unicorn runs the x86 routine bodies. The C++ project's existing host-instruction
helpers supply FPTAN during initialization and FSIN/FCOS where needed. The
original startup sets the x87 control word. Fixture fields are decimal numerical
results and declared inputs, not executable bytes or archived game resources.
`check-flight-math.mjs` allows a relative/absolute tolerance of 1e-9 for browser
binary64 arithmetic and requires exact agreement on state flags.

For this article we also reran `check_aerodynamic_airframes.py`: all three full
profiles and 384 initializer pitch calibrations agreed with the original code.
The broader comparisons cited in `docs/verification.md` belong to the existing
reconstruction work.

The lift exhibit is an isolated load calculation. Its lift/weight value is not
the cockpit G calculation, which includes force-axis projection and the cockpit
roll correction. Its leading-edge readout starts from a fresh fraction rather
than carrying the original routine's retained fraction between calls. The
wheel plot shows the normal reaction before summing the other contacts; the
one-third-weight line is a visual reference, not the computed static load on
that particular wheel.

## Illustrations and publication

The force and contact illustrations are original SVG diagrams. Contact points
come from the Eurofighter preset; the aircraft outline is explicitly schematic.
Mach and input-response plots are generated from the described functions.
Two existing original-code 320 × 200 screenshots are reused for the header; their
provenance is in `graphics-sources.md`. No Redux output is presented as original
flight behaviour.

Regenerate all 14 full/compact SVG fallbacks with
`node scripts/make-flight-diagrams.mjs`. The article's build uses only committed
public images, text and the selected CSS/JavaScript modules. The publication
checker rejects game/archive/ROM extensions and resource download controls.
