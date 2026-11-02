Select an AGM 109 H in the Nighthawk and the aircraft can announce a lock while it is still sitting on the runway. There is no radar contact to acquire and no laser spot to find. The missile already has somewhere to go.

That little detail leads into a surprisingly complicated armoury. TFX has weapons that chase aircraft, weapons that follow a designated point, dispensers that scatter smaller projectiles, and bombs that stop moving horizontally halfway through their descent. Their names suggest quite different technologies. Underneath, many share the same handful of movement routines.

We followed the weapons in TFX 2.05 from the loadout screen through launch, guidance, collision and damage. Along the way, we found some useful tactical distinctions, some generous shortcuts, and several places where the manual describes a different weapon from the one the code delivers.

## What leaves the pylon

The loadout screen is displaying small, working 3D models. A carried weapon, its released version and its later flying appearance can each have a separate object definition. Those definitions contain more than geometry: they also supply collision behaviour, damage and animation.

<figure class="engine-pair">
<img src="../images/weapons/loadout-air.png" width="320" height="200" loading="lazy" alt="Original Eurofighter arming screen showing AIM 9S, AIM 9L, ASRAAM, AMRAAM, AAAM and AA-ARM models">
<img src="../images/weapons/loadout-missiles.png" width="320" height="200" loading="lazy" alt="Original F-117 arming screen showing Maverick, AGM 109 H, HARM, Sidearm and Harpoon models">
<figcaption>The original loadout renderer, showing the air-to-air and ground-attack selections. The right-hand illustrations are rotating models, not inventory icons.</figcaption>
</figure>

The executable has 27 weapon records. Alongside the selectable armament are the cannon projectile, external tank, chaff, flare, cargo box and a generic bomblet called `shoot`. A record specifies the permitted mounts, carried mass, targeting category, range operand, model names and a short sequence of movement stages.

A missile's sequence might read:

<figure class="weapon-stages">
<ol><li><strong>Attached</strong><span>Follow the aircraft’s release point.</span></li><li><strong>Falling</strong><span>Move forward and drop clear.</span></li><li><strong>Boost</strong><span>Add speed on every update.</span></li><li><strong>Guided</strong><span>Turn towards the target and spend the remaining range.</span></li></ol>
<figcaption>The common missile sequence. Bombs, dispensers and the cannon choose different combinations of the same callbacks.</figcaption>
</figure>

At release, the projectile inherits the aircraft's pitch, heading and scalar speed. Its initial roll is zero. During the attached stage, a player-launched store follows its moving mount, but its stored launch angles stay fixed. Banking or pitching sharply while it leaves the aircraft can therefore produce a less tidy departure than the model's attachment suggests. Computer-controlled launches skip the normal mounted wait.

The usual attached interval is 25 ticks. AIM 9S and AIM 9L then fall for 125 ticks; ASRAAM and most other powered missiles fall for 75. The smaller delay gives ASRAAM a genuine practical advantage over the Sidewinders even before guidance begins. Guided bombs use 125 falling ticks; the Mk 82 uses 200 before entering its long ballistic stage.

TFX's shared hardware clock runs at about 54.62 ticks per second, while several physical conversions assume 50. Thus 25 + 125 ticks is roughly 2.75 seconds of clock time. Stage changes happen at update boundaries, so a particular launch can take slightly longer. The update which expires a stage still finishes that stage's movement; unused time is not carried into the next stage.

These weapon routines are shared across the flight-model settings. Choosing Military-spec changes the aircraft carrying the weapons, not the missile into a more elaborate aerodynamic simulation.

<p class="engine-source">The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/weapons/definition.cpp">weapon-record decoder</a> and <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/weapons/projectile.cpp">movement routines</a> retain the original table fields and stage transitions.</p>

## Range is a budget, speed is a recipe

The manual gives most powered weapons a maximum speed in Mach and a maximum range. The game has a range value, but no corresponding Mach limit or target speed in the weapon record.

The following table puts the handbook's figures alongside the range operand used by the game. The latter is converted from world units to kilometres. It is a **guided-flight distance budget**, not a promise that the weapon can hit anything inside that radius.

