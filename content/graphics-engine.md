Look out of the cockpit in TFX and almost everything seems to belong to the same world. The runway recedes into the haze. An aircraft rolls past. Smoke hangs over a target, and the green marks on the HUD stay sharp against the landscape.

Underneath, those things arrive on the screen by quite different routes. The horizon is a stack of coloured bands. A building is a program that issues drawing instructions. Smoke can be a collection of circles with holes in them. The cockpit surround can be executable x86 code loaded from the data archive. At the end, all of them write into the same 320 × 200 picture.

TFX was Digital Image Design’s 1993 combat flight simulator, with the Eurofighter, F-22 and F-117 flying over five theatres. Its 1994 successor Inferno took much of the same machinery into space, across alien landscapes and through enclosed installations. Reverse engineering both games gave us a chance to follow that machinery from its resource files to its last pixel write.

We’ll follow the September 1994 TFX 2.05 renderer, then look at the places where Inferno changes it. The linked C++ is our reconstruction of the original routines. The small game screenshots come from executing TFX’s original code with recorded inputs and capturing its VGA output.

## A frame has 64,000 decisions

A pixel in TFX is one byte. It does not contain red, green and blue. It contains a number from 0 to 255, which selects a colour from the VGA palette. The palette supplies three six-bit components for the display hardware.

That gives a full frame 64,000 colour indices. It also makes palette changes extremely powerful: change a palette entry and every pixel using it changes colour, without drawing those pixels again. TFX uses this for lighting, infrared views and physiological effects as well as ordinary colour selection.

There is no depth buffer accompanying those pixels. A polygon does not ask whether something closer already owns a pixel. Its painter writes a colour, or deliberately leaves the previous colour alone. **Visibility depends on choosing what to draw and drawing it in the right order.**

Here is the usual flight view, reduced to its major stages. A camera display inside an MFD can run another world pass with its own viewpoint and bounds.

<div class="engine-pipeline" aria-label="TFX frame pipeline">
<ol>
<li><strong>Prepare the view</strong><span>Camera, viewport, palette and horizon bands.</span></li>
<li><strong>Visit the world</strong><span>Terrain cells and moving actors execute their scenery programs. Some parts draw immediately; others enter a queue.</span></li>
<li><strong>Order the objects</strong><span>Sort queued model parts by camera depth plus an authored bias.</span></li>
<li><strong>Run each model</strong><span>Select detail, transform vertices, follow branches and issue primitives.</span></li>
<li><strong>Make pixels</strong><span>Clip, walk polygon edges and fill spans. Apply texture, colour and pattern rules.</span></li>
<li><strong>Finish the view</strong><span>Weather, cockpit artwork, instruments and camera displays. Present the completed VGA page.</span></li>
</ol>
</div>

The engine combines compiled game code with specialised x86 drawing routines and several small interpreters. The Watcom runtime is recognisable in the executable; the graphics paths also contain self-modifying code and generated machine code. There is plenty of ordinary arithmetic and bookkeeping around the spectacular bits.

A useful distinction runs through the whole design: the scenery system decides **which model parts to submit**, while a model program decides **how one part draws itself**. Both can contain conditions. Neither is simply a bag of triangles.

## Building a country from cells

Each TFX theatre begins with a 200 × 200 grid. A cell is 2,048 world units wide. Two byte arrays hold the low and high halves of its tile identifier:

```text
tile = lev[position] | (le2[position] << 8)
position = x * 200 + (199 - z)
```

The storage is column-major, with the Z direction reversed. A cell’s centre is `(2048x + 1024, 2048z + 1024)`. Once those conventions are established, an airfield in a mission script and an airfield in the map fall into the same place.

A tile selects a scenery definition, often with a choice of variants. The loader chooses one variant. It does not draw every alternative on top of every other one. The definition then assembles its parts: ground surfaces, buildings, a radar dish, an oil rig’s water patch, its smoke.

These scenery definitions, stored in `.ssd` files, have their own instructions and state. Their drawing entry can submit a part immediately or enqueue it for later sorting. Other entries handle damage, contact tests and animation. A damaged factory can select a different model state and add a blast scar; it does not require a separate replacement of the entire map cell.

<figure>
<img src="../images/city.png" width="1000" height="650" alt="An oblique view of TFX city blocks and the amber lights running through their roads" loading="lazy">
<figcaption>City assemblies in the <a href="../maps/?lighting=yugos_n#yugoslav/136/114">map explorer</a>. This inspection view makes their repeated parts easy to see. The game submits those parts to its software renderer.</figcaption>
</figure>

Terrain placement uses four exact quarter-turn transforms. For example, a 90-degree turn maps local `(X,Z)` to `(Z,−X)`. It can do this by exchanging and negating coordinates, without looking up a sine. Moving aircraft and rotating parts use the more general matrix path we’ll reach shortly.

The ordinary native terrain neighbourhood is a 16 × 16 square around the camera’s anchor cell. The engine walks it in Z-major order and rejects assemblies outside the view using their bounding radii. The archive may hold a whole theatre, but the renderer works on a local neighbourhood.

The radius allows a cheap rejection before transforming every vertex. For a side-of-view test, the engine subtracts the radius from the magnitude of the camera-relative centre coordinate, projects that excess with the current focal length and compares it with the viewport extent. A centre outside the picture can still survive if part of its bounding volume reaches into view.

