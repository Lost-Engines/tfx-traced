TFX has a lot going on beyond its three flyable aircraft. Once we could open its model files, we spent a surprising amount of time playing with radar dishes, oil-rig flares, parachutes and aircraft carriers. Even a Scud launcher's lifting mechanism was worth stopping to watch.

We wanted to understand the game well enough to rebuild it. That meant sorting through releases, decoding its archives and tracing everything from mission rules to the music timer. The work eventually became [TFX C++](https://github.com/Lost-Engines/tfx-cpp). The [map explorer](../maps/) and [model gallery](../models/) here let you explore some of what we found along the way.

For the physics behind the flying, [How TFX flies](../flight/) follows the Military-spec model through its forces, control laws, engines and landings, with interactive equations drawn from the original code.

## First, find out which TFX we have

We collected floppy installations, three CD variants, patches, magazine packages and cinematic previews. Several promising finds turned out to be copies of something we already had. Some differed only in their installers or data written during installation. One later CD copy really was damaged: its installer reported a checksum failure, which we could explain by comparing it with another pressing.

We settled on the September 1994 CD's **version 2.05** as the reference. The older copies remained useful whenever we were unsure about a format: seeing the same structure in another release helped us check our interpretation.

The soundtrack was an unexpected complication. The December 1993 and September 1994 discs have effectively the same digital audio, with tiny sample offsets. In between them, the March disc has much louder music, reversed polarity and different timing. At first, its waveform looked as though it had been boosted into clipping. Listening didn't bear that out. We kept both versions; we still don't know how the March transfer was made or why the releases differ in this way.

<span id="the-archive-knew-more-names-than-it-appeared-to"></span>

## Recovering filenames from the archive

The main resource archive, `DID.DAT`, indexes its contents with numbers. Our first extraction was a directory full of anonymous files. The engine, scripts and retained name tables supplied original paths, which let us gradually identify what we had.

We wrote [did-unpack](https://github.com/Lost-Engines/did-unpack) to decode the compressed entries, check the archive and preserve those recovered names. Files we couldn't name kept their numeric identifiers, so we could continue referring to them as the investigation progressed.

The reference archive has **3,488 entries**: models, terrain, music, images and mission programs, each with its own format to work out. The similarly named `TFX.DAT` is the executable. Earlier releases have a custom loader; by 2.05, the program uses a recognisable LE executable layout.

There was more compiler-generated code here than in our earlier Darker investigation. Much of TFX was built with Watcom, alongside specialised assembly and renderer routines that rewrite their own instructions.

## A model is a small program

The **1,012 recovered shapes** contain instructions to build vertices, choose faces, change detail with distance and respond to animation values. They also control drawing order according to the viewing angle. Our early attempt to sort polygons by their centres gave some aircraft see-through fuselages.

Early versions of the viewer had upside-down models and a hospital whose back wall drew over its roof. The hospital and a flat-bed truck proved useful test cases: their surfaces were much easier to follow than the complex shapes of the fighters.

The [gallery](../models/) follows the recovered drawing programs, palettes and identified textures. You can turn the models freely and inspect their different states; the browser handles projection and drawing, so there are still differences from the DOS renderer.

<figure><img src="../images/models.png" alt="Recovered TFX aircraft rendered in the interactive model gallery" loading="lazy"><figcaption>The model gallery runs the drawing programs recovered from the game.</figcaption></figure>

<span id="there-is-a-lot-hiding-in-the-animation-controls"></span>

## Trying the animation controls

The controls started out with names such as “parameter 0”. We had to try them to see what they did. On an aircraft, that number might lower the landing gear. On a SAM site it turns the radar dish. On the Scud launcher it raises the missile, then lowers the supporting arm again.

Other aircraft controls open weapon bays, extend refuelling probes, change the exhaust or start an ejection sequence. A Hercules opens its rear door and drops a box. The pilot model, `ian1`, goes through the seat effects, unfurls a parachute and lets the seat fall away. Vertex movement then gives the parachute its flutter.

Damage varies too. A bridge can switch straight to a wreck, while an aircraft develops fire and smoke through several states. Our first playback controls happily flashed a bridge between intact and destroyed ten times a second. We replaced that with a switch, and gave mechanisms such as landing gear playback that can run forwards and backwards.

Try [the ejecting pilot](../models/#ian1), [the Scud launcher](../models/#ss1_scud) or [the Chinook](../models/#chinook). You can adjust the preview speed. In the game, timing depends on the actor scripts, holds and drawing cadence.

<span id="the-map-is-an-assembly-line"></span>

## Putting the scenery together

Each of the five theatres starts with a 200 × 200 grid. A cell selects a terrain definition, which can choose a variant, rotate it and attach parts at named positions. We recovered **703 valid scenery definitions** for these assemblies.

An oil rig, for example, can have smoke attached separately from its main structure. A runway can be assembled from several parts. Getting their placement wrong made some spectacular messes: missing an attachment point piled objects at the origin, and reusing the model viewer's scale made a runway far too large. We checked the game's drawing calls to recover the proper positions and sizes.

Choosing the right grid caused trouble as well. The archive contains regional maps and extra grids with names such as `yugos_n`. We initially used these extra grids and got floating mountain slopes above road tiles. The game actually selects the regional terrain and applies a separate lighting configuration. The [map explorer](../maps/) now does the same, while keeping the archived grids available for inspection. It also plots mission starts, targets and routes, with the briefings alongside them.

<figure><img src="../images/city.png" alt="Warm amber points marking the roads through reconstructed Yugoslavian city scenery" loading="lazy"><figcaption>Amber street lights in Yugoslavia. Each light is a small mark placed by the model program; the buildings keep their own palette shading.</figcaption></figure>

We particularly wanted to understand those city lights. The model programs check a night flag, then draw one-pixel or two-by-two-pixel marks in warm palette colours. That is enough to turn the same dark streets into a convincing night-time city. There are no light sources illuminating the surrounding buildings.

<span id="the-cockpit-was-telling-the-truth"></span>

## Static screens in the virtual cockpit

We thought we had missed something when the virtual cockpit's MFDs refused to update. Then we checked the game: the original really does use **static pictures on those screens**. The working radar, cameras and instruments are drawn separately in the fixed cockpit view. Redux now puts live instruments into the virtual cockpit, but the original artwork remains in the faithful version.

The [TFX slideshow bundled with Jurassic Park](https://lostengines.com/tfx/analysis/jurassic-park-preview/) shows earlier cockpit layouts. Some screenshots have blank MFDs. The Eurofighter views put weapons information on the right-hand screen; in the later reference cockpit it is on the left. Those promotional pictures gave us a useful glimpse of the design changing during development.

The [cockpit exhibit](../cockpits/) shows the canopy, panels and instrument drawings. Reconstructing them meant keeping track of which pixels each routine actually writes. A deliberately painted black pixel must hide whatever is behind it; a pixel the routine leaves alone must let the view through.

## A playable demo, with the wrong instructions

We spent a long time looking for a playable TFX demo. The July 1994 PC Plus SuperCD finally supplied one, launched with `start cd_mag`.

Its instructions promise **The Doomsday Ship** Flashpoint. Following the menu takes you to **Yugoslavia**. We traced the campaign branches and confirmed the mismatch: the South Atlantic story is in the archive, but the demo's menu doesn't lead to it.

There are five selected training hops and a reduced campaign graph. We found nine resources unique to this version, mostly menus and presentation data. It uses the familiar aircraft and maps to put together its smaller selection of missions.

<span id="inferno-left-fingerprints"></span>

## Inferno in the TFX files

Among the TFX resources were recognisable pieces of Inferno's cockpit. Some other `infcock`-named files still have uncertain origins, so there is more to identify here.

The CD also carries a separate Inferno cinematic preview. That package only plays cinematics, but underneath them is an earlier relative of the TFX engine, including recognisable player-flight, renderer and sound routines. Comparing those routines with retail TFX gave us another version of the code to study. We have left the full Inferno game for its own investigation.

<span id="strange-strings-need-following"></span>

## “Found an Ultra box!”

An unexplained message like that is hard to leave alone. We followed it to a fatal error in the campaign loader. An “Ultra box” is a type of flow node that chooses among destinations without repeating one until it has used the whole list. The error occurs if that node turns up somewhere the loader won't accept it. None of the nine shipped parser graphs we examined uses it.

There is also an interactive branch debugger. It displays a condition and lets an operator force a yes or no answer. We ran it in controlled emulation, though we haven't found a key or command-line option that enables it during normal play.

## The music has several personalities

The synthesised soundtrack has separate FM, LAPC-I/MT-32-family and Sound Canvas arrangements, along with auxiliary sound banks. Even the SC-55 and SCC-1A versions of the same Sound Canvas score sound noticeably different in places. It is worth [listening to the intro on each](../sound/).

Our early renders had a timing error. We had followed the clock requested by each music resource, which made some pieces too slow. Tracing the sequencer together with the game's timer showed that the game actually calls it at about **54.62 ticks per second**, even when the resource asks for something else. The excerpts on this site come from the corrected renders, using emulated sound hardware.

TFX also supports QSound through Creative's ASP/CSP sound-card processor. Following that path took us into firmware loading, spatial tables and the game's pan controller. The resulting [QSound C++](https://github.com/Lost-Engines/qsound-cpp) component is now public. It processes audio using recovered filters and positioning tables; exact arithmetic still needs verification against original hardware.

One oddity remains in TFX's sound definitions. Many request position **33**, while the recovered position table runs from **0 to 32**. We checked the original request and driver code and found no clamp. It looks like an off-by-one error, but we still need to establish what the real processor does with that value.

## Rebuilding gave us better tests

Testing a flight simulator by hand takes patience. A particular interaction might require a long flight, the right target and a carefully timed manoeuvre. To check the reconstruction, we also run original routines with controlled inputs and compare their results with [TFX C++](https://github.com/Lost-Engines/tfx-cpp): aircraft state, events, palette indices and audio commands.

All **128 retail mission launches and their first sixteen Arcade frames** match the captured original state and pixels. We have longer flight comparisons for selected outcomes, and campaign tests that supply results directly to the controller. We haven't played every mission through to completion or checked every possible encounter; the [verification notes](https://github.com/Lost-Engines/tfx-cpp/blob/master/docs/verification.md) describe the coverage.

The faithful version preserves some small renderer bugs. In missile-nose view, distant point models keep the normal projection while polygons use a wider one. A two-pixel marker at the right edge can wrap onto the next row. We fixed those separately in [TFX Redux](https://github.com/Lost-Engines/tfx-redux), alongside higher resolutions, configurable FOV, longer views and the live virtual-cockpit instruments.

Both reconstructions are available to play. For the detailed formats, code references and comparisons, see the [full research archive](https://lostengines.com/tfx/).

For a closer look at the drawing itself, read [How TFX draws a world](../graphics/): an illustrated tour of the graphics pipeline, with the changes we found in Inferno.

There are also separate articles on [campaign progression](../campaigns/),
[the other pilots](../ai/), [flight recording](../recording/),
[the audio system](../audio/) and [testing against the original executable](../testing/).
The [article collection](../articles/) brings them together.