<div class="engine-table" role="region" aria-label="Missile range and speed comparison" tabindex="0">
<table><thead><tr><th scope="col">Weapon</th><th scope="col">Manual range</th><th scope="col">Game budget</th><th scope="col">Manual speed</th><th scope="col">Boost ticks</th></tr></thead><tbody>
<tr><th scope="row">AIM 9S / AIM 9L</th><td>9.92 miles</td><td>16.1 km</td><td>Mach 2</td><td>50</td></tr>
<tr><th scope="row">ASRAAM</th><td>9.3 miles</td><td>15.1 km</td><td>Mach 3</td><td>50</td></tr>
<tr><th scope="row">AMRAAM</th><td>29.76 miles</td><td>48.2 km</td><td>Mach 4</td><td>120</td></tr>
<tr><th scope="row">AAAM</th><td>124 miles in the table; 70 in the text</td><td>200.9 km</td><td>Mach 6</td><td>50</td></tr>
<tr><th scope="row">AA-ARM</th><td>124 miles</td><td>200.9 km</td><td>Mach 5</td><td>120</td></tr>
<tr><th scope="row">AGM 65D Maverick</th><td>24.8 miles</td><td>40.2 km</td><td>Mach 1.5</td><td>50</td></tr>
<tr><th scope="row">AGM 109 H</th><td>509 km in the table; 186 miles in the text</td><td>511.4 km</td><td>Mach 0.60</td><td>100</td></tr>
<tr><th scope="row">AGM 88 HARM</th><td>11.16 miles</td><td>18.1 km</td><td>Mach 2</td><td>120</td></tr>
<tr><th scope="row">AGM 122A Sidearm</th><td>4.96 miles</td><td>8.0 km</td><td>Mach 3</td><td>100</td></tr>
<tr><th scope="row">AGM 84 Harpoon</th><td>57.04 miles</td><td>92.4 km</td><td>Mach 0.75</td><td>100</td></tr>
</tbody></table></div>

The broad range choices agree reasonably well with the manual. The exceptions start when we ask what the numbers actually control.

A guided update subtracts the distance travelled from the remaining budget. A turning missile spends it along its curved path, so a fleeing or manoeuvring target can exhaust the weapon well inside its advertised range. Travel during the preceding fall and boost does not consume this budget. Although the stage record also contains a timer, ordinary guidance does not count it down: remaining range ends the stage. Conversely, the large number stored for an unguided bomb is not a 200 km bombing capability: its ballistic stages do not use the guided-range calculation at all.

Speed is stranger. The boost routine maintains an acceleration accumulator, initially 25:

<pre><code>speed += acceleration &gt;&gt; 2
acceleration = min(acceleration + 16 × elapsed_ticks, 200)
move_forward(speed × elapsed_ticks)</code></pre>

The accumulator's growth uses elapsed time. The addition to speed does not. Once the accumulator reaches 200, **each call adds 50 speed units**, whether that call covers four ticks or ten. The projectile manager divides long frames into steps of at most ten ticks, but that still leaves a substantial difference between update cadences. Military-spec normally caps the world step at four ticks; other flight modes and time acceleration can supply larger steps.

We ran the original routines with the same launch speed, 190.5 m/s, and two fixed update intervals:

<figure>
<picture><source media="(max-width:600px)" srcset="../images/weapons/boost-small.svg"><img src="../images/weapons/boost.svg" width="720" height="382" loading="lazy" alt="Original-code measurements: a 50-tick boost reaches 460 metres per second with four-tick updates but 287 with ten-tick updates; 100-tick and 120-tick boosts show the same dependence"></picture>
<figcaption>Speed on entering guidance, measured from the original projectile state. Metres per second use the flight model’s 50-tick conversion. The six measurements hold launch speed and weapon parameters fixed.</figcaption>
</figure>

At four ticks per update, AIM 9S, AIM 9L, ASRAAM, AAAM and Maverick all emerge from their 50-tick boost at about **460 m/s**. AMRAAM, AA-ARM and HARM reach about **865 m/s**. AGM 109 H, Sidearm and Harpoon reach about **746 m/s**. These are examples from one controlled launch, not fixed speeds of those weapons. A faster aircraft supplies a faster starting value; a different update cadence changes the boost gain.

That reverses some of the handbook's comparisons. AAAM's printed Mach 6 does not make it faster than AMRAAM. Sidearm's printed Mach 3 does not make it faster than HARM. The supposedly subsonic cruise missile and Harpoon use the same 100-tick boost as Sidearm.

