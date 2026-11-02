# Sources for “How TFX draws a world”

Maintainer notes for `content/graphics-engine.md`. This file is not part of the
site build. The article links to public research viewers and reconstructed
source routines rather than publishing executable bytes or raw game resources.

Reference builds: TFX 2.05, September 1994 CD; Inferno CD 1.58.
Source checkouts inspected for this article:

- `tfx-cpp` at `6ff369f`.
- `inferno-cpp` at `a6455bb`.
- `tfx-reverse/analysis` and `inferno-reverse/analysis`, alongside those ports.

The ports include both inspection and original rendering paths. This article
uses the original-model paths. In particular, the generic floating-point
polygon filler in TFX's `software_renderer.cpp` is not the source for the
native scan-conversion description. Redux enhancements are named separately.

## Claim map

Paths in this table are relative to the sibling repository named in the first
column. Native addresses are file offsets in the reference executable.

| Repository | Evidence | Article use |
| --- | --- | --- |
| tfx-reverse | `analysis/executable-format.md` | Watcom C runtime, specialised assembly, self-modifying drawing paths and compiled assets. No assertion of a recovered C++ source language. |
| tfx-reverse | `analysis/terrain-and-scenery.md`, `analysis/world-selection.md` | 200×200 grids, split tile words, column-major reversed-Z addressing, 2,048-unit cells, variants, world versus type, motorway extraction mistake. |
| tfx-cpp | `src/world/terrain_cells.h`, `src/world/scene.cpp`, `src/world/model_placement.cpp` | Ordinary 16-cell neighbourhood, Z-major traversal, immediate/queued parts, submission phases, plane shadows. |
| tfx-cpp | `src/render/point_projection.cpp` | Bounding-radius rejection, separate reciprocal point projection, aperture mismatch. Original `0xcbef0`, `0xc5759`, `0xc57d1`. |
| tfx-reverse | `analysis/model-format.md`, `analysis/models/*checks.json` | Big-endian model programs, load conversion, 32-byte vertex slots, opcodes, local state, carried models, header biases, F-117 scale factors, clouds and jitter. |
| tfx-cpp | `src/models/shape.cpp` | Runtime branch/state semantics and opcode 118 face-depth colour wrapper. |
| tfx-cpp | `src/render/model_metrics.cpp` | Approximate norm for LOD, separate Z+bias queue key. |
| tfx-cpp | `src/math/native.cpp`, `src/math/attitude.h`, `src/render/model_transform.cpp` | Angle units, 1,024 sine samples, negative peak, component/view generators, Q15 coefficients and Q16 camera points. |
| inferno-reverse | `analysis/model-format.md`, rotation/native check reports | Shared sine samples, component versus view matrices, additional instructions. |
| tfx-cpp | `src/render/model_projection.cpp`, `src/render/near_clip.cpp`, `src/render/aperture.h` | Focal lengths 256/128, depth-16 flag, signed division, depth bisection and attribute replay. Original `0xd7d22`, `0xd824e`, `0xd87e0`. |
| inferno-cpp | `src/render/geometry.cpp` | Depth-1 polygon clipping, depth-16 line clipping, screen clipping order. |
| tfx-cpp | `src/render/model_queue.cpp`, `src/render/model_queue.h` | 348 slots, threshold 15 for quicksort partition, insertion pass, reverse drawing, ties, full-buffer slot reuse. Original `0xc488d`, `0xc4930`, `0xc48e1`. |
| tfx-reverse | `analysis/model-format.md` (whole-model ordering, Bedford sections) | Oil-rig biases: water +3,000, structure 0, smoke −100. Bedford cab/bed/windscreen/roof instruction sequence. The article describes the viewer symptom and program order, not a new DOS truck capture. |
| tfx-cpp | `src/render/integer_polygon.cpp` | Screen clipping, reciprocal edge increments, two monotone chains, inclusive endpoints, bottom-first spans, Q7 UVs/Q24 sampling, palette interpolation, post-remap texture transparency. |
| tfx-cpp | `src/render/rounded_curve.h`, `src/render/rounded_model_polygon.cpp` | Incremental quarter-arc construction, camera-space midpoints, eight/fourteen points. Original `0xdaf50`, `0xbc660`. |
| inferno-cpp | `src/render/geometry.cpp`, `src/render/raster.cpp` | Column construction and left-to-right consumption, affine sampling, source-texel transparency, interpolated depth remap rows. |
| tfx-reverse | `analysis/textures.md` | 256×192 row-major `.tm` atlas, global slot bindings, `tripipe` blast scar, native remap-before-zero check. |
| tfx-cpp | `src/render/colour_remap.cpp`, `src/render/palette_lighting.cpp` | 16×256 index maps; ordinary depth shift 9; altitude-dependent palette bank blending and protected colours. |
| tfx-reverse | `analysis/lighting.md`, `analysis/terrain-and-scenery.md` | Night status `0x0080`, authored dot lights, raster patterns, colour indices versus RGB. |
| tfx-cpp | `src/render/model_raster.cpp`, `src/render/pattern_raster.cpp`, `src/render/model_jitter.cpp`, `src/math/native.cpp` | Circle size×128/depth, original circle-row extents, screen-aligned patterns, distinct procedural seeds, jitter and frame reset. The older analysis text calls the size operand a radius; the article states the actual projection and its factor-of-two relationship explicitly. |
| tfx-cpp | `src/render/horizon.cpp` | Projected strips, roll-dependent axis, palette indices 240/224, ground phase. |
| tfx-cpp | `src/render/display_pages.h`, `src/render/display_pages.cpp`, `src/cockpit/frame.cpp`, `src/platform/flight.cpp` | Three retained pages, cockpit refresh, world/cockpit/instrument pass order, instrument camera passes. |
| tfx-reverse | `analysis/cockpits.md`, `tools/native_vga.py` | Compiled x86 overlays, planar footer artwork, coverage versus opaque black, static original virtual MFDs, plane addressing and map masks. |
| inferno-reverse | `analysis/world-format.md`, `analysis/corridor-format.md` | World layers, room drawing flag, independent navigation/collision volumes. No portal-rendering or BSP claim is made. |
| inferno-reverse | `analysis/model-format.md` (sprite binding section) | Runtime sprite scaling code generation at `0x67265`. |
| inferno-cpp | `src/models/renderer.cpp`, `src/render/raster.cpp`, `src/render/painter_queue.h` | Opcode 121 outline collector, canonical projected edge endpoints, duplicate counts and 399-edge limit; opcode 122 shading wrapper; 348 queue entries. |