Geometry and weather are separate selections. A mission’s `world` chooses a regional grid such as `yugoslav`; its `type` chooses lighting and environment settings such as `yugos_n`. This caught us out during extraction because the archive also contains old grids with weather-like names. Loading one of those as the night-time map produced mountain slopes floating above roads. The game was loading a different grid all along.

<p class="engine-source">Follow the implementation: <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/world/terrain_cells.h">terrain traversal</a>, <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/world/scene.cpp">scene submission</a>. Explore the recovered <a href="https://lostengines.com/tfx/analysis/maps/">terrain and scenery</a>.</p>

## The aircraft is a program

TFX’s 1,012 model resources describe much more than visible surfaces. A model can construct vertices, call a subroutine, turn a component, test a parameter, select a texture and choose which faces to draw first.

On disk, its instructions are big-endian 16-bit words. The loader converts the program in place. It changes byte order, turns opcodes into offsets for the drawing dispatch table, and turns vertex indices into byte offsets for 32-byte working records. The runtime therefore receives a program already prepared for its interpreter.

Some of its vocabulary is reassuringly direct:

<div class="engine-table" tabindex="0" role="region" aria-label="Selected model instructions">
<table>
<thead><tr><th>Instruction</th><th>Job</th></tr></thead>
<tbody>
<tr><td>1, 2, 3, 4</td><td>Draw a line, triangle, quad or variable-length polygon.</td></tr>
<tr><td>7, 8</td><td>Jump or call a relative subroutine.</td></tr>
<tr><td>21</td><td>Branch on the facing of three projected vertices.</td></tr>
<tr><td>32–37</td><td>Compare a parameter byte and branch or call.</td></tr>
<tr><td>71, 47</td><td>Select a global texture and UV coordinates, then draw a textured polygon.</td></tr>
<tr><td>72, 73</td><td>Select a parameter; enter a rotated component.</td></tr>
<tr><td>81</td><td>Draw a carried model at an attachment point.</td></tr>
<tr><td>82, 83</td><td>Configure vertex jitter, then construct perturbed vertices.</td></tr>
<tr><td>92, 93, 95, 96</td><td>Draw sized circles, individually or in batches.</td></tr>
<tr><td>97, 117</td><td>Project a range of vertices, or one vertex.</td></tr>
</tbody>
</table>
</div>

Vertices can be written as absolute coordinates or as deltas from a preceding position, including compact commands which change only one or two axes. A working vertex slot can be reused. Calls share drawing state and vertex records, so flattening the file into one immutable mesh loses part of its meaning.

The following is a sketch of the control flow, rather than the binary syntax:

```text
construct the airframe vertices
project them
if this face points towards the camera:
    draw the far wing, fuselage and near wing
else:
    draw them in the opposite order

select parameter 0
choose the landing-gear pose
call the wheel drawing routine at its rotated anchor

draw each occupied weapon attachment
```

A model part has eight parameter bytes. Aircraft commonly use parameter 0 for gear and parameter 1 for doors or weapons bays. The same parameter 0 rotates a radar dish or raises a Scud missile on another model. Parameter 7 frequently selects damage and fire. These are inputs to a program, not eight globally defined animation tracks.

The surrounding scenery system supplies little animation streams which set, increment, decrement and loop those bytes. A landing gear sequence can therefore move through several poses; a bridge can switch directly to its destroyed state. Model drawing answers “what does state 12 look like?” The actor and scenery code decide when state 12 happens.

This also explains a particularly satisfying detail: missiles on a pylon are carried submodels, drawn at authored anchors with the aircraft’s current transform and scale. They are not separately positioned approximations floating beside the plane.

### Choosing less to draw

The model header has distance thresholds and corresponding drawing entries. Close up, an entry runs a polygon program. Farther away, another can run simpler geometry, draw a two-by-two mark, draw a single pixel, or eventually supply no representation.

The distance used for this selection is a cheap approximation. Sort the absolute camera-space components so that `a` is the largest:

```text
distance ≈ a + (b + c) / 4
```

It avoids a square root. Along an axis it is exact; along a three-dimensional diagonal it gives `1.5a`, compared with the Euclidean `√3a`, about `1.732a`. Its constant-distance contours are faceted rather than spherical. The renderer compares this quantity, after its fixed-point scaling, against the model’s own thresholds.

Detail levels can change the drawing technique as well as the number of polygons. A cloud may change from solid circles to checkerboard circles as it recedes. A distant aircraft becoming a dot is an explicit representation selected by the model header.

<p class="engine-source">Inspect <a href="../models/#efa">the Eurofighter</a>, <a href="../models/#ss1_scud">the Scud launcher</a> or <a href="../models/#ian1">the ejecting pilot</a>. Code: <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/models/shape.cpp">model interpreter</a>, <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/model_metrics.cpp">distance and sort keys</a>.</p>

## From the wing to the camera

A point begins in model coordinates. TFX uses X for the lateral axis, negative Y for up and positive Z towards the aircraft’s nose. To place that point in the world, rotate it with the aircraft and add the aircraft’s position. To see it through the camera, subtract the camera’s position and rotate into the camera’s axes.

Written in ordinary linear-algebra notation:

<div class="engine-equation">p<sub>camera</sub> = V · (R · p<sub>model</sub> + T − C)</div>

Here `R` rotates the model, `T` is its location, `C` is the camera’s location, and `V` changes world axes into view axes. In camera space, positive Z is depth into the picture. An attached component contributes another local transform before this chain.

