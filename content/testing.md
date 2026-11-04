One TFX mission appears to award partial success for destroying some of its enemies. Read the script as ordinary structured code and that is what it says. Execute the original interpreter with five kills, however, and it skips the award. We needed a reconstruction which gave the original answer, including that mistake.

Questions like this became the basis of our testing. We load the old executable into a controlled environment, call a routine with known inputs, and record what it does. Then we give the C++ reconstruction the same inputs and compare the results.

The approach is especially useful for a flight simulator. A brief interaction can require a long flight to arrange. A rare campaign branch can require several missions. A routine call lets us inspect the decision directly, then use complete flight runs to check how it connects to everything around it.

## Loading the code before calling it

Our reference is the September 1994 CD release, version 2.05. Its `TFX.DAT` is an executable despite the extension. The capture tools check its SHA-256 before doing anything, so the addresses and data layouts cannot silently refer to another build.

The file contains a DOS extender and an embedded LE executable. LE describes the program's objects, pages and relocations: where blocks of code and data belong, which file pages initialise them, and which addresses need fixing when they are loaded.

We reconstruct that image in Unicorn, an x86 CPU emulator. Each object gets mapped memory; file pages supply its initial bytes; relocation records repair references between objects. We also provide a stack, segment descriptors and a controlled return address.

Calling a routine then means setting the registers and any stack arguments expected by that routine, starting execution at its relocated address, and stopping when it returns. Many TFX interfaces use Watcom's EAX, EDX, EBX and ECX argument convention. Others, including variadic calls, need a different arrangement.

The disassembly browser uses original file offsets as stable labels. Those offsets are not necessarily the addresses seen by the emulated CPU after loading. Keeping the conversion explicit prevents a large class of otherwise baffling calls into the wrong bytes.

<figure><picture><source media="(max-width:600px)" srcset="../images/articles/testing-harness-small.svg"><img src="../images/articles/testing-harness.svg" width="900" height="520" loading="lazy" alt="Declared inputs go to both a relocated original routine and the reconstructed C++ routine; selected operating-system and device calls are hosted, then outputs and retained state are compared"></picture><figcaption>The same case reaches two implementations. The harness supplies the surrounding environment and records each intercepted dependency.</figcaption></figure>

## Choosing where the experiment begins

A small drawing test may begin with a few vertices and a selected material. A flight test needs considerably more: an aircraft preset, mass, engine state, controls, weather, previous state and the floating-point environment. Initialising only the visibly important fields is rarely enough.

Where practical, we run the original initialisers. This lets the game choose its own constants and retained defaults before we supply the case-specific input. An advanced-flight comparison, for example, executes the original aircraft setup instead of constructing a plausible aircraft from the manual's headline specifications.

The same applies to resource conversion. Some model programs are changed in place by their loader: byte order is converted, opcodes become dispatch offsets and vertex references become byte offsets. Calling the interpreter on unconverted disk bytes would be a test of our setup error.

Self-modifying drawing routines make startup important too. Setup can patch operands which are only placeholders in the file. We need the configured routine, not a static disassembly whose embedded values have never been filled in.

This preparation is part of each experiment. The capture has a defined starting state and a bounded amount of execution. An unexpected dependency or runaway loop stops the capture rather than being replaced by a guessed answer.

## Hosting the calls around a routine

The original code expects DOS files, hardware ports, input devices and other services. We supply the services needed by a particular experiment at explicit call boundaries.

For the flight-recording codec, DOS create, write, seek, read and close operate on a memory buffer owned by the capture. The original encoder still writes its header, compresses its fields, builds its dictionary and patches its final length. The original decoder reads the resulting file. No game installation is modified.

For a mission-result test, the capture supplies combat counters and simple target records. The original target-state reader and result interpreter still execute. This lets us vary the result inputs directly; weapon and collision handling are exercised in separate tests.

For music, we can run the original controller, sequencer and device code while capturing the bytes sent towards the synthesiser. To join the game's thirty-two-bit controller to the original sixteen-bit music code, the harness supplies the protected/real-mode transfer and resource I/O at their interfaces.

