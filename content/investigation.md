TFX is easy to remember as three glamorous aircraft and a very large collection of missiles. Open its files and the supporting cast turns out to be just as good: moving radar dishes, oil-rig flares, parachutes, aircraft carriers and entire cities assembled out of little drawing programs.

We started with a CD image and a question: could we understand enough of this to rebuild the game? This is the short version of where that led. The [map explorer](../maps/) and [model gallery](../models/) let you try some of the results without installing anything.

## First, find out which TFX we have

A filename is a poor version number. We compared floppy installations, three retained CD variants, patches, magazine packages and a cinematic preview. Some apparent new versions were exact duplicates. Others differed only in installer packaging or machine-specific bytes. One later CD copy really was damaged: its installer complained about a checksum, and comparison with another pressing explained why.

We chose the September 1994 CD's **version 2.05** as our reconstruction reference. The older copies still mattered. They gave us independent examples of the formats and helped distinguish a genuine change from a decoding mistake.

The soundtrack supplied a particularly good surprise. The December 1993 and September 1994 discs contain effectively the same digital audio, with tiny sample offsets. The March disc is substantially different: the music is recognisably the same, but its levels, polarity and timing differ. Listening was essential here. A large, loud waveform is not by itself evidence of clipping, and these comparisons do not tell us who made the transfer or why.

## The archive knew more names than it appeared to

The main resource archive is called `DID.DAT`. Its directory uses numeric identifiers, so the first extraction looked rather anonymous. The engine, scripts and retained name tables supplied enough original path names to put much of it back into context.