<figure>
<picture><source media="(max-width: 600px)" srcset="../images/graphics/transforms-compact.svg"><img src="../images/graphics/transforms.svg" width="960" height="300" alt="Three coordinate frames: a point on a wing relative to its aircraft, the rotated aircraft placed in the world, and the point expressed relative to the camera" loading="lazy"></picture>
<figcaption>The same wing point in three coordinate systems. The engine combines rotations and caches the camera-relative origin so it can reuse that work for many vertices.</figcaption>
</figure>

The original uses integer fixed-point arithmetic for these drawing operations. A rotation coefficient has fifteen fractional bits: a stored value near 32,767 represents approximately 1. Multiplying two such coefficients produces thirty fractional bits, so a right shift by fifteen brings the result back to the original scale.

Camera-space vertex coordinates carry sixteen fractional bits. This preserves sub-unit motion through the transforms, although projection later throws some of that precision away. A shift, a signed division and a stored 16-bit result each have their own rounding behaviour. Moving a rounding step to the end of a calculation can move an edge by a pixel.

### A turn fits in sixteen bits

An angle wraps after 65,536 units. The rendering sine table has 1,024 entries, selected by shifting the angle right by six bits. Thus the matrix generators resolve roughly 0.352 degrees per table step. Cosine is the same lookup advanced by a quarter turn.

The samples follow `trunc(32767 × sin(2πi / 1024))`, with one small curiosity: the negative peak is −32,766 instead of −32,767. TFX and Inferno share that entry. It is a one-unit amplitude difference, separate from the much more visible quantisation of the angle itself.

The matrix generators use trigonometric sum-and-difference identities. Expressions involving `sin(pitch + roll)` and `sin(pitch − roll)` produce terms which a textbook implementation might calculate by multiplying sine and cosine. The exact sequence of halves, products and shifts is part of the result. The camera matrix and component matrix use different arrangements and rounding; swapping one for a conveniently inverted version of the other does not reproduce the same coefficients.

### Scaling by moving the origin

There is another compact trick in the model language. Some commands scale the camera-relative translation while leaving the raw vertex coordinates alone. Perspective then makes the geometry appear larger or smaller relative to the model’s origin.

The F-117 uses translation factors of 80 for the airframe, 10 for a smoke helper and 4 for a fire helper. Relative to the airframe’s raw coordinates, the fire is effectively enlarged by `80 / 4 = 20`. Our early viewer ignored this and hid tiny flames inside the fuselage. The program already contained a large fire; we had interpreted its coordinate system incorrectly.

<p class="engine-source">Code: <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/math/native.cpp">sine samples and matrix construction</a>, <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/model_transform.cpp">model transforms</a>.</p>

## Perspective, and the edge behind your head

Once a vertex is in camera space, perspective is a division. A point twice as far away has half the displacement from the centre of the image:

<div class="engine-equation">x<sub>screen</sub> = c<sub>x</sub> + f · X / Z<br>y<sub>screen</sub> = c<sub>y</sub> + f · Y / Z</div>

The ordinary TFX model projection has a focal length of 256 pixels. With Q16 camera coordinates, its integer path is:

```text
depth = Z >> 16
screen_x = centre_x + (X >> 8) / depth
screen_y = centre_y + (Y >> 8) / depth
```

The division truncates towards zero. The projection centre comes from the active viewport, so it need not be the middle of the complete display. The missile-nose view changes the shifts and halves the model focal length to 128 pixels, giving a wider view.

Objects crossing the camera need special treatment. Dividing by a depth close to zero sends their vertices across enormous distances on screen; a point behind the camera can even project to the opposite side. TFX flags model vertices at depth 16 or closer and clips crossing polygons against that near plane before filling them.

### An intersection without the usual division

A conventional line-plane intersection calculates a fraction along the edge, then interpolates X and Y with it. TFX’s near-plane helper instead **bisects the endpoint depths**. It repeatedly takes their midpoint, keeps the half which contains depth 16, and records the choices in a bit word. It then replays those choices on the X and Y coordinates. Textured and shaded paths replay them on UVs or colour attributes too.

The depth search uses signed 16-bit whole depths. X and Y keep their fixed-point precision. This produces a very particular intersection, which an ordinary floating-point clipper need not round to the same pixel.

<figure class="engine-demo" data-demo="near">
<img class="demo-fallback" src="../images/graphics/near-plane.svg" width="960" height="390" alt="An edge crosses the near plane at depth 16; its hidden endpoint is clipped away, and the intersection becomes a new projected vertex" loading="lazy">
<canvas width="960" height="390" hidden aria-label="Side view of a line crossing the camera near plane. Adjust the endpoint depth below."></canvas>
<div class="demo-controls" hidden><label for="near-depth">Endpoint A depth <output id="near-value">−8</output></label><input id="near-depth" type="range" min="-24" max="32" value="-8" step="1"><p id="near-result" class="demo-readout" aria-live="polite"></p></div>
<figcaption>Move A towards and through the near plane. The construction shows the depth bisection and its fixed-point X intersection. The other endpoint remains at depth 80.</figcaption>
</figure>

After projection, a separate clipper restricts the polygon to the screen rectangle. TFX visits bottom, top, right and left, adding an intersection whenever an edge enters or leaves a boundary. Its intersections use signed integer division and choose the farther endpoint for the calculation. These seemingly fussy choices decide which pixel an edge includes.