After boost, ordinary guidance retains that scalar speed. It does not calculate air density, motor burnout drag, energy lost in a turn or a terminal velocity. Guided bombs use this same constant-speed movement without a boost stage.

## Getting a lock

The game separates **finding a target**, **acquiring it**, and **steering towards it after launch**. The three stages have different limits.

The aircraft contact list holds 20 entries. Its broad scan accepts contacts within a horizontal square extending just under 50 miles in each map axis. Height does not enter that first test. Thus an air-to-air weapon with a 201 km budget does not get a 201 km acquisition system. A target near a diagonal corner of the scan square can be farther away than one directly ahead.

For an ordinary air-to-air acquisition, the target must lie within about **25.3° of the aircraft's heading and pitch**, tested separately. There is also a minimum separation, normally 30 world units, about 73 metres. Friendly aircraft fail the weapon-lock check; neutral aircraft are allowed through it.

For the rear-aspect category, TFX compares the headings of the two aircraft. They must differ by no more than **45°**. It does not compute the missile seeker's view of a three-dimensional exhaust cone. Flying roughly the same direction is the decisive extra condition.

The small aiming reticle then moves towards the projected target, at a nominal 15 original screen pixels per model second. Lock arrives when the reticle catches it. Although there is a 500-tick field in this controller, it is not a compulsory ten-second acquisition delay. A target already under the reticle can lock promptly; one near the edge takes longer.

This makes two table choices particularly revealing:

<div class="engine-table" role="region" aria-label="Air-to-air seeker categories" tabindex="0">
<table><thead><tr><th scope="col">Weapons</th><th scope="col">Acquisition</th><th scope="col">After launch</th><th scope="col">Decoy accepted</th></tr></thead><tbody>
<tr><th scope="row">AIM 9S, ASRAAM</th><td>Rear-aspect heading check</td><td>About 60° pitch and heading tracking limits</td><td>Flare</td></tr>
<tr><th scope="row">AIM 9L, AMRAAM, AAAM</th><td>No rear-aspect check</td><td>No 60° tracking limit</td><td>Chaff</td></tr>
<tr><th scope="row">AA-ARM</th><td>No rear-aspect check</td><td>About 60° pitch and heading tracking limits</td><td>Either</td></tr>
</tbody></table></div>

**ASRAAM is described as all-aspect infrared in the manual, but shares AIM 9S's rear-aspect category. AIM 9L is described as infrared, but shares the radar missiles' chaff and ECM category.** These are consequences of the actual category bytes and their consumers, not deductions from how the models look.

There are further rough edges in the range check. It compares signed 16-bit pieces of horizontal separations, rather than a clean spherical distance. The HUD's `IN RNG` calculation uses another distance estimate. We should therefore read `IN RNG` and `LOCK` as the outputs of two specific tests, not as a full assessment of whether a shot will succeed. Air-to-air lock is not a general trigger interlock, either: the missile can be released before one is established.

<p class="engine-source">Acquisition, contact-slot retention and the reticle chase are reconstructed in <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/sensors/air.cpp">air.cpp</a>. The targeting category comes directly from each original weapon record.</p>

## How a missile turns

Once airborne and guided, the missile asks a simple question: which pitch and heading point from my current position to my target's current position?

It turns towards those angles, with a limit of **140 angle units per elapsed tick on each axis**. A complete turn is 65,536 units, so this corresponds to about 38.45° per model second, or 42.0° per second of the unclamped hardware clock.

<pre><code>desired = bearing(missile_position, target_position)
error = desired - missile_angles
turn_limit = 140 × elapsed_ticks
missile_angles += clamp(error, -turn_limit, +turn_limit)
move_forward(speed × elapsed_ticks)</code></pre>

This is pure pursuit: chase where the target is now. There is no prediction of where the target will be when the missile arrives, and no proportional-navigation calculation based on the rotation of the line of sight.

The same angular rate serves very different weapons. At the measured 460 m/s, a sustained maximum-rate horizontal turn has a radius of roughly 686 metres using model time. At 865 m/s it is roughly 1,289 metres. More speed can make a missile worse at staying inside a tight turn, even though it catches a straight-flying target sooner.

For categories with the tracking limit, both angular errors must be less than about 59.8°. Outside that region, the weapon does not make a fresh search for another aircraft. It pitches down towards roughly 60° instead. Categories used by AIM 9L, AMRAAM, AAAM, guided bombs, Maverick, CSW and Harpoon bypass this limit and continue turning even towards a target behind them.