Each intercepted dependency carries a reason. Keeping the list beside the results lets us see where a later test should extend the experiment. If an early test supplies target death, a joined test can replace that supply with an actual projectile contact and damage routine.

<p class="engine-source">The shared <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/tools/native_reference.py">native-reference loader</a> handles relocation and calls. The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/tools/check_rules.py">result comparison</a> and <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/tools/check_recording.py">recording comparison</a> show two different choices of hosted boundary.</p>

## Comparing the state the next frame will use

A function's return value is only part of its output. An aircraft controller changes its target, action stack, counters and next command position. A music tick changes channel state even when it emits no note. A renderer can leave a palette selection, transform or random seed for the next draw.

We record those changes along with the immediate output. Where a routine emits requests—play this sample, submit this model, release this weapon—we compare their order and contents too.

The model queue provides a good example. The original and C++ resource managers allocate different handle numbers, so we resolve handles through their own dictionaries before comparing model identity. We still compare the priorities, payload slots, transforms and parameters. The normalisation removes an incidental address difference while leaving the actual scene decisions exposed.

Persistent tests then carry state from one call into the next. Reinitialising everything for every case would hide errors in mute/resume, cooldowns, formation cursors and resource replacement. A hundred individually correct first calls do not exercise the second call after a particular first one.

## Pixels, palettes and an identical-looking failure

TFX draws colour indices into four VGA planes. To capture its original painters, the harness models the relevant port writes, plane masks, memory reads and writes, and latch behaviour. The result is deplaned into a 320 × 200 indexed framebuffer.

We compare those indices and the displayed palette separately. Two indices can currently map to the same RGB colour. A screenshot comparison might accept their substitution, but a later palette change can make them visibly different. Conversely, identical indices under different palettes produce a different displayed picture.

Some tests also record coverage: which pixels the painter actually wrote. A black pixel painted by a cockpit overlay must obscure the view; an untouched pixel leaves it visible. Looking at a finished black background cannot distinguish those cases.

<figure class="research-demo" data-demo="comparison"><div class="demo-picture"><picture><source media="(max-width:600px)" srcset="../images/articles/testing-comparison-small.svg"><img src="../images/articles/testing-comparison.svg" width="900" height="520" loading="lazy" alt="Two small example indexed images with one changed index outlined in red"></picture></div><div class="research-controls" hidden><label>Example <select name="mode"><option value="pixel">One changed colour index</option><option value="alias">Different indices, same visible colour</option><option value="palette">Same indices, changed palette</option><option value="state">Same picture, changed retained state</option></select></label><p class="research-readout" aria-live="polite"></p></div><figcaption>Schematic examples using invented small images. A red outline marks a changed colour index, including cases where the colours happen to match. The actual flight captures compare all 64,000 pixels, the palette and selected retained state.</figcaption></figure>

This is why a tiny discrepancy can be useful. One unexpected pixel along a wing can identify a rounding or endpoint rule. A wrong shadow can reveal that a queued part took the ordinary model path. A matching frame followed by a mismatch can point to retained state which the first image did not reveal.

The [graphics article](../graphics/) follows several of those rules. Here the useful result is a small case we can rerun, with a first differing index and the state around it.

## The floating-point environment was part of the game

TFX's advanced flight model uses x87 floating point. Our early isolated captures used a controlled extended-precision environment. Tracing the original Watcom startup showed that the game selects control word `127F`: masked exceptions, round-to-nearest and fifty-three-bit arithmetic precision.

That differs from assuming the default extended precision simply because x87 has eighty-bit registers. Register storage, intermediate precision and the format of values written to memory are related but separate choices. A different rounding point can propagate through later flight updates.

We therefore execute the original startup precision selection for those comparisons. The C++ numerical entry points use the matching environment and restore the host environment afterwards, including nested calls. Other libraries in the application should not inherit the game's control word accidentally.

