The TFX intro sounds different on a Sound Blaster, an MT-32-family device and a Sound Canvas. Some of that difference comes from the instruments. Some comes from the score itself: the game has separate arrangements for different devices. Even two Sound Canvas models can give the same arrangement a noticeably different character.

Recreating that sound meant following several layers. The game chooses a cue; a sequencer advances its notes and effects; a device driver turns those events into chip writes or MIDI messages; the hardware produces audio. We initially recovered the scores but played some of them at the wrong speed. The timer which corrected them was in the launcher.

## Three families of scores, four auditions

The archive contains 81 OSL resources: 27 FM, 31 LAPC-I/MT-32-family and 23 Sound Canvas resources. Those totals include auxiliary sound banks as well as compositions. A filename can identify an engine or effect bank rather than another piece of music.

The launcher has indexed filename lists which assign those resources to musical roles. Air superiority, for example, pairs `airsuper.adl`, `airsuper/clean.lap` and `xirsuper.scc`. The names do not match neatly enough for a basename-only catalogue. The indexed lists establish which selection each file serves.

The Sound Canvas score is shared by our SCC-1A and SC-55 auditions. Their firmware and instrument ROMs differ. That gives four useful listening choices from three resource families.

<div class="article-audio">
<div><strong>Sound Blaster FM</strong><span>DOSBox OPL core · dual mono</span><audio controls controlslist="nodownload" preload="none" aria-label="Sound Blaster intro excerpt"><source src="../audio/soundblaster-fm.flac" type="audio/flac"></audio></div>
<div><strong>LAPC-I / CM-32L</strong><span>Munt · CM-32L 1.02</span><audio controls controlslist="nodownload" preload="none" aria-label="CM-32L intro excerpt"><source src="../audio/roland-lapc.flac" type="audio/flac"></audio></div>
<div><strong>Roland SCC-1A</strong><span>Nuked Sound Canvas · SCC-1A 1.30</span><audio controls controlslist="nodownload" preload="none" aria-label="SCC-1A intro excerpt"><source src="../audio/roland-scc1a.flac" type="audio/flac"></audio></div>
<div><strong>Roland SC-55</strong><span>Nuked Sound Canvas · SC-55 1.21</span><audio controls controlslist="nodownload" preload="none" aria-label="SC-55 intro excerpt"><source src="../audio/roland-sc55.flac" type="audio/flac"></audio></div>
</div>

These twenty-second excerpts begin thirty seconds into the corrected intro renders. Starting another player pauses the first. They use emulated hardware, with fixed export gains and no per-card loudness normalisation. The Sound Canvas exports use a lower fixed gain to leave headroom, so listening level alone is a poor way to judge the arrangements.

There are inconsistencies in the original lists too. A path in the LAPC list resolves to an FM resource. Another listed FM path has no archive match. The LAPC intro name has a trailing space: its archive lookup misses, after which the original loader finds it through the DOS loose-file path. These details matter when a seemingly valid resource loader produces silence on one device.

## Rows, channels and device callbacks

OSL music is organised into patterns and rows. A row carries note and effect information for the channels. Compressed rows use masks and packed fields; decoding them supplies the cells that the sequencer will interpret over subsequent ticks.

The playback controller has sixteen resource/playback slots and thirty-two shared channel records. Retained channel state includes pitch changes, portamento, arpeggio and retrigger behaviour, along with cached output values. An effect can continue changing a voice after the row which introduced it.

This gives us several useful observation points. We can compare decoded cells before asking whether the sequencer is correct. We can compare event streams before asking whether a particular synthesiser sounds right. We can compare playback position and retained channel state even during ticks that produce no new note.

<figure><picture><source media="(max-width:600px)" srcset="../images/articles/audio-path-small.svg"><img src="../images/articles/audio-path.svg" width="900" height="520" loading="lazy" alt="Game cues select OSL music; the shared interrupt advances the sequencer, and device drivers produce FM register writes or MIDI before synthesis"></picture><figcaption>The score and the synthesiser meet through a device driver. The game's shared interrupt determines when the sequencer advances.</figcaption></figure>

The FM driver allocates nine voices and translates TFX's instruments, pitch and volume into OPL register writes. The LA driver constructs MIDI messages and patch uploads for the Roland path. Sound Canvas has its own program, controller and system-exclusive messages. Each driver carries behaviour which would be lost by translating only notes into a generic MIDI file.

