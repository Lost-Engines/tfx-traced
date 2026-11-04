An enemy fighter in TFX has several jobs competing for its attention. It may have a route to fly, a formation to rejoin, an opponent in front of it and a missile approaching from behind. Its response comes from a combination of authored commands, a small action stack, aircraft performance tables and short manoeuvre programs.

We followed those pieces through TFX 2.05. They explain both the organised traffic along mission routes and the less orderly moments when a formation breaks into a dogfight. They also led us to two missions which ask the aircraft controller to fly a destroyer profile at 30,000 feet.

## Before anybody starts shooting

The compiled mission and environment programs describe initial actor groups and their commands. Our retained corpus has 192 programs containing 2,716 actor records: 1,709 aircraft groups, 815 surface units and 192 player routes. A group record can create several aircraft, so the record count is not the number of planes in the sky.

An aircraft group starts with a count, position, profile identifier, airborne state, altitude and speed. Its following commands can specify waypoints, waits, takeoff, altitude changes, speed changes, radio messages and ground attacks. Some commands branch backwards, allowing a route or action to repeat.

The [route browser](https://lostengines.com/tfx/analysis/waypoints/) puts those coordinates over the relevant theatre. A line on that map joins authored destinations. The aircraft still has to steer between them, and combat or formation logic can interrupt the journey.

A separate profile table supplies the aircraft's model and performance. It contains 29 aircraft records and 18 surface/entity records. The aircraft fields include acceleration, speed limits, altitude limits, roll rate, afterburner threshold and combat settings. These profiles are much smaller than the player's Military-spec aerodynamic state.

For the other aircraft, the controller asks for changes in pitch, turn and speed, then advances a compact integer motion model. Turning is coupled to bank. Speed commands are limited by the profile's acceleration and deceleration. The permitted turn rate comes either from the Arcade calculation or from sampled speed/altitude envelopes used by the other flight settings.

That gives each aircraft constraints without running another copy of the player's full force-and-moment calculation. The [flight-physics article](../flight/) covers the player's model; the traffic around us takes this separate route through the engine.

## One group, several cursors

Aircraft created by a group share its mutable command bytes. Each aircraft nevertheless keeps its own program position, control state, target, formation relationship and action stack.

At a radio command, the shared bytes prevent a chorus of identical messages. The command can be changed as it is consumed, so the group delivers the message once instead of having every member repeat it. If we gave every aircraft a private copy of the program, the route could still look plausible while the radio behaved differently.

Formation keeping also depends on another aircraft's current state. A formation entry describes offsets relative to the leader: forward distance, another direction and distance, and a vertical offset. The leader's heading rotates those offsets into a destination for the follower.

The follower has a joining state with separate thresholds for entering and leaving it. Once sufficiently far away it steers towards the formation point and adjusts speed to catch up. When it gets close enough, it leaves that catch-up state and can synchronise its command position with the leader. A destroyed or retired leader releases the relationship.

Update order affects this calculation. The runtime visits its aircraft pools in the original order, allowing followers to see a leader's newly updated state. Moving every aircraft from a frozen snapshot of the previous frame would change that interaction.

<figure><picture><source media="(max-width:600px)" srcset="../images/articles/ai-layers-small.svg"><img src="../images/articles/ai-layers.svg" width="900" height="520" loading="lazy" alt="Route commands and formation keeping feed an aircraft controller; engagement, evasion and manoeuvres can interrupt its current action"></picture><figcaption>A route supplies the long journey. Target and threat decisions temporarily take over the same aircraft's controls.</figcaption></figure>

## Finding somebody to fight

Target acquisition begins with urgent and special cases. An aircraft which is not airborne cannot acquire here. A sufficiently close incoming threat can put it into evasion before it looks for an opponent. A hostile aircraft can then consider the player through a dedicated branch.

Ordinary range checks use the greater of the absolute X and Z separations. This is a cheap horizontal distance measure: its equal-distance boundary is a square. It saves the square root required for Euclidean distance and treats diagonal separation differently.

The F-117 player has a specific concession to stealth in this branch. The engagement range is divided by eight, and vertical separation is included by taking the greatest of the three axis differences. Other player aircraft use the ordinary horizontal check. This is a direct rule in the controller; it does not calculate a radar reflection from the Nighthawk's polygons.

Other aircraft are searched through a rolling cursor. There are fifty potential slots on the opposing side, but one acquisition visit checks at most six. A successful candidate can stop the search early. If none qualifies, the next visit resumes where the previous one stopped.

<figure class="research-demo" data-demo="scan"><div class="demo-picture"><picture><source media="(max-width:600px)" srcset="../images/articles/ai-scan-small.svg"><img src="../images/articles/ai-scan.svg" width="900" height="520" loading="lazy" alt="Fifty opposing aircraft slots, with the first six highlighted as one acquisition visit"></picture></div><div class="research-controls" hidden><label>Acquisition visit <input type="range" name="visit" min="0" max="9" value="0"><output data-value="visit">1</output></label><p class="research-readout" aria-live="polite"></p></div><figcaption>The rolling search when every candidate fails to qualify and no threat or player branch takes over. Each step is a visit to acquisition, not necessarily a displayed frame. The ninth visit wraps from slot 49 to slot 0.</figcaption></figure>

The candidate must exist, be available as a target and lie within range. Retired and crashed aircraft are excluded; the code also excludes candidates carrying an incoming-threat association. Selection follows the scan order. It does not collect every opponent and then rank them by tactical value or nearest distance.

This division of work spreads the search over time. It also means the player is not simply the fifty-first entry in the same scan: the player branch has its own conditions and position in the decision order.

<p class="engine-source">The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/actors/air.cpp">aircraft controller</a> contains the separate player check, rolling scan, formation logic and action transitions. The <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/actors/air_motion.cpp">motion controller</a> applies the performance limits.</p>

## The geometry of an engagement

Once an aircraft has a target, it compares their relative headings. Is the target near its nose? Is it near the target's nose? Is it behind the target? Is the separation within gun range? Those answers select steering and firing behaviour.

Keeping the player near the nose advances a counter and can produce a tracking warning. Missile release waits for the profile's firing delay, checks the permitted number of player-directed shots, and requires weapons to be enabled. Close engagements use the gun branch. The resulting request includes a target identity as well as coordinates, so the projectile can keep following the selected actor.

The steering rules distinguish a head-on encounter from a chase. In some configurations the aircraft chooses a manoeuvre. In others it commands a turn, selects an altitude around the opponent, or adjusts speed according to the distance. The target's heading helps choose between the missile indices used by the controller.

After a missile shot, the counter becomes a negative cooldown. The withdrawal action turns away while that interval progresses, and can look for another target. This provides a visible rhythm to the fight: acquire, line up, fire, turn away and reconsider.

The aircraft carries its target, action and counters from one update to the next. Following that state explains why it turns away after a shot even while an opponent remains close by.

## Manoeuvres in six-byte steps

TFX stores eighteen CBN manoeuvre sequences containing 259 control steps. Each starts with a sixteen-byte header, followed by six bytes per step. A zero duration marks the end.

The header supplies a category, entry pitch and roll, a minimum-speed operand and an altitude allowance. Before accepting a sequence, the selector checks the aircraft's state against those requirements and applies a random gate. The category banks come from `CBN.DIR`; loading them in a different order can change which sequence a random value chooses.

An accepted sequence first brings pitch and roll towards its entry angles. The controller then reads the steps:

| Byte | Meaning in the interpreter |
| --- | --- |
| 0 | Duration for this control step; zero ends the sequence |
| 1 | Signed pitch-rate operand |
| 2 | Signed heading-rate operand |
| 3 | Signed roll-rate operand, multiplied by four |
| 4 | Signed speed-change operand, multiplied by 256 |
| 5 | Optional scenery/animation event |

The steps are control instructions. They are not a list of recorded positions in space. The aircraft's current state and performance limits still contribute to the motion, and the controller can release countermeasures while the manoeuvre is running.

The [manoeuvre browser](https://lostengines.com/tfx/analysis/manoeuvres/) shows the changing input cursor and operands. To turn those into a flight path, we also need the aircraft, its starting speed and the timing of its updates.

On completion, the controller normalises the aircraft's angle representation and changes action. Evasion, alignment and engagement use the same compact stack of action codes. Temporarily pushing an evasive action lets a threatening missile interrupt what the aircraft was doing; removing it exposes the previous work again.

## A missile can change the next aircraft in the same update

The aircraft and projectile systems communicate during the update, rather than collecting every request for the end of the frame. A launched missile can be registered as a threat before the next aircraft takes its turn. That next aircraft may immediately choose an evasive action.

Countermeasures also change these relationships. A successful decoy diversion clears the previous threat association and points guidance at the decoy. When the decoy expires, the missile changes to a coasting callback. The [weapons article](../weapons/#flares-chaff-and-electronic-countermeasures) follows those projectile rules in detail, including the aircraft controller's odd choice of decoy for AIM 9S.

The same ordering issue appears in formations and deaths. A follower can observe an updated leader. An actor retired earlier in the pass should not remain an eligible target for a later search. The simulation shares its gameplay random stream across these systems, so inserting an extra random choice can change a later manoeuvre or weapon decision.

Our comparisons therefore include requests and retained cursors, not just the final positions. Two aircraft can end a short test in almost the same place while carrying different targets or different next actions. The divergence becomes visible later.

## The aircraft with a ship record

Missions 721 and 923 contain aircraft-group records which refer to the `DESTROYER` surface profile, with an authored altitude of 30,000 feet and speed of 500 knots. Five retained environment programs have the same class of mismatch.

The original loader keeps profile records next to one another in memory. A surface record is shorter than an aircraft record. When the aircraft controller reads the fields it expects, some reads continue into the following `MISSBOAT` record. Its limits and control operands are consequently made from a mixture of two records.

This was an awkward case for the reconstruction. Rejecting it as an invalid aircraft would remove original actors. Copying the original out-of-bounds read into C++ would make behaviour depend on our allocator and neighbours. We instead retain a bounded window containing the bytes the original controller reads, including the adjoining record, and use its original clamp order even when those bytes imply inverted limits.

The bytes show exactly how the controller handles these groups, but give no hint why they were assigned a ship profile. They became useful test cases for limits we would otherwise have assumed were always sensible.

## Checking the decisions

The route comparisons execute all 192 programs with supplied target conditions. Combat comparisons add a controlled player contact, then check every intermediate pose, action, scan counter, target identity, manoeuvre cursor and emitted request against the original code. Separate cases exercise threats, disabled weapons, stealth, cooldowns and fatal damage.

For one broad combat sweep, the original and reconstruction agree through 2,823,168 aircraft updates. The player is deliberately placed near each program's first aircraft group. That gives repeatable encounters; it does not represent millions of frames of independently flown missions. Projectile and damage delivery are checked in further joined tests.

The route overlays, action traces and original-code comparisons together let us explain a fight at several levels. We can locate the authored patrol, see when acquisition interrupts it, identify the manoeuvre being attempted, and follow the weapon request into the projectile system.

<aside class="engine-reading"><h3>Keep exploring</h3><ul><li><a href="https://lostengines.com/tfx/analysis/waypoints/">Compiled actors and routes</a> puts the authored programs on their maps.</li><li><a href="https://lostengines.com/tfx/analysis/manoeuvres/">Manoeuvre sequences</a> shows the timed control steps.</li><li><a href="../weapons/">How TFX’s weapons work</a> follows a shot after the aircraft releases it.</li><li><a href="../campaigns/">How TFX runs a pilot’s career</a> follows the outcome after the flight ends.</li></ul></aside>
