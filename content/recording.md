TFX can turn a completed sortie into a little television event. Its post-flight recording path plays the WNN and press-room introductions, then shows the flight again with a blinking `PLAY` caption. Alt+V starts and stops the recording while we fly.

The file behind that sequence is unusually close to the renderer. Each frame saves a list of model submissions: which shapes were queued, where they sat relative to the camera, how they were oriented and which animation states they used. Playback draws that list again.

Following this format helped us repair more than the recorder. It exposed the order of the laser designator's camera passes and gave us another way to compare the original engine with the reconstruction.

## The recording point inside the renderer

Before drawing a scene, TFX assembles a queue of model parts. A part might be an aircraft body, a piece of scenery, an effect or a ground shadow. Its queue entry supplies the drawing priority and a reference to the slot holding the part's state.

The recorder captures that queue. The original has room for 348 model slots, so a frame contains a bounded collection of parts. It also saves three view-angle words and eight reserved bytes from a global state area. We have not identified a retail producer for those reserved bytes.

<figure><picture><source media="(max-width:600px)" srcset="../images/articles/recording-flow-small.svg"><img src="../images/articles/recording-flow.svg" width="900" height="520" loading="lazy" alt="Flight submits model parts to a drawing queue; recording saves queue fields, while replay reloads them and sends them to the renderer without advancing flight"></picture><figcaption>Recording takes its scene at the model queue. Replay supplies that queue to the drawing code while the flight simulation stays still.</figcaption></figure>

This choice avoids storing 64,000 screen pixels for every frame. It also avoids having to replay all the controls, random decisions, mission rules and collisions which produced the scene. The saved part already has a position and an animation value.

It has limits. The file describes the submitted scene from its recorded camera. It does not contain a complete independent world which we can revisit from any viewpoint. Immediate scratch submissions bypassing the queue are absent, and the recording leaves some rendering context to the live flight.

Those limits are visible in the original playback code, so reproducing a recording requires more than decoding a list of coordinates.

## A frame is stored by field

Within a frame, TFX groups values of the same kind together. It writes all queue priorities, then all queue slot references; later it writes all X origins, all Y origins and all Z origins. Animation parameters form another block.

This arrangement puts many similar values beside one another. Successive parts often share a state or scale. Many angle bytes are zero, and a long animation-parameter block can contain only a few nonzero values. Those fields are good candidates for a very small compressor.

The main per-part fields are:

| Field | What playback recovers |
| --- | --- |
| Priority and slot | The queue's order metadata and the corresponding model slot |
| Drawing path | Unrotated model, rotated model or ground shadow |
| Initial state and scale | Inputs retained by the drawing constructor |
| Colour row | The selected colour-remapping row |
| Resource handle | Which model program to use |
| Three angles | The part's orientation |
| Three signed origins | Its position in camera space |
| Eight parameter bytes | Gear, damage and other model-program state |

The drawing-path byte uses values 40, 44 and 56 for the three paths. These are part of the recorded interface to the renderer. Treating a shadow as an ordinary rotated model would decode the coordinates successfully and still draw the wrong thing.

The queue metadata is also preserved before drawing. Recording only a final sorted list would lose the original priority/slot representation and make it harder to identify differences in submission order. Our comparisons retain both.

## Counting the bytes that are usually zero

The compressor alternates two counts: a run of a chosen fill byte, followed by a run of literal bytes. Most compressed fields use zero as their fill byte. Scale uses one, its common value.

For example, the input `00 00 00 07 08 00 00`, with zero as the fill byte, becomes:

```text
03 02 07 08   02 00
│  │  └───   │  └─ no following literals
│  │         └──── two fill bytes
│  └────────────── two literal bytes
└───────────────── three fill bytes
```

There is also a two-byte little-endian length before the compressed block. The complete stored field for that example is therefore `06 00 03 02 07 08 02 00`. Seven input bytes have taken eight stored bytes: the length and run overhead can outweigh the saving on a small field.

<figure class="research-demo" data-demo="packing"><div class="demo-picture"><picture><source media="(max-width:600px)" srcset="../images/articles/recording-packing-small.svg"><img src="../images/articles/recording-packing.svg" width="900" height="520" loading="lazy" alt="Seven input bytes become six run-coded bytes plus a two-byte length, using the original recording compressor"></picture></div><div class="research-controls" hidden><label>Example <select name="example"><option value="0">Sparse parameters</option><option value="1">Default scales</option><option value="2">Alternating bytes</option><option value="3">A 256-byte run</option><option value="4">Empty field</option></select></label><p class="research-readout" aria-live="polite"></p></div><figcaption>These outputs were captured from the original compressor. The examples show both useful runs and cases where the encoding grows. The displayed stored size includes the two-byte length.</figcaption></figure>

Both counts are single bytes, so a run stops at 255. A sequence of 256 zeros needs another pair of counts for its final zero. Even a trailing fill-only run writes a zero literal count. An empty field still writes its zero length.