The FM volume callback is one example. It quantises nonzero channel volume to 127, then its carrier-attenuation helper replaces the patch attenuation. Applying the Roland driver's volume treatment would produce a more conventional result, but it would not reproduce these callbacks.

<p class="engine-source">The reconstructed <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/audio/osl_sequencer.cpp">OSL sequencer</a> and <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/audio/osl_fm_driver.cpp">FM driver</a> separate row/effect processing from device output.</p>

## Why the first renders ran slowly

Our first auditions followed the rate requested by the music resource. Many began at 50 Hz. The notes and instruments were recognisable, but some pieces ran slowly.

The launcher initialises the MEDIT music library with a value which disables the library's private timer programming. TFX already has a shared hardware interrupt, and that interrupt calls the music tick. Its PIT input is 1,193,182 Hz and its divisor is 21,845, hexadecimal `5555`:

```text
1,193,182 / 21,845 = approximately 54.62037 ticks per second
```

A resource can request another clock, but that request does not reprogram this shared interrupt. Even a zero-clock request in `air.rld` does not stop the game calling the sequencer. Our earlier export had stopped there.

For a passage requiring the same number of ticks, 54.62 Hz is about 9.24% faster than 50 Hz, and the passage is about 8.46% shorter. This was a difference in how we drove the recovered player, large enough to hear without inspecting a trace.

<figure class="research-demo" data-demo="clock"><div class="demo-picture"><picture><source media="(max-width:600px)" srcset="../images/articles/audio-clock-small.svg"><img src="../images/articles/audio-clock.svg" width="900" height="520" loading="lazy" alt="A 500-tick passage takes ten seconds at 50 Hz and about 9.154 seconds under TFX's shared timer"></picture></div><div class="research-controls" hidden><label>Passage length in sequencer ticks <input type="range" name="ticks" min="100" max="3000" step="100" value="500"><output data-value="ticks">500</output></label><p class="research-readout" aria-live="polite"></p></div><figcaption>The same number of sequencer ticks under the two clocks. This calculation holds the passage's tick count fixed; it does not assume every row has the same duration.</figcaption></figure>

Converting those interrupts into host audio samples introduces another fraction. At 48 kHz, a tick falls roughly every 878.793 output samples. Rounding that interval to a fixed integer and repeating it would accumulate timing error. We retain the phase as an integer ratio, delivering an event at the first output sample on or after its deadline.

The phase also survives song changes. Restarting the clock whenever a resource changes can shift the next event even when each individual song sounds correct in isolation.

## Music follows the flight

The flight controller can select a continuing cue, request a temporary one, and return to the preceding cue when playback completes. It remembers both the last request and a resume cue. Collision, disabled-aircraft and other state can inhibit those transitions.

The hardware paths select the music differently. LAPC uses a profile of order numbers within a resident resource. FM and Sound Canvas use their selector's resource and order choices. Some requests replace a resource; others start the one already resident. Treating every cue as “load this song from the beginning” loses that behaviour.

Temporary cues use the sequencer's actual playing state to determine when to resume. We do not estimate the end from a nominal duration. Some functions we first labelled as voice requests turned out to be these music transitions, including ejection and ILS cues.

Engine audio shares this machinery on the ordinary Sound Blaster path. With music disabled, the game can select an engine bank and choose its order from throttle. The order calculation truncates `(throttle − 0.6) × 10`, and the controller uses retained throttle and engine-playing state to decide when to refresh it. Turning off background music therefore does not necessarily silence the engine.

The original mute/restart sequence also restores volume, stops the current sequence and reselects the appropriate arrangement. These actions have observable order. The driver and synthesiser remain alive through the change, so existing state and release tails need careful handling.

<p class="engine-source">The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/audio/music_control.cpp">flight music controller</a> owns cue selection and return state; the <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/audio/music_clock.h">sample clock</a> preserves the timer phase.</p>

## Speech has a queue of its own

Sampled effects follow another path. The reference sample bank has 106 native slots, including 103 named unsigned eight-bit PCM resources. Requests can contain concatenated speech, have cooldowns and priorities, and arrive while a previous buffer is still playing.

