Landing the aircraft is only one of the decisions at the end of a TFX mission. The game still has to decide whether the objective counts, what to add to the logbook, whether to send us out again, and whether our conduct warrants a promotion or a court-martial. Ejecting adds another set of possibilities: getting out of the cockpit and getting safely home are separate events.

Most of that career is written in small programs stored with the game data. We followed those programs through the September 1994 release, TFX 2.05, and found a campaign system which shares its interpreter with the menus and cinematics. We also found a mission whose apparently generous partial-success award is skipped by the interpreter.

## The briefing room has a program counter

TFX's `.par` resources describe a sequence of actions. An action can play an animation, display text, start music, present a menu, change a variable, call a subroutine or launch a flight. Conditional branches connect them. The nine retail parser programs contain 41 functions and 1,173 statements.

The main executor walks these statements until it reaches something which needs another system to take over. A briefing animation has to run. A menu has to collect a choice. A waypoint planner has to open. A flight has to finish. When that activity returns, the executor continues from its saved place.

This arrangement puts the choice of the next mission beside the choice of the next debriefing scene. A campaign author can branch to a reprimand, call a common sequence, update a score and launch a retry without adding a new top-level game mode to the executable.

<figure><picture><source media="(max-width:600px)" srcset="../images/articles/campaign-flow-small.svg"><img src="../images/articles/campaign-flow.svg" width="900" height="520" loading="lazy" alt="A campaign program launches flight; flight supplies results to a mission FINISH script, and the campaign resumes with updated variables"></picture><figcaption>The handoff between a career program and one sortie. The branches shown are responsibilities, rather than a transcription of one campaign's complete graph.</figcaption></figure>

There are two forms of nesting. A subroutine call remembers a return location in the current program. Another command loads a different parser resource. Both are visible in the recovered graphs, along with the menus which give numbers their meaning. A menu selection is often an assignment followed by a branch; the text on the button and the number used by the branch belong together.

This became particularly useful when we found the PC Plus playable demo. Its instructions advertise The Doomsday Ship, but following the actual menu and branches leads into Yugoslavia. The South Atlantic story is present among the resources. Its presence alone does not put it on the route taken by the menu.