Inferno changes this part of the engine substantially. Its initial projector still marks vertices at depth 16, but the polygon clipping path can bring them forward to a near plane at **depth 1**. It reprojects with wider screen coordinates and clips against top, right, bottom and left. Lines retain the older depth-16 bisection path. The polygon and line versions therefore do not share one universal near plane.

One more inherited oddity: TFX’s distant-point projector uses a reciprocal multiplication instead of the model projector’s signed division. It also keeps the ordinary projection in missile-nose view while polygons use the wider one. Two representations of the same object can consequently disagree at a detail transition. This is one of the original inconsistencies we corrected in Redux.

<p class="engine-source">Code: TFX <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/near_clip.cpp">near-plane bisection</a> and <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/point_projection.cpp">point projection</a>; Inferno <a href="https://github.com/Lost-Engines/inferno-cpp/blob/master/src/render/geometry.cpp">geometry and clipping</a>.</p>

## Who gets the last pixel?

Consider a box. From one side, its left face hides part of its right face; from the other, their relationship reverses. A depth buffer would settle each pixel individually. TFX instead has two levels of ordering.

**Within a model**, the drawing program supplies the sequence of faces. It can branch on the facing of three projected vertices, then call the appropriate sequence of drawing instructions. The basic test is a two-dimensional signed area:

```text
area = (x1 − x0) * (y2 − y0)
     − (x2 − x0) * (y1 − y0)
```

Its sign tells which way those screen-space vertices wind. A branch can use that sign to choose a drawing order. The polygon rasteriser also has a winding rejection test of its own. A branch which chooses a sequence and a test which discards a face are separate decisions.

**Between model parts**, the engine uses a painter’s queue. Its key is the integer camera-space Z of the part’s origin plus a signed bias from its header. Larger keys draw first. Later, nearer parts overwrite their pixels.

This is cheaper than sorting every face against every other face. It also gives the artists a practical escape hatch when the origin of a large surface is a poor guide to its intended order.

<figure>
<picture><source media="(max-width: 600px)" srcset="../images/graphics/painter-compact.svg"><img src="../images/graphics/painter.svg" width="960" height="390" alt="An oil rig diagram shows the water drawn before the structure and smoke. Queue keys use a plus 3000 bias for water and minus 100 for smoke." loading="lazy"></picture>
<figcaption>The oil rig assembly is a good example. The water models <code>sea1</code> and <code>old</code> carry a +3,000 bias, the rig has zero, and <code>smoke_rg</code> has −100. The drawing priority changes; the vertices stay in place.</figcaption>
</figure>

The queue holds **348 entries**. Small batches use insertion sort. At fifteen entries or more, a quicksort partition pass precedes the insertion pass, and drawing walks the final list backwards. Equal keys inherit the original algorithm’s tie order. Replacing it with an arbitrary stable sort can change which of two overlapping parts wins.

Filling the queue triggers another sort, after which the slot belonging to the farthest entry is reused for the next submission. The eventual set of parts can therefore depend on submission order as well as distance. A larger draw distance cannot be obtained simply by visiting more cells while leaving every other limit unchanged.

A single depth key cannot solve every intersecting object. Nor can it repair a bad face sequence inside a model. We found a revealing example in `bedford2`: its cab sides draw before the flat-bed top, but its windscreen and roof draw afterwards. In the model viewer, the bed can cover the sides while leaving the glass and roof visible. Reading the instruction order explains that oddly selective overlap.

The same design makes ground overlays straightforward. A blast scar is a textured polygon at ground level, drawn over the ground. It does not need a tiny geometric offset to appease a depth buffer. When we moved those surfaces into a WebGL inspection viewer, coplanar depth fighting became our problem to solve.

<p class="engine-source">Code: <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/model_queue.cpp">the bounded queue and original sorting order</a>. Model data and face sequences: <a href="https://lostengines.com/tfx/analysis/models/">full model workbench</a>.</p>

## Turning a polygon into spans

After transforms, ordering, facing and clipping, the renderer finally has a polygon in screen coordinates. It still needs to decide which pixels lie inside it.

TFX’s ordinary polygon path finds the topmost and bottommost vertices, then walks the boundary in both directions from the top. Each boundary becomes a chain of edges. One walker supplies the left X position for a row; the other supplies the right X position. The pixels between them form a **span**.

For an edge of height `h` and horizontal displacement `dx`, the ideal per-row step is `dx / h`. TFX constructs its Q16 step using a Q15 reciprocal:

```text
reciprocal(h) = floor(32768 / h)   // 32767 for h = 1
step_q16 = dx * 2 * reciprocal(h)
x_q16 += step_q16                 // advance one screen row
```

The two factors of 32,768 supply the familiar 65,536 fixed-point scale. The edge starts with a half-unit rounding bias; sufficiently steep changes add half a step as well. At a vertex, the walker installs the next edge’s start and increment.

The supported outline needs to split into two chains which move down the screen. This is not a general concave-polygon tessellator. The native model language’s polygon command is not a promise that an arbitrary outline will be triangulated for you.