There are some distinctly economical calculations here. Pitch bearing uses the larger horizontal separation rather than the true horizontal hypotenuse. The signed-angle subtraction can also choose the long turn across the ±180° boundary. A missile which seems to make a surprisingly wide detour may be following those arithmetic rules quite faithfully.

Targets are references, not permanent promises of a live enemy. Destroying an aircraft does not immediately dispose of every missile already chasing its position. A surviving projectile can circle the wreck's location until its remaining range is spent or a contact retires it. Ground impact is still checked; the guidance routine simply has no special “target died, stop pursuing” manoeuvre.

<figure class="engine-pair">
<img src="../images/weapons/harm-launch.png" width="320" height="200" loading="lazy" alt="Original TFX missile camera following a HARM as its motor lights above the Libyan desert">
<img src="../images/weapons/harm-flight.png" width="320" height="200" loading="lazy" alt="The same HARM turning towards its ground target, trailing white smoke">
<figcaption>A HARM launch in mission 503, followed with the original F8 missile camera. The released model, flame and trail are separate pieces of the effect.</figcaption>
</figure>

## Bombs, glide slopes and release attitude

The distinction between a release restriction and a successful trajectory matters here. TFX has no general rule saying that a guided bomb can only be released within a particular bank angle, dive angle or glide slope. It checks whether the aircraft can fire, whether a store is present, and, for the laser-guided category, whether there is a designation.

You cannot release normally while still landed, ejecting, disabled or in the inhibited refuelling state. Weapon-system damage can prevent the command. Internal weapons bays are opened as part of the release sequence; they are not a separate manual prerequisite.

Once a GBU is released, however, it spends its initial interval falling along the launch attitude before it can steer. From a steep dive at low altitude, it can hit the ground during that interval. The eventual guidance routine's very generous turning ability cannot rescue a bomb which never reaches it.

<figure class="weapon-demo" id="release-demo">
<div class="weapon-plot" id="release-plot"><picture><source media="(max-width:600px)" srcset="../images/weapons/release-small.svg"><img src="../images/weapons/release.svg" width="720" height="390" loading="lazy" alt="GBU 24 trajectories from 200 metres: a level release begins guidance and reaches the target, while 30 and 60 degree downward releases reach the ground during the falling stage"></picture></div>
<div class="demo-controls" hidden id="release-controls"><label for="release-height">Release altitude <select id="release-height"><option value="200">200 metres</option><option value="700">700 metres</option><option value="1800">1,800 metres</option></select></label><p class="demo-readout" id="release-readout" aria-live="polite"></p></div>
<figcaption>GBU 24 movement returned by the original code, at a launch speed of 190.5 m/s towards a point 5 km ahead. Solid lines are the unguided release; dashed lines are guided flight. The vertical scale is exaggerated; the plot ends at the sea-level plane. Four-tick updates; the mount is held fixed during the attached wait.</figcaption>
</figure>

In the 200-metre case, the 30° downward release reaches the ground about 348 metres ahead. The 60° release lands about 141 metres ahead. Neither has begun guidance. Release level and the same bomb survives the delay, turns down gently and travels to the target. At 700 metres, all three of these example releases reach the guided phase.

That is a useful altitude constraint, but it is not a conventional glide envelope. Once guided, the bomb maintains its inherited scalar speed and can turn upwards as readily as downwards. It has no lift-to-drag ratio, energy reserve or bank-induced sink rate. The manual's description of an invisible funnel between the aircraft and the laser spot corresponds to a much simpler pursuit calculation.

The Mk 82 is genuinely ballistic in a different sense. Its falling and coasting stages keep adding vertical fall speed while advancing along the launch direction. It has no steering target. The CCIP display runs that same projectile movement forward to estimate where it reaches the **Y = 0 ground plane**, rather than tracing a curved flight through the actual terrain mesh.

The manual recommends a 30–40° dive from at least 2,000 feet. That is advice for lining up the CCIP marker, not an enforced release window. Its impact circle is drawn only inside a small HUD rectangle. If the predicted point lies outside that rectangle, the line can remain while the circle disappears; the trigger has not been locked out.

## The laser designator and Maverick

