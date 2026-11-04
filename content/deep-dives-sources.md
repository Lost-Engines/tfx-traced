# Campaign, AI, recording, audio and testing articles

Maintainer evidence for the five articles published on 4 November 2026. This file,
the capture script and native-result fixture stay outside `dist/`. The browser
receives only the small `campaign` and `packing` example arrays, derived from
declared test inputs. No executable bytes, recordings, raw resources or ROMs are
published. The four audio excerpts already belonged to the sound exhibit.

Reference: September 1994 TFX 2.05, executable SHA-256
`2cc41a39fa95a2c9fd883c4220d7bdd9cca00c543c89b019eb270763f59d1d9a`.
Reconstruction inspected: tfx-cpp `6ff369f31402aa9b18add9d7ea4e640ceed19444`.
Paths below are relative to tfx-cpp unless another repository is named.

## Campaigns

- Parser corpus: tfx-reverse `analysis/campaign-flow.md`,
  `analysis/game-logic.md`, `analysis/presentations/programs.json`.
- Action/yield/return semantics: `src/presentation/program.*`, `runtime.*`,
  `session.*`; `tools/native_campaign.py`, `check_campaign_segments.py`.
- FINISH language, signed-word predicates, 32-bit assignment, common statistics,
  retained miss_val and brace cleanup: `src/missions/rules.cpp` and
  `tools/check_rules.py`; native result entry `0x7ae80` and cleanup `0x7aafc`.
- miss605 source: identifier `9558dca3`, FINISH block. The quoted 14-line block
  preserves its conditions and awards, reformatted as an explanatory excerpt.
- Save schema and continuation: `src/presentation/save.*`, `pilots.*`.
  Training marker bytes are from `pilot_store::trained/complete_training`.
- Career breadth and counts: `docs/verification.md`,
  `tools/check_campaign_journeys.py` and `docs/implementation.md` under
  “Persistent campaign and long-session closeout”. The article explicitly
  distinguishes supplied-return journeys from natural flight returns.

The interactive result table has 24 measured cases: completed 0/1 and kills
0–11, all other supplied counters and initial campaign variables zero. Both the
original handler and the built `rules_probe` agree. Eleven kills is a synthetic
condition probe, not a claim about the ordinary mission population. Common
num_hours increments by one in every case; the exhibit displays only result,
score and completed-mission increment. It uses the returned table rather than
inventing a simplified implementation of the FINISH interpreter.

## AI

- Record and command counts, CBN header/steps: tfx-reverse
  `analysis/compiled-programs.md` and its native-check JSON reports.
- Shared mutable programs, formation following, scanning, player/stealth path,
  action stack, manoeuvre selection/alignment, combat and cooldowns:
  `src/actors/air.cpp`, `air.h`; native acquisition `0x76a78`.
- Rate/acceleration limits, turn envelope and the DESTROYER overread:
  `src/actors/air_motion.cpp`; aircraft missions 721/923 and five environment
  programs documented under “Airborne waypoint runtime” in implementation notes.
- Synchronous requests, threat transfer, death: implementation notes under
  “Air combat controllers and projectile motion” and “Projectile populations”.
- Corpus combat count: `tools/check_air.py`, 192 programs × 1,024 updates with
  the documented actor populations = 2,823,168 actor updates; inputs and captured
  downstream requests are described in the article.

The scan diagram illustrates **unsuccessful visits only**, with no player or
incoming-threat branch. It advances six candidates through 50 slots and wraps.
It makes no timing claim in seconds or display frames and does not simulate a
complete targeting encounter. Actual acquisition may stop at an eligible slot.

## Recording

- Format, compressor, dictionary, capacity and codec comparison:
  `docs/recording.md`, `src/recording/file.*`, `tools/check_recording.py`.
- Camera-space origins, retained context, infrared palette, fixed replay pace,
  introductions and caption: `docs/recording.md`, `src/recording/playback.*`,
  `tools/check_recording_playback.py`.
- Primary/designator camera ordering and live comparisons:
  `tools/check_recording_session.py`; docs/recording.md.