<figure class="engine-demo" data-demo="scan">
<img class="demo-fallback" src="../images/graphics/scan.svg" width="960" height="480" alt="A polygon crossed by a highlighted horizontal span between two boundary walkers; a second view shows vertical columns" loading="lazy">
<canvas width="960" height="480" hidden aria-label="Pixel grid showing a polygon filled by rows or columns."></canvas>
<div class="demo-controls" hidden><label for="scan-direction">Walk by <select id="scan-direction"><option value="rows">Rows: TFX polygon spans</option><option value="columns">Columns: Inferno textures</option></select></label><label for="scan-step">Position <output id="scan-value">12</output></label><input id="scan-step" type="range" min="0" max="31" value="12" step="1"><p class="demo-readout" id="scan-result" aria-live="polite"></p></div>
<figcaption>Follow a pair of edges, then fill the interval between them. Switch to columns to turn the traversal through 90 degrees. Each square here represents a screen pixel.</figcaption>
</figure>

The TFX edge pass produces top-to-bottom spans, but the VGA writer consumes them **bottom first**. Endpoints are inclusive. An edge rounding differently by one unit changes a whole run of pixels, and a span that crosses itself can terminate a native drawing batch. That is why a modern triangle rasteriser with its own shared-edge rules can look close without matching the original.

Flat spans have the cheapest inner loop: write the same index repeatedly. Shaded spans carry another value at each edge and step it across the row. Textured spans carry two. The edge machinery is doing the interpolation work before the innermost pixel loop begins.

### Rounding a corner without adding a mesh

There are specialised rounded primitives too. For a rounded quad, TFX projects the four edge midpoints, fills the central quad they form, then adds a small curved section around each original corner. The midpoints are found in camera space before projection, so they need not land halfway between the projected endpoints.

The corner generator uses a fixed-point recurrence. After setting up two accumulators from the corner and its neighbours, the central update is:

```text
b -= a >> subdivision
a += b >> subdivision
```

Each update supplies another point on the arc. Rounded quad corners use eight points; the standalone three-vertex curve uses fourteen. The additions and shifts generate the curve without a fresh sine or cosine lookup for every point. Its outline then goes through the ordinary span machinery.

Inferno keeps horizontal spans for ordinary flat polygons, but its textured and shaded paths build **vertical columns**. They walk from maximum X towards minimum X, push column records, and consume them from left to right. This is a real algorithmic change within an otherwise very recognisable engine.

<p class="engine-source">Code: <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/integer_polygon.cpp">TFX edge walkers and span writers</a>, <a href="https://github.com/Lost-Engines/inferno-cpp/blob/master/src/render/raster.cpp">Inferno column writers</a>.</p>

## A texture is another set of indices

TFX uses a small amount of texture mapping among its flat and shaded surfaces. A raw `.tm` page is 256 × 192 bytes, without a palette or a header. The address of a texel is simply:

```text
address = v * 256 + u
```

Global texture slots let many models refer to the same pages. Aircraft markings, cockpit instruments, flare artwork and ground scars can occupy different rectangles of an atlas. The damaged `tripipe` model, for example, selects four UV corners around the blast-scar artwork in `global_1.tm` and draws a quad on the ground.

UV coordinates acquire seven fractional bits during model conversion. They are interpolated along the screen-space edges and then across each span. The pixel writer takes the integer texel position and fetches one byte. There is no bilinear filtering.

This mapping is **affine in screen space**. If the left end of a span has U = 0 and the right end has U = 100, the screen midpoint receives U ≈ 50, whatever the endpoints’ depths.

A perspective-correct mapper instead interpolates `u/z`, `v/z` and `1/z`, then divides to recover U and V at the pixel. That division changes the spacing along a surface which recedes from the camera. TFX avoids it. The resulting stretch is most apparent on large, oblique textured faces.

<figure class="engine-demo" data-demo="texture">
<img class="demo-fallback" src="../images/graphics/affine.svg" width="960" height="420" alt="The same checkerboard receding quad shown with affine interpolation and perspective-correct interpolation; the near portion stretches in the affine example" loading="lazy">
<canvas width="960" height="420" hidden aria-label="A receding checkerboard quad with affine and perspective-correct coordinates side by side."></canvas>
<div class="demo-controls" hidden><label for="texture-depth">Far-edge depth <output id="texture-value">4×</output></label><input id="texture-depth" type="range" min="10" max="70" value="40" step="1"></div>
<figcaption>A one-quad illustration of the interpolation rule. Both images have the same projected corners; the texture coordinates between them differ.</figcaption>
</figure>

The texel’s index is then passed through a colour-remapping table. In TFX, the **remapped** value decides transparency. If it is zero, the pixel is left alone. A nonzero source texel can therefore disappear if the remap turns it into zero; a source zero can paint if remapped to another index.

Inferno tests the **source** texel for zero instead. A nonzero texel remapped to zero draws black there. This is a tiny change in the inner loop with a visible consequence around transparent artwork.

<p class="engine-source">Code: <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/integer_model_texture.cpp">texture attributes and near clipping</a>, <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/integer_polygon.cpp">affine sampling</a>. Explore the <a href="https://lostengines.com/tfx/analysis/textures/">original texture bindings</a>.</p>

## Colour does some of the geometry’s work

A smoothly shaded polygon normally suggests RGB values being blended across its surface. TFX’s Gouraud shading interpolates **palette indices**. Its per-vertex shade attributes are 8.8 fixed-point values. Interpolation chooses intermediate entries in the palette, followed by the selected remap.

For that to look like a smooth material, the palette entries need to form a useful ramp. If the consecutive entries run from dark grey to light grey, the surface looks shaded. If they alternate between unrelated colours, the exact same interpolation becomes a rainbow. The palette is part of the artwork’s construction.