In this version, **Z** enters the laser-designator view for a compatible selected weapon, and another Z press records the aimed point. X breaks the lock. The cursor keys move the search view. The underlying intersection is with the flat ground plane, so aiming at a mountain is not a general-purpose terrain raycast.

The F-117 has an extra search-gimbal restriction: roughly ±45° sideways, and from about 1.4° above the aircraft's pitch to 45° below it. The locked tracking path does not apply that same clamp. It is possible to acquire something within the search limits and continue following its designation after the aircraft turns away.

The handbook gives Maverick a two-press Space workflow: first pickle a target in the HUD, then fire. The release handler in this build reserves that automatic first-press acquisition for **Harpoon**. Maverick belongs to the same designation-required category as the GBUs. The reliable route is to establish its point in the designator first.

Maverick then gets a useful extra step. On designation, the game searches for the closest eligible mobile ground object's damage-box centre, within a generous search radius of about 24.4 km around the selected point. If it finds one, it remembers an offset on that actor and updates the designated position as the actor moves. The aim point remains on the ground plane; the offset does not rotate with the vehicle.

There is another consequence of how designations are stored. These ground weapons follow a **shared designated point**. A launched air-to-air missile retains a reference to its own aircraft target, but a GBU or Maverick can see a later change to the common designation. Selecting a different point can therefore redirect weapons which are already on their way. “Fire and forget” in the manual does not always mean a private, immutable target inside each projectile.

<p class="engine-source">The gimbal, ground intersection, mobile-target search and ship/emitter selectors are in <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/sensors/ground.cpp">ground.cpp</a>. The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/weapons/runtime.cpp">projectile runtime</a> resolves actor references, decoys and the shared designation on each update.</p>

## The missile that knows its destination

The long-distance weapon is **AGM 109 H**, TFX's air-launched Tomahawk. Its target is prepared when the mission starts, using the **first mission target** plus an offset supplied by that target's object definition. The offset is added in map axes without rotating it with the target. The aim height is fixed at ten world units above the zero plane, equivalent to 80 feet.

Whenever AGM 109 H is selected, its targeting controller installs this position as the designation. It does not wait for a radar scan, a laser lock or a nose-on acquisition. That is why `LOCK`, `IN RNG` and the tracking announcement can appear before takeoff.

<figure class="engine-pair">
<img src="../images/weapons/cruise-lock.png" width="320" height="200" loading="lazy" alt="Original F-117 cockpit at night on the runway, showing IN RNG and LOCK for AGM 109 H">
<img src="../images/weapons/cruise-target.png" width="320" height="200" loading="lazy" alt="The original F9 camera showing the cruise missile’s designated ground target before takeoff">
<figcaption>Mission 703 with AGM 109 H fitted through the arming screen. The lock exists on the runway; F9 can already inspect its destination. Firing is still inhibited while landed.</figcaption>
</figure>

Pressing N to cycle mission-target previews does **not** change the stored cruise destination. It changes what the pilot is looking at in that display, not the launch programme. Nor does the missile search for an alternative target when the first one has already been destroyed.

The manual describes low-altitude travel, scene matching and a delivery of bomblets over an enemy airfield. The implemented weapon has an attached stage, a fall, a 100-tick boost and ordinary guided pursuit. There is **no terrain-following or scene-matching stage, and no dispenser stage**. Its large direct-contact damage value makes it a powerful weapon without any of those extra systems.

Its guidance category also retains the roughly 60° tracking limits. A pre-programmed destination does not mean that launching away from it is sensible. Pointing towards the destination and allowing room for the release and boost makes better use of the weapon than relying on the generous range number alone.

## HARM, Sidearm and Harpoon

HARM and Sidearm get their targets from the surface-actor list. AA-ARM, despite its anti-radiation name, uses the ordinary air-target acquisition described above. The selector searches for an available enemy object with the game's emitter type, **56**. C cycles through qualifying actors. It does not inspect a simulated radar waveform, and the selector does not ask whether that actor is currently transmitting. The chosen position becomes the designation.

They then use the shared guided routine with the approximately 60° tracking limits. HARM has the longer boost and larger range budget. Sidearm is lighter, but the shorter motor programme makes it slower in otherwise identical launches, despite the manual advertising it as faster.