The original uses a 2 KiB scratch buffer for each compressed field. The buffer and byte-sized counts are useful boundary tests: ordinary all-zero arrays exercise very little of the encoder, while long runs and alternating values expose its exact splitting rules.

<p class="engine-source">The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/recording/file.cpp">file codec</a> follows the native field order and fill/literal encoding. The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/docs/recording.md">format notes</a> give every field and the original entry points.</p>

## Remembering what a handle meant

A runtime model handle is only a number in the current resource manager. Another run can allocate the same model under a different number. A recording therefore needs a dictionary connecting its handles to resource names.

TFX writes the dictionary after the frame data. It stores an entry count, the original handles, the total name-byte count and NUL-terminated names. The first two entries have no stored names; playback supplies `badshape.3` for entry one. The native reader reserves space for a thousand entries.

The file begins with a ten-byte header: a two-byte frame count, four-byte file length and four-byte dictionary offset. The final length and dictionary position are patched when recording closes. Playback can read the dictionary first, resolve the models, and then process one frame at a time.

This is also why our comparison has to recognise models by name. The original and C++ resource managers allocate independently. Requiring their incidental handle numbers to agree would reject equivalent frames; ignoring model identity would accept the wrong shape. We resolve each handle through its own dictionary, then compare the named submissions and their remaining fields.

## What remains outside the file

The recording saves view angles and camera-space model origins, but omits camera height, scrolling ground phase, the drawing seed, some status/detail flags and carried-model bindings. Original playback inherits these from the flight context.

The reconstruction consequently keeps the actual scene and renderer alive for replay. It does not initialise a fresh generic scene and hope the omitted values happen to match. It also keeps the attachments used by carried submodels. No mission rules, aircraft AI or flight physics advance while those recorded frames are drawn.

Playback restores the full-screen 3D viewport and uploads the environment's infrared palette. It then draws frames at four PIT ticks apiece, approximately 13.65 frames per second under the game's timer. The file has no per-frame timestamp field to reproduce a variable capture cadence. Its view of time is a sequence of saved frames played at this fixed pace.

The `PLAY` caption alternates each frame. It uses a small driver font with eight drawn columns and a nine-pixel advance, distinct from the presentation fonts. That was enough to produce a pixel mismatch when we first substituted a convenient existing font.

The preface animations also have their own timing: a forty-retrace fade-in and a one-BIOS-tick frame delay. The original prefaces do not poll keyboard input; the recorded-flight loop clears pending make codes and accepts a new key to leave playback.

## The designator draws twice

One recorder comparison disagreed even though the displayed targeting view looked sensible. The reason was the camera that existed at the moment the queue was recorded.

For the laser-designator viewport, the primary world pass uses the camera already installed in the renderer. The visible designator callback then installs its gimbal camera and draws a second world. The recorder sees the first queue.

That first pass contains current actor and effect state. It is not simply an old picture being replayed. Sky, transient effects, precipitation and seeker work happen in the primary pass; the second pass has its own relationship with the animation gate. Cameras used by MFDs can also leave state which the next pass inherits.

Our earlier integration jumped directly to the visible gimbal view. Recording made the missing pass obvious, because the saved queue exposed exactly which camera and submissions had been used. Restoring the call order fixed the recording and brought the related render state into agreement.

The [graphics article](../graphics/#the-cockpit-is-partly-executable-artwork) describes the extra world views inside the cockpit. The recorder adds a useful observation point between submitting a scene and displaying its final picture.

## Checking files and checking a flight

We first tested the codec with synthetic queues. The original writer produced forty-eight complete files containing ninety-six frames, and the C++ codec matched them byte for byte. The cases include empty and full queues, all three drawing paths, signed priorities, sparse parameters, long runs and large dictionaries. The original reader then restored the supplied fields.

We separately compared queues captured during live original and reconstructed flight, including camera changes and designator use. Playback tests executed the original reader, model remapping, horizon, queue drawing and caption, comparing the indexed pixels and uploaded palette.

Finally, an ordinary training engagement used real controls to record 508 frames, complete the target, play both introductions and the recorded flight, then continue through the debriefing into the next hop. That checked the recorder's place in the campaign as well as the format itself.

There is one deliberate host protection in the C++ writer: it closes cleanly at 65,535 frames. The original two-byte counter can wrap into a zero-frame file. The limit belongs to the file format, so silently extending it would produce recordings the original reader could not understand.

<aside class="engine-reading"><h3>Keep exploring</h3><ul><li><a href="../graphics/">How TFX draws a world</a> follows the queue into the original renderer.</li><li><a href="../campaigns/">How TFX runs a pilot’s career</a> follows the program which resumes after replay.</li><li><a href="../testing/">Calling the original executable</a> explains the file and pixel comparisons.</li></ul></aside>