Separate from the 256-colour VGA palette is `coltab.dat`: sixteen rows of 256 output indices. This is a 4,096-byte lookup table, not sixteen RGB palettes. Given a row and a source index, the renderer gets a replacement index. TFX’s ordinary distance-colour helper selects a row by shifting camera depth right by nine whole units and clamping to 0–15. Model instructions can also request colour selection using face depth.

An index can thus go through several distinct stages:

<div class="engine-colour-flow"><span>Authored colour<br><strong>or texture index</strong></span><b aria-hidden="true">→</b><span>Remap row<br><strong>another index</strong></span><b aria-hidden="true">→</b><span>VGA palette<br><strong>red, green, blue</strong></span></div>

The environment supplies several palette banks. TFX blends five banks according to altitude, in integer steps, while protecting entries needed for instruments and other special colours. Night vision and infrared views select another palette. Blackout, redout and flashes also alter the palette output.

<figure class="engine-pair">
<div><img src="../images/graphics/tfx-cockpit.png" width="320" height="200" alt="TFX cockpit above the brown and grey landscape of Somalia at twilight" loading="lazy"><span>Normal view</span></div>
<div><img src="../images/graphics/tfx-infrared.png" width="320" height="200" alt="The same cockpit and nearby landscape in the green infrared palette" loading="lazy"><span>Night vision</span></div>
<figcaption>Original-code captures from the same Somalia flight, at different moments. The recorded VGA palettes colour the captured indices. The palette supplies the colours after the rasteriser has written the indices.</figcaption>
</figure>

Night lights take another route. City and runway model programs test a global night flag, then draw their authored small marks in amber or pale yellow. They are visible points, rather than light sources which illuminate neighbouring geometry. Their arrangement along streets and runway edges supplies most of the effect.

Inferno makes extensive use of environment-specific palettes: orbital planets, the sun, Federation and Rexxon interiors, rings and underwater scenery all have appropriate bindings. That is why the palette called `standard` was such a poor default for our model browser. The name did not make it a universal material palette.

Its model language adds a depth-shading wrapper, opcode 122, which interpolates remap-row values across a polygon. A large face can then change its colour treatment with depth instead of choosing one row for the whole face. Opcode 118 supplies the related per-face distance-colour mode, already present in the shared instruction family.

<p class="engine-source">Code: <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/colour_remap.cpp">index remapping</a>, <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/palette_lighting.cpp">environment palette updates</a>. Browse the <a href="https://lostengines.com/tfx/analysis/lighting/">palettes and raster patterns</a>.</p>

## Smoke with holes, clouds made of circles

TFX can draw both fixed-size pixel effects and circles with a radius supplied by the model. These are different primitives. A small city light and a large smoke particle should not be given the same size just because both originate at a vertex.

The sized-circle projection uses:

```text
screen_radius = trunc(size_operand * 128 / camera_depth)
```

The ordinary point projection has a focal length of 256, so the stored size operand does not map one-for-one to a geometric radius under that projection. TFX’s circle-row tables contain the extents produced by an integer midpoint-circle construction. Starting in one octant, it advances along X and uses an error accumulator to decide when to reduce Y; symmetry supplies the other octants. The resulting row extents become spans for the same flat or patterned painters. Inferno also has explicit tiny-size cases and an integer circle recurrence.

The `cloud1` through `cloud4` models each draw fifteen overlapping circles. Their closer detail programs use solid colours. The next versions use half-coverage checkerboards and quarter-coverage dots. The cooling tower `cltwr2` uses checkerboard steam even in its single polygon detail program.

These are screen-door patterns: chosen pixels receive the smoke colour and the holes retain the background. No RGB alpha calculation is involved. The pattern aligns to screen coordinates, so overlapping identical patterns leave the same holes. **Two overlapping half-coverage circles do not automatically become three-quarter opaque.**

<figure class="engine-demo" data-demo="stipple">
<img class="demo-fallback" src="../images/graphics/stipple.svg" width="960" height="420" alt="Two overlapping smoke circles share a checkerboard mask, so the same background holes remain visible in their overlap" loading="lazy">
<canvas width="960" height="420" hidden aria-label="Two smoke circles drawn with screen-aligned pixel patterns."></canvas>
<div class="demo-controls" hidden><label for="stipple-mode">Coverage <select id="stipple-mode"><option value="0">Half: mode 0</option><option value="1">Quarter: mode 1</option><option value="solid">Solid</option></select></label><label for="stipple-gap">Circle separation</label><input id="stipple-gap" type="range" min="0" max="40" value="17" step="1"><p id="stipple-result" class="demo-readout" aria-live="polite"></p></div>
<figcaption>The half and quarter patterns use the native screen-coordinate tests. Move the circles together to see why the overlap keeps its holes.</figcaption>
</figure>

The engine also has sparse patterns, horizontal stripes and procedural stipple. Other modes apply XOR, AND or OR to source and destination **index bytes**. The result goes through the palette like any other index; these operations are not equivalents of modern additive or multiplicative RGB blending.

Motion comes from another small mechanism. Vertex-jitter commands update a pair of 16-bit random-state words with addition and carry, then keep a signed portion of the result as a displacement. A shift of 14 gives offsets from −2 to +1; a shift of 13 gives −4 to +3. The displacement is applied before component rotation.