Harpoon has a different acquisition path. With no existing ground target, the first trigger press looks for the nearest available surface actor belonging to a list of ship types, within about 73 km by the game's distance estimate. The next press releases the missile. This search has **no allegiance filter**, so the nearest eligible ship is not necessarily an authorised enemy target.

Its descent is wonderfully blunt. While above 640 feet, the guided update adds a fixed downward displacement of 512 position subunits per elapsed tick. On the model's time scale that is about **244 m/s of extra descent**, on top of its normal forward motion. Below the threshold, that addition stops and ordinary pursuit continues. This is not a controller holding a chosen clearance above waves or terrain.

Harpoon bypasses the 60° guidance gate, so it can keep turning towards a ship well outside the nose direction. Its smoke, target view and dramatic downward movement make it look much more specialised than the handful of conditions added to the common missile routine.

## Dispensers and runway weapons

<figure class="engine-pair">
<img src="../images/weapons/loadout-bombs.png" width="320" height="200" loading="lazy" alt="Original loadout menu displaying Mk 82 and Paveway guided bomb models">
<img src="../images/weapons/loadout-dispensers.png" width="320" height="200" loading="lazy" alt="Original loadout menu displaying GBU-55, CMB18, CSW and Durandal models">
<figcaption>The bomb and dispenser pages. TFX labels its fuel-air bomb GBU-55 in the menu, while the manual calls it CBU 55. CMB18 is the manual’s JP233 runway dispenser.</figcaption>
</figure>

The specialist weapons do have distinct sequences, although some of their advertised features stop at the description.

**CMB18 / JP233** scatters generic bomblets around the aircraft's current release anchor during its dispenser stage. With the normal projectile substep limit, it emits one child per update. More updates during the 150-tick stage therefore produce more bomblets. The children use the generic `shoot` record, not separate runway charges and persistent delayed-action mines.

**CSW** falls, boosts, then uses a guided stage which ends when it descends to about 640 feet. At that point it begins scattering the same generic bomblet. The release condition is altitude, not arrival over the target. Its range operand is about 201 km, whereas the manual gives the weapon 12.4 miles.

During CSW's 150-tick dispenser stage, each update emits `elapsed_ticks + 1` children. Over a full stage, four-tick updates request 190 children over 38 calls; ten-tick updates request 165 over 15 calls. The manual's fixed count of 250 independently homing anti-armour bomblets is not what this programme generates. The children do not have their own armour-seeking guidance.

Both dispensers also borrow the **player's current angles and speed** when creating a child. A CSW far away from the aircraft is therefore still influenced by the aircraft's state at the moment its bomblets are born. Their scatter is random but asymmetrical: the wide pattern adds positive offsets along both map axes rather than spreading evenly around the parent.

The projectile population has 98 usable slots. When full, it recycles the oldest active projectile. A dense dispenser event can therefore request far more children than remain simultaneously alive, and can even recycle an older dispenser while it is running. Counting rendered dots is not a reliable way to recover the authored number of releases.

**Durandal** takes another shortcut. After its attached and falling stages, and a one-tick boost, it enters the retarded-store routine. That routine increases vertical fall speed and pitches the model down, but does not call the forward-movement routine. Its horizontal position stops advancing. The end of the drop is vertical rather than a continuously simulated parachute-to-rocket trajectory.

These differences matter when choosing an approach. A straight low pass suits a dispenser attached to the aircraft's moving anchor. A Durandal needs its initial forward travel to put the vertical descent in the right place. CSW's altitude-triggered opening makes its release height and distance to the target especially consequential.

## What a hit actually does

The weapon's carried mass affects the aircraft. It does not determine damage by multiplying mass by impact speed.

Damage comes from the released object's small scenery programme, or **SSD**. Its initialisation writes an impact value and a health value. The collision system tests the projectile's swept movement against authored volumes, then runs the target's response. These are object-defined boxes and callbacks, not intersections with every visible triangle.