We wrote [did-unpack](https://github.com/Lost-Engines/did-unpack) to keep those recovered names, validate the archive and decode its compressed entries. Entries without an established name keep their identifier. Guessing a plausible filename and quietly treating it as fact would have made the next stages much harder.

Our reference archive contains **3,488 entries**. Models, terrain, music, images and mission programs were packed together, but they did not all need the same decoder. The executable was confusing in a different way: `TFX.DAT` is a program despite its suffix. Earlier releases use a custom loader; the reference build exposes an LE executable layout.

TFX also differs from our earlier Darker investigation in its construction. There is substantial Watcom-compiled code alongside specialised assembly and self-modifying renderer paths. Treating the whole thing as either ordinary C or handwritten assembly would miss part of the story.

## A model is a small program

The **1,012 recovered shapes** are not simply lists of triangles. They contain instructions for building vertices, choosing faces, changing detail and responding to state values. Different views can select different drawing orders. Sort every polygon by its centre and a perfectly good aircraft can acquire a see-through fuselage.

This made the first model viewer a useful teacher. We got axes wrong, misread ordering rules and briefly produced hospitals whose back walls covered their roofs. A truck with a flat bed was a better test than another beautiful fighter: it made the remaining overlap problem obvious.

The [gallery](../models/) now follows the recovered drawing programs, palette colours and identified texture bindings. Its projection is an inspection aid, not a claim that a modern browser reproduces every pixel of the DOS renderer.

<figure><img src="../images/models.png" alt="Recovered TFX aircraft rendered in the interactive model gallery" loading="lazy"><figcaption>The original model programs contain much more than the exterior aircraft shapes.</figcaption></figure>

## There is a lot hiding in the animation controls

A number labelled “parameter 0” is not much of an invitation. On an aircraft it may lower the landing gear; on a SAM site it may turn the radar dish. On the Scud launcher it raises the missile and then lowers the supporting arm again.

Other aircraft controls open weapon bays, extend a refuelling probe, change the exhaust or start an ejection sequence. The Hercules can open its rear door and drop a box. The little pilot model, `ian1`, has an entire sequence: seat effects, an opening parachute and the seat falling away.

Damage is not one universal switch either. A bridge may jump directly to a destroyed form. An aircraft can introduce fire and smoke across several states. The viewer therefore uses switches for two-state changes and reversible playback for mechanisms such as undercarriage. Flashing an intact bridge and its wreck back and forth ten times a second was technically an animation, but not a useful one.

Try [the ejecting pilot](../models/#ian1), [the Scud launcher](../models/#ss1_scud) or [the Chinook](../models/#chinook). Playback speed is adjustable; the default is a comfortable inspection speed. In the game, actor scripts, holds and drawing cadence determine the actual timing.

## The map is an assembly line

The five theatres are built from 200 × 200 grids. A cell identifies a terrain definition, which can choose a scenery variant, rotate it and place several parts at named anchors. **703 valid scenery definitions** describe the larger assemblies.

That distinction matters. A runway is not necessarily one runway model, and an oil rig's smoke does not have to be baked into its main shape. Missing an anchor piles the parts at the origin. Applying the standalone model viewer's convenient scale to a whole scene can make a runway enormous. Both mistakes looked superficially plausible until we compared the assemblies with the native drawing calls.

The [map explorer](../maps/) shows recovered terrain and scenery, with mission starts, targets, briefings and routes. Terrain and lighting are separate choices: a night mission uses the same regional ground map with a different lighting configuration. We initially mistook weather-named archived grids for the playable maps, which put floating mountain slopes where motorway tiles should have been. The explorer now follows the game’s selection; those older grids remain available, labelled as archived inspection data.

<figure><img src="../images/city.png" alt="Warm amber points marking the roads through reconstructed Yugoslavian city scenery" loading="lazy"><figcaption>Night streets are drawn with carefully placed palette-coloured points. They do not cast light onto the surrounding buildings.</figcaption></figure>

Those amber city lights deserved their own investigation. The model programs test a night flag and draw authored one-pixel or two-by-two-pixel marks. They are not a separate city texture or a modern lighting system. The effect is wonderfully economical: a few warm points turn the same collection of dark polygons into somewhere inhabited.

## The cockpit was telling the truth

One apparent omission in our viewer turned out to be faithful. The original virtual cockpit uses **static pictures on its MFD faces**. Live radar, cameras and instruments use a separate drawing path. Filling those textured screens with live output would be an enhancement, not a restoration.

Earlier screenshots also show that this design moved around. The TFX slideshow included on a Jurassic Park CD has cockpit pictures with different MFD arrangements, including weapons information on the other side and blank screen faces in some views. A promotional slideshow became useful evidence of an earlier interface.

The [cockpit exhibit](../cockpits/) puts some of these layers side by side. It also explains why a black pixel cannot always mean transparency: the compiled overlay can deliberately paint black, while an untouched pixel needs to leave the scene visible.

## A playable demo, with the wrong instructions

Finding a genuinely playable demo took longer than finding another retail copy. The PC Plus SuperCD package from July 1994 finally supplied one, launched with `start cd_mag`.

Its instructions say the available Flashpoint is **The Doomsday Ship**. Its menu and campaign graph select **Yugoslavia**. The South Atlantic story is present in the archive, but the decoded menu route does not lead into it. That is a rather good reason to inspect the actual branches instead of writing a version history from readme files alone.

The demo contains five selected training hops and a reduced campaign graph. We found nine unique resources, mostly menu and presentation data, rather than a new collection of aircraft or maps. Presence in an archive and accessibility in the game are different questions.

## Inferno left fingerprints

The TFX archive also contains cockpit artwork identified from Inferno. Other `infcock`-named resources remain less conclusively attributed; a suggestive name is not enough to assign every leftover to another game.

The separate Inferno cinematic preview on the CD is interesting for a second reason. Its executable is an earlier relative of the TFX engine, with recognisable player-flight, renderer and sound machinery. The supplied preview is not playable, but that does not make its executable merely a slideshow player. Comparing it gave us another view of the shared engine's development without claiming it represents the finished Inferno game.

## Strange strings need following

“Found an Ultra box!” sounded promising. It is a fatal diagnostic for a particular kind of campaign-flow node appearing where the loader will not accept it. The corresponding top-level mechanism chooses among destinations without repeating a choice until its list is exhausted. None of our nine shipped parser graphs uses that node.

The engine also retains an interactive branch debugger. It can display a condition and let an operator force yes or no. We exercised it in controlled emulation, but found no ordinary key or command-line switch that enables it. Neither finding establishes a secret mission or a new player cheat.

This became a useful rule for the investigation: **a string is a lead, not a discovery on its own**.

## The music has several personalities

CD audio is only part of TFX's sound. The synthesised resources include different FM, LAPC-I/MT-32-family and Sound Canvas arrangements, plus auxiliary sound banks. Even SC-55 and SCC-1A renders of the same Sound Canvas score can use noticeably different instrument sounds.

Getting the notes right was not enough. We traced the original timer and sequencer together. The game calls the music system at about **54.62 ticks per second**, even when a resource requests a different clock. Our first requested-clock auditions were therefore too slow in affected cases. The updated renders follow the game rather than an attractive-looking header value.

The [sound comparison](../sound/) uses short excerpts from those corrected renders. They are emulator outputs, not recordings of physical cards. We kept event timing and hardware identity separate so a different arrangement would not be mistaken for an emulation fault.

TFX's optional QSound support led to [QSound C++](https://github.com/Lost-Engines/qsound-cpp), now public as a separate project. This is Creative's ASP/CSP processing path, not a generic stereo pan effect. Firmware loading, recovered spatial tables and the original game's pan controller are implemented; an analytical audio model is available. Exact DSP output remains unverified because parts of the processor's instruction semantics are still unresolved.

There is a good mystery in the game's inputs too: many sound definitions request position **33**, just beyond the recovered table's **0–32** range. We checked the original request and driver paths and found no clamp there. That makes an off-by-one mistake a plausible interpretation, but it does not prove what the real hardware did with it. The separate project keeps that uncertainty explicit.

## Rebuilding gave us better tests

We then translated the game into [TFX C++](https://github.com/Lost-Engines/tfx-cpp), retaining the original data, flight models and mission rules. The most useful tests execute the original routines with declared inputs and compare the resulting state, events, palette indices or audio commands.

For the baseline renderer, all **128 retail mission launches and their first sixteen Arcade frames** agree with the captured original state and pixels. Longer comparisons cover selected real flight outcomes; campaign-controller tests cover many more supplied outcomes. Those are different kinds of evidence. We have not naturally won every mission or exhausted every possible encounter.

Some tiny renderer quirks were worth preserving in that faithful version and correcting separately: distant point models use the normal projection in missile-nose view while polygons use a wider one, and a two-pixel marker at the right edge can wrap onto the next row. [TFX Redux](https://github.com/Lost-Engines/tfx-redux) is where we deliberately change such behaviour, add arbitrary resolution and FOV, and open the view beyond the old distance limits.

The workbench contains the formats, traces, comparisons and qualifications behind this account. If you would rather spend a while watching a tiny parachute unfold, that is an entirely reasonable use of the [model gallery](../models/#ian1) too.