The [campaign browser](https://lostengines.com/tfx/analysis/campaign/) follows both retail and demo programs. It can stop at a flight, let us supply a result, then show which statement runs next. That makes a long career much easier to inspect than repeatedly flying to the same decision.

## The mission has its own idea of success

A flight produces facts: enemy aircraft destroyed, friendly losses, the state of named targets, the player's outcome and other counters. The mission's `FINISH` section turns those facts into campaign variables and a return value.

The language is small. It supports comparisons, tests for a target being alive or dead, conditional blocks, variable assignments and `RETURN`. The scripts can award points for destroying a particular target, penalise losses, or choose different return values for different degrees of success.

The common result handler also does work before the script starts. It adds credited air and ground kills, updates the score with the player's personal air-combat score, and increments the logbook's `num_hours` field. The latter is an increment at this handoff; this operation does not divide a measured sortie duration into hours. After the script, a nonzero mission result increments the completed-mission count.

That ordering has an observable consequence. Many retail `FINISH` scripts add `pairscore` themselves. Here `pairscore` names the personal air score. The common handler has already added it, so those missions credit that contribution twice. We reproduced the additions in the original code before retaining them in the reconstruction.

`RETURN` also has a stronger effect than reaching the end of a block. It stops the result program immediately and supplies `miss_val`, the variable used for the mission result. If the script reaches its end without a return, the existing value survives. An implementation which clears it unconditionally would change some outcomes.

The career program then receives these updated variables. A successful objective and a safe return can lead to different tests, and the same result can be handled differently by different callers. We therefore had to trace the place that launched the sortie as well as the mission file itself.

## The award that gets skipped

The fifth Arcade mission, `miss605`, has a straightforward-looking finish script. With `completed` equal to one, destroying ten enemy aircraft awards 20,000 points and returns two. Destroying more than zero appears to award 10,000 and return one. Otherwise it returns zero.

Here is the relevant structure, with the original conditions and awards:

```text
if completed == 1 {
    if eplanes_down == 10 {
        setpar score += 20000
        return 2
    }
    if eplanes_down > 0 {
        setpar score += 10000
        return 1
    }
}
return 0
```

The original interpreter mishandles the end of the first inner braced condition. Its cleanup reuses a line it has looked ahead to, and skips the following braced block even though there is no `ELSE` connecting them. When the ten-kill test fails, the partial-success block is passed over. Five kills do not collect that apparent 10,000-point award.

<figure class="research-demo" data-demo="campaign"><div class="demo-picture"><picture><source media="(max-width:600px)" srcset="../images/articles/campaign-result-small.svg"><img src="../images/articles/campaign-result.svg" width="900" height="520" loading="lazy" alt="With completed set and five enemy kills, miss605 skips the partial-success branch and returns zero"></picture></div><div class="research-controls" hidden><label><input type="checkbox" name="completed" checked> Completed flag</label><label>Enemy aircraft down <input type="range" name="kills" min="0" max="11" value="5"><output data-value="kills">5</output></label><p class="research-readout" aria-live="polite"></p></div><figcaption>Change the two inputs to see the original result. These 24 cases were executed in TFX's own result handler and compared with TFX C++. The score shown is the finish bonus; personal air score and the starting score are zero here.</figcaption></figure>

Ten kills still reach the first award, so a quick test of the best outcome would miss the problem. A conventional translation of the visible source would also miss it: both conditions are perfectly understandable, and there is no obvious reason for a modern parser to discard the second.

The unusual eleven-kill case in the exhibit is a supplied input for checking the condition. It demonstrates the exact equality test without assuming that a normal run of this mission can produce eleven kills. The ordinary partial-success cases are enough to expose the skipped block.

<p class="engine-source">The reconstructed <a href="https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/src/missions/rules.cpp">result interpreter</a> preserves the brace cleanup and common statistics. The <a href="https://lostengines.com/tfx/analysis/campaign/">campaign browser</a> includes each mission's finish conditions.</p>

## Small languages have their own arithmetic

The mission expression language resembles familiar programming languages, but several details change its answers.

Numeric comparisons use the signed low sixteen bits of their operands. Assignments and score accumulation use thirty-two bits and wrap on overflow. A variable holding 32,768 is therefore seen as −32,768 by a numeric predicate. At 65,536 its low word is zero. These values are useful tests because they expose the conversion immediately.

Boolean terms run from left to right, without the usual precedence between `AND` and `OR`. For an expression equivalent to `A OR B AND C`, TFX combines A with B first, then combines that result with C. With A true, B false and C false, the final result is false. A language which gives `AND` priority would produce true. TFX also evaluates each term instead of skipping the rest once an answer seems inevitable.

The outer campaign interpreter has a different record format and different rules. Its recovered branch operators are equality tests, while its numeric assignments can set, add or subtract wrapping thirty-two-bit values. It would be easy to implement one attractive general-purpose expression system and accidentally change both languages.

These details affect testing as much as translation. Trying only small positive scores gives little evidence about signed comparisons. Testing a single branch gives little evidence about the return stack. We used inputs at the boundaries, then checked complete sequences of assignments and returns.

## Surviving the flight and keeping the career

The career programs contain paths for death, missing in action, safe ejection, repeated-ejection discipline, court-martial, promotion and campaign defeat. Several of those paths share presentation routines. The dramatic prison sequence is reached through campaign decisions, just as the more cheerful scenes are.

To reproduce a particular decision, we need the combination of values the flight returned and the career state at the suspended call. A bare result number does not describe the whole situation. A retry also needs to return to the correct mission caller; jumping back to a generic briefing can lose the intended progression.

The saved pilot contains this execution state. Its layout follows the parser's variable schema: fixed fields for text, four-byte numeric fields, unused reserved slots, a return-stack depth, saved function/statement pairs and a resume location. The storage reserves thirty variable slots. The loader needs the matching schema to interpret those bytes.

A saved career is consequently a suspended program as well as a logbook. When we reload it, we restore both the numbers and the place those numbers will next be read. The two are tested together.

There is some persistent state outside the main pilot file too. Training qualification has a separate two-byte marker under `WAYTXT/A`. The pilot store recognises the bytes `36 17` in hexadecimal. That small file is another reason a clean installation and an old installation can behave differently during enrolment.

## Following a career without flying it twenty-five times

We checked the campaign machinery by running the original branch, assignment, return and save handlers through continuous journeys. Menu choices and flight returns were supplied at their normal handoff points. Everything between those points continued in the original interpreter.

The comparison covers 25 journeys across training, the five Flashpoints, three Tours of Duty and Arcade. Across those journeys, 175 supplied flight returns lead through 1,095 save/reload checkpoints. We compare the next action, variables, return stack and save bytes. At each checkpoint the test deliberately disturbs the state before reloading it, so a successful reload has to restore something.

For actual flight integration we use separate runs. One completed training engagement passes through a kill, recording and replay, debriefing and the next hop. Other runs use ejection and recovery to reach real campaign returns. These establish the connection to flight; the supplied-result journeys let us cover the less convenient branches in a reasonable time.

The [verification record](https://github.com/Lost-Engines/tfx-cpp/blob/6ff369f31402aa9b18add9d7ea4e640ceed19444/docs/verification.md) lists both kinds of run. For exploring the stories themselves, the [campaign browser](https://lostengines.com/tfx/analysis/campaign/) is the useful starting point: pick a program, follow a mission call, and try changing what comes back.

<aside class="engine-reading"><h3>Keep exploring</h3><ul><li><a href="../ai/">What the other pilots are doing</a> follows the actors inside a sortie.</li><li><a href="../recording/">Inside the flight recorder</a> explains what the post-flight news replay actually saves.</li><li><a href="../testing/">Calling the original executable</a> shows how we run these decisions without arranging a whole mission by hand.</li></ul></aside>