<div class="engine-table" role="region" aria-label="Weapon contact damage values" tabindex="0">
<table><thead><tr><th scope="col">Weapon</th><th scope="col">Contact damage</th><th scope="col">Notable comparison</th></tr></thead><tbody>
<tr><th scope="row">Cannon</th><td>10</td><td>Each visible projectile represents an ammunition burst.</td></tr>
<tr><th scope="row">Sidewinders, ASRAAM</th><td>101 in flight</td><td>AIM 9S’s pre-boost object starts at 111.</td></tr>
<tr><th scope="row">AMRAAM, AAAM, AA-ARM</th><td>121</td><td>Very different advertised sizes, equal direct-hit strength.</td></tr>
<tr><th scope="row">Mk 82, GBU 12</th><td>501</td><td>Guidance changes placement, not this damage value.</td></tr>
<tr><th scope="row">GBU 16</th><td>1,001</td><td>About twice the smaller GBU’s impact value.</td></tr>
<tr><th scope="row">GBU 10, BLU 109, GBU-55</th><td>2,001</td><td>The penetrator and fuel-air descriptions do not imply greater direct-hit damage.</td></tr>
<tr><th scope="row">GBU 24</th><td>4,001</td><td>About twice BLU 109, the manual’s “hardier” derivative.</td></tr>
<tr><th scope="row">Durandal</th><td>401</td><td>A special trajectory, not a simulated concrete thickness.</td></tr>
<tr><th scope="row">Maverick, HARM</th><td>251</td><td>Equal contact damage.</td></tr>
<tr><th scope="row">Sidearm</th><td>201</td><td>Less damage as well as less range than HARM.</td></tr>
<tr><th scope="row">AGM 109 H</th><td>3,001</td><td>A strong direct hit; no bomblet stage.</td></tr>
<tr><th scope="row">Harpoon</th><td>1,001</td><td>Its target’s own damage programme decides the result.</td></tr>
<tr><th scope="row">Generic dispenser bomblet</th><td>121</td><td>Each child has its own collision and damage.</td></tr>
</tbody></table></div>

We checked these values by running all 54 fired and secondary object initialisers in the original executable. The numbers are game damage units, not blast energy or kilograms of explosive.

The target can subtract damage from an authored health or lives field, change a model parameter, remove a component, and request fire or explosion effects. Most weapon objects have just one health point themselves, so a damaging contact also consumes the projectile. The target's programme determines whether it has an intermediate damaged state or simply switches to destruction.

There is no general penetration calculation in this contact path which turns BLU 109's casing or Durandal's advertised concrete-breaking ability into a different material interaction. A GBU 24 can be stronger than the supposedly hardier BLU 109 because its SSD literally supplies the larger number. GBU-55 has an additional explosion-effect path, but it is not a simulated fuel cloud spreading and igniting through the scenery.

<figure class="engine-pair">
<img src="../images/weapons/target-fireball.png" width="320" height="200" loading="lazy" alt="Original target-camera view of a bright polygonal fireball at the HARM impact site">
<img src="../images/weapons/target-smoke.png" width="320" height="200" loading="lazy" alt="Original target-camera view of smoke rising above the damaged target after the fireball fades">
<figcaption>The same mission 503 strike, now viewed from F9 with the camera moved closer. The fireball gives way to smoke and an expanding ring; the effects have their own drawing and lifetime.</figcaption>
</figure>

Collision eligibility changes with the movement stage, too. The ordinary swept object-contact pass skips attached, falling and the main boost stage. Once guidance or coasting begins, those contacts become active. The separate ground-contact check still runs, which is why an early low-altitude release can be lost before its seeker starts.

The effects system has a particularly visual shortcut. To choose among ground, water and structure impacts, it can sample the **previous rendered image** at the projected impact point. Palette-index bands distinguish those surface types. The visible splash or impact can consequently depend on what was drawn there, while damage has already followed the separate object-contact logic.

Smoke is also subject to a local effect limit. Eligible projectiles emit trails only within 4,000 world units of the player, about **9.75 km**, with further visibility and effects checks. Switching to a distant missile camera does not turn the trail into a permanent record of its entire flight. A missile can remain active after its smoke stops being generated.

<p class="engine-source">The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/world/instance.cpp">SSD interpreter</a>, <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/world/collision.cpp">collision routines</a> and <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/world/impact.cpp">impact classification</a> cover these separate parts of a hit.</p>

## Flares, chaff and electronic countermeasures

The manual's advice to switch off afterburner before using flares is very real in the code.

A cartridge release visits missiles currently targeting its owner, filters them by weapon category, then makes a random test for each eligible missile. For player releases, the thresholds are:

<div class="engine-table" role="region" aria-label="Countermeasure probabilities per eligible missile and cartridge" tabindex="0">
<table><thead><tr><th scope="col">Countermeasure</th><th scope="col">Successful random values</th><th scope="col">Probability per eligible missile</th></tr></thead><tbody>
<tr><th scope="row">Chaff</th><td>60 of 128</td><td>46.875%</td></tr>
<tr><th scope="row">Flare, afterburner off</th><td>40 of 128</td><td>31.25%</td></tr>
<tr><th scope="row">Flare, afterburner on</th><td>5 of 128</td><td>3.90625%</td></tr>
</tbody></table></div>

Afterburner makes that flare test **eight times less likely to succeed**. A successful test changes the missile's target to the actual decoy projectile. When the decoy disappears, followers are changed to a long coasting stage; they do not simply reacquire the aircraft.

Category zero accepts flares, category one accepts chaff, and category two accepts either. This is why the category choice for AIM 9L has effects beyond its acquisition cone. The game treats it like the radar group here even though its handbook description says infrared.

ECM uses another random test against category-one missiles targeting the player, provided they are farther than 1,000 world units away, about 2.44 km. A successful test switches the projectile into a disturbed turning mode. With ECM switched off, that mode returns to ordinary guidance. ECM therefore does not provide a permanent immunity flag, and activating it only at very short range misses this particular test entirely.

Airborne opponents have their own countermeasure decision. One oddity is that their choice uses weapon indices: index one, AIM 9S, selects a radar decoy, while other indices mostly choose between the two. That does not line up with AIM 9S's flare-only seeker category. An enemy can release the wrong kind of decoy for the incoming weapon.

<p class="engine-source">Player cartridge strengths are in <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/flight/defence.cpp">defence.cpp</a>; the original population loop applies them in <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/weapons/runtime.cpp">runtime.cpp</a>. Opponent decisions are in <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/actors/air.cpp">air.cpp</a>.</p>

## A few more rounds in the cannon

The Eurofighter and F-22 start with 1,760 rounds; the F-117 has no cannon. That agrees with the manual. The relationship between those rounds and the little projectiles on screen is less literal.

Each visible cannon projectile spends **ten rounds**. The code alternates between two mount positions, adds 300 speed units to the aircraft's speed, then runs two short accelerating stages followed by ballistic coasting. It is representing a burst with one collision object, not simulating ten separate 20 mm bullets.

The held-fire poll runs once per world update. A fresh Space press also has a command path, so the first frame can produce both releases. The handbook's 6,000 rounds per minute is not an independent fixed-rate firing clock in this implementation. As with boost and dispenser density, update cadence affects what happens.

That is a recurring theme across the weapons. TFX puts considerable effort into the experience of acquiring a target, watching a store leave the aircraft, seeing a trail curl away and following the hit. The movement underneath is often compact enough to fit in a few dozen instructions. Learning those instructions explains both the convincing moments and the occasions when the weapons behave nothing like their handbook entries.

## Following the evidence

This article follows the September 1994 CD's TFX 2.05 executable and its own weapon resources. Handbook comparisons use the pilot's manual, particularly the HUD and weapon instructions on pages 19–23 and 38–39, and the weapon catalogue on pages 73–82.

The screenshots were drawn by the original code, including the loadout models, cockpit, missile camera and impact effects. For the plots, we supplied controlled launch conditions to the original movement routines and compared their returned states with our reconstruction: **4,698 matching projectile updates**, plus the 54 object initialisers used for the damage values. The plotted release tests stop at the zero-height plane, so they isolate the release and guidance behaviour from a particular mountain, building or target volume.

<div class="engine-reading">
<h3>Keep exploring</h3>
<ul>
<li><a href="../flight/">How TFX flies</a>: what the carried mass, engines and controls do to the aircraft before release.</li>
<li><a href="../graphics/">How TFX draws a world</a>: the model programmes, particles, textures and palette tricks behind the pictures.</li>
<li><a href="../models/">Model gallery</a>: inspect the weapons, aircraft and damage animations.</li>
<li><a href="https://lostengines.com/tfx/analysis/weapons/">Weapon research viewer</a>: browse the recovered records and stage programmes.</li>
<li><a href="https://github.com/Lost-Engines/tfx-cpp/tree/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/weapons">The reconstructed weapon code</a> and <a href="https://github.com/Lost-Engines/tfx-traced/blob/master/content/weapons-sources.md">article sources and capture notes</a>.</li>
</ul>
</div>