The standard Sound Blaster scheduler accepts or rejects a request according to its cooldown and priority state. Urgent requests can pre-empt ordinary playback. The sound switch suppresses subsequent requests without necessarily cutting off the current buffer. We had to keep those policies separate from the host audio device's ability to mix samples.

Playback rate comes from the original DSP-rate programming. Its quantised microsecond interval is retained when we convert samples into the host stream. The sample value is held for the appropriate duration, with residual timing carried across buffers and callback boundaries. Simply treating every resource as a modern fixed-rate WAV would lose that scheduling.

Gravis uses a different four-voice effects controller. Entirely resident sequences rotate through voices one to three; a sequence containing streamed data uses voice zero. The rotating cursor can advance even when a busy voice rejects the request. Its sample-RAM planner reserves space for streaming, sorts samples and tries allocations, including the original exact-fit behaviour.

These are differences in the game's device support as well as in the cards' sounds. The Gravis effects path is not another arrangement of the OSL score.

## CD playback is another branch

CD audio uses MSCDEX commands and physical disc track numbers. A presentation audio statement can choose synth or CD; the CD start routine translates its index into the physical track number by adding one.

The original hybrid Sound Blaster/CD setting can use synthesised presentation music and CD playback during flight. That is why a working intro does not by itself establish that the selected in-flight music path is working.

The reconstruction replaces the disc transport with a host stream while keeping the original selection and control decisions. CUE/BIN playback has to account for track numbering and pregaps; local audio files provide another transport. Those choices sit below the game-level controller.

The CD releases also have their own mastering history. December 1993 and September 1994 have effectively matching audio, while the intervening March disc is louder, polarity-reversed and differently timed. That comparison belongs to the [release investigation](../story/#first-find-out-which-tfx-we-have), rather than the OSL sequencer: the CD tracks are already recorded audio.

## The optional QSound processor

TFX also supports spatial processing through Creative's ASP/CSP sound-card processor. Following that support led to firmware loading, filter coefficients, position tables and the game's moving-pan controller. The work became the separate public [QSound C++](https://github.com/Lost-Engines/qsound-cpp) component.

It accepts two PCM sources and produces stereo using recovered filters and positioning tables. Its source includes the numerical coefficients, so ordinary playback needs no firmware download. Filter history persists as positions change and buffers arrive.

Some details still require original-hardware measurements. The chosen rounding and saturation policies, and what happens beyond the recovered position table, have not been verified against a physical card. This matters particularly for TFX because many of its effect definitions request position 33 while the table covers positions zero through 32. The original x86 request and driver paths do not clamp that value.

The component exposes those policies explicitly. Its [verification notes](https://github.com/Lost-Engines/qsound-cpp/blob/master/docs/verification.md) separate the recovered tables, checked x86 control behaviour and implemented audio model. The DSP investigation has enough detail for its own project; here it completes the map of TFX's optional sound paths.

## Listening and measuring

For the music archive, we compare the original sequencer's playback state and complete device events before producing the listening files. The 81 resources yield 104 hardware auditions because the Sound Canvas resources have two hardware renders. Effects banks and repeated compositions are included in those counts.

Each standalone audition ends at the first observed backwards order/row jump or stop, then applies the device's stop operation and a release tail. That boundary avoids repeating the score indefinitely. It does not promise a perfectly seamless PCM loop: voices and reverb can retain sound across the musical jump.

Longer tests keep the original controller, sequencer and device alive across repeated flight/menu lifecycles. Each of the three synth modes has been compared through 128 such cycles, over twenty-one minutes per mode, with matching device events and timestamps. Separate checks exercise sample overlap, voice exhaustion, mute/resume and output-device shutdown.

Those traces help locate a difference. A wrong resource selection begins above the sequencer. A correct sequence arriving at the wrong time points to the clock. Matching events with a different instrument sound points towards the hardware model or its ROMs. Having the layers available separately let us correct the slow renders without changing the notes.

<aside class="engine-reading"><h3>Keep exploring</h3><ul><li><a href="../sound/">Sound comparison</a> keeps the four intro players together.</li><li><a href="https://lostengines.com/tfx/analysis/audio/">Audio research catalogue</a> groups resources by their original selection slots.</li><li><a href="../testing/">Calling the original executable</a> explains how the original controllers and device code become reference traces.</li></ul></aside>