The article does not reproduce undefined-memory effects or propose further
work on them. Those are outside the reimplementation by project decision.

## Published game frames

All three images are 320×200 indexed PNGs made from existing original-code
captures in `tfx-cpp/build/complete-palette-modes/session/native/`. This session
runs mission 601, `somalia` / `somal_tw`, with recorded control inputs and an
original-code/VGA harness. These are not Redux screenshots or model-viewer
renders. No native capture files are included in this site repository.

| Published PNG | Capture |
| --- | --- |
| `public/images/graphics/tfx-cockpit.png` | `frame-30.indices` and `frame-30.dac` |
| `public/images/graphics/tfx-external.png` | `frame-72.indices` and `frame-72.dac` |
| `public/images/graphics/tfx-infrared.png` | `frame-12.indices` and `frame-12.dac` |

Conversion: place the 64,000 indices in row-major order; set each palette
component to `(recorded_dac_byte & 63) * 255 // 63`. No resizing, interpolation,
compositing or retouching is applied to the screenshots. CSS enlarges them with
nearest-neighbour sampling. The palette comparison uses different moments in
the same flight, as its caption states. Frame 12 has Shift+N night vision
selected; `src/render/palette_selection.cpp` uses the infrared palette bank
for that mode.

The city screenshot is the site's existing `public/images/city.png`, captioned
as an inspection view, not as original raster output.

## Diagrams

Seven diagrams, with three additional compact SVG layouts, are generated by `scripts/make-graphics-diagrams.mjs`. Four have
interactive equivalents in `src/graphics.js`:

- Near clipping uses native signed-depth bisection and Q16 X midpoint arithmetic
  over small inputs. At A=(−12,−8), B=(14,80), it visits depths 36,14,25,19,16,
  giving intersection X=−4.6875 and projected offset −75. The native routine
  stores a decision word and replays it; this illustration updates X alongside
  the same depth decisions.
- Scan conversion illustrates the two-boundary traversal on a pixel grid with
  centre sampling. The article separately explains native reciprocal rounding,
  inclusive endpoints and span consumption. This illustration is not used as
  an original-raster screenshot.
- Texturing shows one receding quad, affine span interpolation versus reciprocal
  depth interpolation. At depth ratio 1 the two mappings coincide.
- Smoke uses the exact native mode-0 and mode-1 screen-coordinate mask tests on
  illustrative circle boundaries. Overlap does not accumulate alpha.

The SVG versions remain visible without JavaScript and when printing. The
interactive versions use only local canvas code and respect device pixel ratio.

## Inspiration

Fabien Sanglard's “Duke Nukem 3D: Build engine internals” supplied the requested
model for an illustrated, code-led explanation. It is linked at the end of the
article. No text, drawings, source excerpts or Build-specific implementation
claims were copied into the TFX account.

## Published asset hashes

- `tfx-cockpit.png`: `dead1357291540e9e2151c295b21e2af6560d5b33521adfd3428557b4cbd91dd`
- `tfx-external.png`: `de43adcf4019d8067b9cdee12402b5aa5ad2014042373d4d67ea03822715d23b`
- `tfx-infrared.png`: `af7965cfb90b827f121f5736c808e7b301b3c7ae94f20fc22e49d7f8dea8502e`
