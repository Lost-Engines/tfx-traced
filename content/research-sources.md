# Sources behind the public account

All paths below are in the independently maintained tfx-reverse checkout unless noted.
This guide is for maintainers; the public article links to the separately published archive.

| Claim | Evidence |
| --- | --- |
| Version selection, damaged media | analysis/versions.md; analysis/rerelease-sector-check.json; analysis/patch-lineage.md |
| CD waveform differences; no asserted remaster provenance | analysis/retained-cd-audio.md; analysis/retained-cd-audio-comparison.json |
| Archive reader and names | analysis/did-unpack.md; did-unpack/README.md |
| Compiler, custom loader, LE layout | analysis/executable-format.md; analysis/engine-builds.md |
| Model VM, axes, painter order, effects | analysis/model-format.md; analysis/models/*checks.json |
| Scene placement, night lights and effects | analysis/terrain-and-scenery.md; analysis/maps/native-checks.json |
| Static virtual MFDs and earlier screenshots | analysis/cockpits.md; analysis/jurassic-park-preview/README.md |
| PC Plus demo readme/menu disagreement | analysis/acquisitions-2026-10-15.md; analysis/pcplus-demo/comparison.json |
| Inferno artwork and engine distinction | analysis/cockpits.md; analysis/engine-builds.md |
| Ultra box and branch debugger | analysis/development-notes.md; analysis/development-checks.json |
| Timer-corrected synth renders | analysis/audio/README.md; analysis/audio/intro-renders.json |
| QSound scope and position 33 | ../qsound-cpp/README.md; docs/verification.md; docs/position-33.md |
| Original/C++ comparison scope | ../tfx-cpp/docs/verification.md; docs/implementation.md |
| Point projection and right-edge wrap | ../tfx-redux/README.md; src/render/model_raster.cpp |

Use “we found” for findings in our investigation. Do not turn that into a claim
that nobody has previously documented the same fact. Do not describe QSound's
analytical output as verified hardware emulation, or the March audio transfer
as an established intentional remaster.

The graphics-engine article has its own [claim map and image provenance](graphics-sources.md), including the TFX/Inferno algorithm comparisons and diagram construction.

The flight-physics article has a separate [claim map and numerical provenance](flight-sources.md), covering the aircraft presets, original routine comparisons and the interactive equations.

The [weapons article source record](weapons-sources.md) documents its original-code
measurements, manual comparisons and ten selected original-renderer screenshots.