- 508-frame natural training integration and file-counter protection are from
  the same document. The limit is explicitly called a C++ host protection.

Five compressor examples execute original `0xc5958`, with fill in AL, source
pointer in EDX and length in EBX. DATA `0x20cdc` points to the intercepted
file-write callback. Its bytes go to a capture-owned memory buffer. Both length
writes and run bytes are original output. Cases include an empty field, a
256-byte fill run, default scale one and an expanding alternating pattern.
The shared JS encoder is checked against these outputs. These are invented
inputs, not excerpts from a game recording.

## Audio

- Resource counts, hardware/ROM identities, excerpt provenance and gain policy:
  tfx-reverse `analysis/audio/README.md`, `music-renders.json`; the existing
  sound exhibit's four 20-second excerpts start at 30 seconds.
- Loader inconsistencies and roles: `scene-music.json` and the audio README;
  padded LAPC intro fallback also appears in `docs/implementation.md`.
- Slots, row/effect state and device behaviours: `src/audio/osl_resource.*`,
  `osl_sequencer.*`, `osl_fm_driver.*`, `osl_la_driver.*`, `osl_scc_driver.*`;
  native comparisons described in implementation notes.
- Shared PIT: `src/simulation/timing.h`, `src/audio/music_clock.h`,
  `tools/check_osl_sequencer.py --host-irq`. Frequency is exactly the ratio
  1,193,182/21,845; the chart uses integer tick counts and double-precision division.
- Cue and throttle state: `src/audio/music_control.cpp`; device families have
  different order/resource selection. Transient cue completion comes from the
  sequencer's playing state.
- Sample counts, cooldown/priority, DSP rates and Gravis allocation/scheduling:
  `src/audio/sample_*`, `gus_*`, implementation notes and `docs/verification.md`.
- CD transport: `src/audio/cd_player.*`, `docs/verification.md`; CD mastering
  comparison: tfx-reverse `analysis/retained-cd-audio.md`.
- QSound: sibling qsound-cpp `README.md`, `docs/verification.md`,
  `docs/position-33.md`. Current usable component and remaining hardware
  arithmetic/addressing uncertainty are stated together. No unpublished DBOPL
  note is used or linked.
- Persistent 128-cycle audio comparisons are the recorded verification coverage,
  not a claim that this editorial change reran those long tests.

## Testing original code

- LE loader, mapped objects, relocations, register calls and declared intercepts:
  `tools/native_reference.py`; reference file layout also in tfx-reverse
  `analysis/executable-format.md`.
- VGA planes and coverage: `tools/native_vga.py`, full-frame path in
  `tools/capture_native_flight.py`.
- Native initialisation, startup precision 0x127f, timing/input and camera order:
  `tools/capture_native_flight.py`, `tools/check_fpu_environment.py`,
  `tools/native_x87.py`, `docs/implementation.md` at the linked anchors.
- Scope/counts for launch frames, complete sorties and campaigns:
  `docs/verification.md`; that summary is dated 19 October, and its historical
  CI-status note is not repeated as a current publication fact.
- Private-window observation uses existing `check_window_*` and
  `check_campaign_flights.py`; no new desktop session is claimed here.

The comparison exhibit is labelled schematic. It uses invented 8×6 arrays to
show an index error, equal RGB values at different indices, palette changes and
hidden-state changes. It is not presented as a native screenshot or a measured
flight failure. No game pixels are modified to suggest a historical bug.

## Reproduction and editorial checks

Capture the two original-code numerical examples with:

```sh
/path/to/native-python scripts/capture-deep-dive-checks.py \
  --cpp ../tfx-cpp --research ../tfx-reverse \
  --output content/deep-dive-native-checks.json
node scripts/make-deep-dive-diagrams.mjs
npm run build
npm run check
```

The source checkout and built rules_probe are read; originals are never written.
The diagram generator produces desktop and compact SVGs from the same functions
as the browser. `check-deep-dives.mjs --check` verifies original compression
outputs, the search wrap, timing and illustrative comparison modes, then checks
that the SVGs are current. Public prose has been read as prose, separately from
these mechanical checks; factual qualifications belong with their examples.