There is a further emulator issue. The installed Unicorn implementation narrows some transcendental operations in ways which prevent the raw x87 state from matching. For the affected calls we use explicit host-x87 helpers, passing the raw eighty-bit register values and control word without converting through a Python float. The surrounding original instructions continue to execute.

The helpers belong to the reference harness, where they preserve the arithmetic being compared. The running game uses the translated C++ routines.

<p class="engine-source">The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/tools/native_x87.py">x87 capture adapter</a> names the replaced operations. The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/docs/implementation.md#original-watcom-startup-precision">startup-precision investigation</a> records the control-word finding and the comparisons regenerated under it.</p>

## Making time and randomness repeatable

A repeatable flight needs declared input and timer events. We supply keyboard presses, held keys, mouse input and elapsed ticks at their device boundaries. The original frame loop still decides which work to perform and how to limit or subdivide the elapsed interval.

This preserves details which disappear in a simplistic fixed-step rewrite. Projectiles subdivide longer intervals. Model animation has a separate eligibility gate. A mouse delta can be consumed once while simulation work takes several steps. Different call orders can consume random values in a different sequence.

We also retain the original startup's random consumption. Terrain variants, aircraft decisions and effects can otherwise start from different points in a stream even when we provide the same seed. Procedural drawing jitter has its own state to track.

The designator camera exposed this sort of interaction. It draws a primary world using the inherited camera, then a second world through its gimbal. Skipping the first pass changed the recorded queue and related state even when the visible target view looked sensible. The [recorder article](../recording/#the-designator-draws-twice) describes that case.

## Growing a routine test into a sortie

We build comparisons outwards. A projectile movement routine first receives declared targets and elapsed time. A population test then checks allocation, list traversal, child projectiles and retirement. Joined contacts introduce real collision and damage. A complete flight adds input, aircraft, world state, HUD and the return to the campaign.

Each level catches different failures. A guided projectile can move correctly while the wrong projectile is retired from a full pool. A campaign can interpret results correctly while the flight supplies the wrong result. A save encoder can write the right fields while the menu resumes the wrong statement.

The current reference checks include all 128 retail mission launches and their first sixteen Arcade frames, with matching captured state and indexed pixels. Longer controlled sorties cover selected interceptions, ground attacks, loss, ejection, landing, refuelling and replay. Separate campaign tests supply outcomes to cover branches which would take much longer to reach by flying.

The reports record how each run reached its outcome, so we can see which cases exercised a complete flight and which began at the campaign handoff.

For desktop integration, the application runs in private windows with disposable pilot data and a private audio sink. A read-only debugger observes the relevant handoffs. That checks the real input loop, saving and audio lifecycle without borrowing a player's current career or sending test sound to their speakers.

## Keeping a useful failure

Once an original-code case explains a behaviour, we retain a compact regression where possible. Test-authored inputs and their numerical outputs can run without distributing the executable or game resources. The larger original captures remain research inputs.

The `miss605` example in the [campaign article](../campaigns/#the-award-that-gets-skipped) is a small instance of this process. We supplied twenty-four combinations of completion and kill count, ran the original result handler, and compared the reconstructed one. The page displays those measured results. Its partial-success failure will remain easy to reproduce after the long campaign investigation has faded from memory.

The full [verification record](https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/docs/verification.md) lists the broader coverage and reproduction commands. Manual play still finds cases we did not think to arrange. When it does, the next job is to reduce the report to a controlled original/C++ comparison, so the fix has a lasting test.

<aside class="engine-reading"><h3>Keep exploring</h3><ul><li><a href="../campaigns/">How TFX runs a pilot’s career</a> includes the measured mission-result example.</li><li><a href="../audio/">How TFX makes sound</a> follows a controller through the original sequencer and device events.</li><li><a href="../recording/">Inside the flight recorder</a> shows the byte and queue comparisons.</li><li><a href="https://lostengines.com/tfx/analysis/code/">Native code browser</a> opens the annotated reference executable.</li></ul></aside>