Fire can therefore combine a parameter-controlled sequence with perturbed vertices. A smoke stage can hold its selected geometry while its vertices continue to move. The pilot’s parachute uses the same family of vertex motion. Frame setup saves and restores the jitter seed around the animation pulse, keeping intervening renders from inventing a fresh shape on every draw.

Inferno retains these circle and pattern mechanisms, and adds another expensive-looking effect by an entirely different route: its scaled sprite renderer generates x86 load/store instructions for the requested resize, then executes the generated loop. An explosion sprite is prepared as a specialised blitter for its current dimensions.

<p class="engine-source">Code: <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/pattern_raster.cpp">pixel patterns</a>, <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/math/native.cpp">vertex jitter</a>. Try the <a href="../models/#cloud1">cloud model</a> and <a href="../models/#cltwr2">cooling tower</a>.</p>

## Painting the horizon before the hills

A theatre does not need to extend to infinity to fill the bottom of the picture. Before drawing the local world, TFX paints a horizon made from broad palette-coloured strips.

The horizon builder uses camera pitch and roll to project a set of height/depth pairs. It extends those projected boundaries across the viewport to form bands. Near a steep roll it switches which screen axis it uses to build them. Sky bands begin around palette index 240; ground bands begin around 224. A movement phase shifts the ground pattern as the aircraft travels.

<figure>
<img class="pixel-art" src="../images/graphics/tfx-external.png" width="320" height="200" alt="Original TFX external view: the F-22 in front of broad dusk sky bands, with the local terrain drawn across the ground beneath" loading="lazy">
<figcaption>The original renderer, looking over the F-22 in Somalia at twilight. The broad horizontal bands belong to the horizon painter; the irregular patches in front come from the scenery.</figcaption>
</figure>

Those bands supply a background under the finite terrain neighbourhood. The local scenery can leave areas uncovered without revealing an empty framebuffer. Palette selection helps the foreground surfaces and background converge in colour at a distance.

Ground shadows also avoid an expensive general solution. The model transform can flatten the aircraft onto an XZ plane before applying the view transform, and the shadow path paints its silhouette. There is no shadow map and no light-to-surface visibility pass. The ordinary placement helper only supplies this shadow close to the ground.

Inferno uses the shared world machinery for a broader collection of environments. It can select another terrain layer with altitude, draw orbital planet backdrops and change palettes around rings or underwater regions. Its interiors are assembled scenery too. A room flag selects appropriate walls and connecting parts; navigation and collision use a separate library of tubes and room volumes. A visible corridor and the volume through which a ship can fly are related pieces of data, not the same polygon mesh.

<p class="engine-source">Code: <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/horizon.cpp">horizon bands</a>, <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/world/model_placement.cpp">shadow placement</a>. Explore Inferno’s <a href="https://lost-engines.github.io/inferno-investigated/">worlds and corridors</a>.</p>

## Writing into VGA memory

The picture is logically a 320 × 200 array, but the VGA drawing surface is divided across four planes. Adjacent pixels go to successive planes:

```text
plane   = x & 3
address = page_base + y * 80 + (x >> 2)
```

Each plane holds every fourth pixel of a row. A map mask chooses which planes a write affects. For a flat span, an interior write can put the same byte into all four planes, painting four adjacent pixels at once. The two ends need masks to select only the covered pixels.

<figure>
<picture><source media="(max-width: 600px)" srcset="../images/graphics/vga-compact.svg"><img src="../images/graphics/vga.svg" width="960" height="380" alt="Eight adjacent screen pixels are distributed among four VGA planes: pixels 0 and 4 in plane 0, pixels 1 and 5 in plane 1, and similarly for planes 2 and 3" loading="lazy"></picture>
<figcaption>Four neighbouring screen pixels share one byte address but live in different planes. Selecting all four planes makes a repeated-colour write useful work.</figcaption>
</figure>

This layout explains details which look peculiar in isolation. Pattern density can be expressed with plane masks. Some sparse painters count VGA byte groups rather than individual pixels. The native flat-span writer uses an unrolled jump table, while the Gouraud path rearranges its fractional accumulator and propagates the processor’s carry between pixels. These routines are built around the display memory they have to feed.

TFX rotates through **three retained VGA pages**. It draws one while another is displayed, then changes the displayed page. Pixels outside a painter’s coverage remain in that page until something overwrites them. Static cockpit panels need copying to all three pages after a layout change; the engine has a refresh count for precisely that purpose.

### The cockpit is partly executable artwork

Some cockpit overlay resources contain actual x86 drawing programs. Calling one with a destination page and offsets paints the canopy or frame directly into the VGA planes. Other parts are raw planar bitmaps. Live instruments combine sprite banks, embedded font glyphs, lines and numbers.

An untouched pixel in a compiled overlay is transparent because the code never writes it. A deliberately written black pixel is opaque. Treating every black pixel as a transparency key cuts holes in the cockpit.

The virtual cockpit follows the model route: transformed polygons and textured instrument panels. Its MFD images in the original TFX are static artwork. The live radar, map and camera displays are drawn by the fixed cockpit’s instrument routines. We initially expected the virtual panels to update, but the game itself showed the same fixed pictures. Live virtual instruments are a Redux addition.

A camera MFD is a more involved display than a bitmap gauge. It sets up another view, paints a world through a small viewport, then returns to the cockpit composition. Those extra camera passes have to coexist with the shared renderer’s transforms, parameters and random state. Following the order of calls matters just as much as recovering the polygon filler.

<p class="engine-source">Code: <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/render/display_pages.cpp">retained pages</a>, <a href="https://github.com/Lost-Engines/tfx-cpp/blob/master/src/cockpit/frame.cpp">cockpit composition</a>. Compare the <a href="../cockpits/">cockpit layers</a>.</p>

## What Inferno adds

By the time we opened Inferno and its 1,691 model programs, the family resemblance was immediately useful. Model commands, scenery programs, quarter-turn placement, fixed-point transforms, palette tables and patterned circles all gave us familiar starting points. Then the differences began to show up in pixels.

<div class="engine-table" tabindex="0" role="region" aria-label="TFX and Inferno renderer comparison">
<table>
<thead><tr><th>Mechanism</th><th>TFX 2.05</th><th>Inferno CD 1.58</th></tr></thead>
<tbody>
<tr><td>Model language</td><td>Drawing programs with branches, components and parameter bytes.</td><td>Retains the layouts through opcode 120; adds 121 and 122.</td></tr>
<tr><td>Flat polygons</td><td>Horizontal spans.</td><td>Horizontal spans.</td></tr>
<tr><td>Textures and interpolated shading</td><td>Horizontal spans, consumed bottom first.</td><td>Vertical columns, consumed left to right.</td></tr>
<tr><td>Near clipping</td><td>Depth-16 bisection path.</td><td>Depth-1 polygon path; depth-16 line path.</td></tr>
<tr><td>Texture transparency</td><td>Test the remapped index for zero.</td><td>Test the source texel for zero.</td></tr>
<tr><td>Depth colour</td><td>Object/face-selected index remaps.</td><td>Also interpolates remap rows over a face with opcode 122.</td></tr>
<tr><td>Object ordering</td><td>348-entry painter queue and per-model face order.</td><td>Same queue capacity and two levels of ordering.</td></tr>
<tr><td>Worlds</td><td>Regional terrain, weather, cloud layers and sky objects.</td><td>Also orbital backdrops, rings, underwater environments and interiors.</td></tr>
</tbody>
</table>
</div>

Opcode **121** is an especially neat addition. It calls a subprogram while collecting the edges of its front-facing flat polygons. Projected endpoints are put into a canonical order, so a shared edge is recognised whichever direction a face traverses it. Edges seen twice are suppressed; edges seen only once are drawn in the requested outline colour.

This produces a boundary without drawing every internal polygon seam. The collector has a fixed buffer of 399 distinct edges. It is another example of using the model program to select a rendering operation rather than building a separate mesh just for that effect.

The two games also make a good demonstration of why reusing a decoder is easier than reusing an exact renderer. An Inferno model may parse perfectly with almost all of TFX’s instruction layouts, yet its textures, clipped edges and outlines still need different drawing routines.

<p class="engine-source">Code: <a href="https://github.com/Lost-Engines/inferno-cpp/blob/master/src/models/renderer.cpp">Inferno’s model wrappers and outline collector</a>. Browse <a href="https://lost-engines.github.io/inferno-investigated/">Inferno Investigated</a> for the companion project.</p>

## Following the code all the way down

A convincing aircraft is a useful first milestone. It is a poor test of a renderer’s last few details. A wrong rounding rule can hide in a large face and become obvious only on a thin wing. A texture can look plausible until a lighting remap turns one of its indices into zero. A queue can appear sorted correctly until several parts have the same key.

We used the original executables as callable reference implementations. A harness supplies a routine with coordinates, state and resource bindings, executes its machine instructions, and records the result. For drawing tests it captures the VGA planes and reconstructs the indexed framebuffer. The C++ implementation receives the same inputs, and we compare the indices and state.

That lets us ask focused questions. Which endpoint does a clipper interpolate from? Does this span include the final pixel? Does a zero texel disappear before or after remapping? Does a component restore its selected parameter when it returns? Each question has a small input and a concrete output, and we can then carry the answer into complete model and flight captures.

The result is an engine whose character comes from choices at every scale. The landscape is assembled from local programs. Aircraft carry their own drawing decisions. Palette ramps do shading work. A circle with a patterned mask becomes a cloud, and a group of four VGA planes shapes the innermost loops.

Next time the runway lights slide underneath the cockpit, there is a lot to look for in those 64,000 pixels.

<div class="engine-reading">
<h3>Keep exploring</h3>
<ul>
<li><a href="../weapons/">How TFX’s weapons work</a>: missile guidance, bomb trajectories, damage and countermeasures.</li>
<li><a href="../flight/">How TFX flies</a>: lift, controls, engines and landings inside the flight model.</li>
<li><a href="../models/">Open the model gallery</a> and try the parameters, detail levels and palettes.</li>
<li><a href="../maps/">Explore the five theatres</a> and their assembled scenery.</li>
<li><a href="https://lostengines.com/tfx/">Read the full TFX research</a>, or follow the reconstructed routines in <a href="https://github.com/Lost-Engines/tfx-cpp/tree/master/src/render">TFX C++</a> and <a href="https://github.com/Lost-Engines/inferno-cpp/tree/master/src/render">Inferno C++</a>.</li>
<li>For another engine, Fabien Sanglard’s <a href="https://fabiensanglard.net/duke3d/build_engine_internals.php">Build engine internals</a> is a wonderful tour, and an inspiration for this article.</li>
</ul>
</div>
