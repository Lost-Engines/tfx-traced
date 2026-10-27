/* TFX shape inspection VM. Disk opcodes remain unchanged; the game rewrites
   them to jump-table offsets and converts vertex numbers to 32-byte slots. */
(function (root) {
  'use strict';
  const signed = value => value & 32768 ? value - 65536 : value;
  const determinant = ([a,b,c]) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const add = (a, b) => a.map((value, axis) => value + b[axis]);
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const transform = (matrix, vertex) => [0, 1, 2].map(row =>
    matrix[row * 3] * vertex[0] + matrix[row * 3 + 1] * vertex[1] + matrix[row * 3 + 2] * vertex[2]);

  // Native component generator at 0xdad88, using the original 1024-sample
  // sine table. Its stored matrix is transposed when composed at 0xb9895.
  function rotation(angles) {
    const table = TFX_DATA.sine_table;
    const [p,y,r] = angles.map(a => (a >>> 6) & 1023);
    const sin = phase => table[phase & 1023];
    const cos = phase => sin(phase + 256);
    const half = value => value >> 1;
    const multiply = (a,b) => (a*b) >> 15;
    const sp=sin(p),s=sin(y+r),t=sin(y-r),c=cos(y+r),d=cos(y-r);
    const values = [
      half(multiply(d-c,sp)+c+d), half(-(sin(p+r)-sin(p-r))), half(multiply(s-t,sp)-s-t),
      half(-multiply(s+t,sp)+s-t), half(cos(p+r)+cos(p-r)), -half(multiply(c+d,sp)+d-c),
      half(sin(p+y)-sin(p-y)), sp, half(cos(p-y)+cos(p+y))
    ];
    return [0,1,2].map(row => [0,1,2].map(col => values[col*3+row]/32768));
  }
  const compose = (a,b) => [0,1,2].flatMap(row => [0,1,2].map(col =>
    [0,1,2].reduce((sum,k)=>sum+a[row*3+k]*b[k][col],0)));

  function inspect(model, options = {}) {
    const instructions = new Map(model.instructions.map(instruction => [instruction[0], instruction]));
    const local = [], world = [], vertexScale = [], faces = [], lines = [], points = [], primitives = [], warnings = new Set();
    // Kinds 2/3 bypass the polygon VM: native 0xbb021 / 0xbb094
    // projects the actor origin and draws a two-pixel / one-pixel point.
    if (options.detailRecord !== undefined) {
      const detail = model.detail_records[options.detailRecord];
      if (!detail || ![2,3].includes(detail.kind)) throw Error('Unknown point representation');
      const point = {kind:'point', vertex:[0,0,0], colour:detail.colour,
                     radius:0, mode:null, pixelSize:detail.pixel_size, sourceOffset:detail.offset};
      return {faces, lines, points:[point], primitives:[point], warnings:[], steps:0};
    }
    const parameters = options.parameters || Array(256).fill(0);
    const project = options.project || (vertex => [-vertex[0], vertex[1]]);
    const distance = options.distance || 0;
    // Native projection scales camera translation rather than mesh vertices.
    // Normalising each component by the inverse factor gives one consistent
    // model-space representation. Retain the first absolute scale's raw units.
    const referenceScale = options.referenceScale ?? signed(model.instructions.find(i=>i[1]===48)?.[2][0] ?? 1);
    let cameraScale = options.cameraScale ?? 1;
    let cursor = 0, colour = 112, origin = [...(options.origin || [0,0,0])], matrix = [...(options.matrix || identity)];
    // Native actor drawing seeds the condition byte before entering the
    // model program (e.g. 0xbac16), independently of opcode 72. A known preview
    // binding can supply it; assembled callers may pass the actor byte directly.
    let state = options.initialState ?? parameters[model.initial_state_parameter] ?? 0;
    let texture = null, textureSource = null, uv = null, steps = 0, missing = 0, sourceOffset = 0;
    let jitterShifts = [14,14,14], shadeColours = [];
    const noise = options.jitter;
    function jitter(value, axis) {
      if (!noise) return value;
      // Native 16-bit ADD/ADC generator at 0xbc13a. SHL followed by SAR
      // keeps a signed low-bit displacement: shift 14 gives -2 through +1.
      const sum = noise.x + noise.y;
      noise.x = sum & 65535;
      noise.y = (noise.y + noise.x + (sum > 65535 ? 1 : 0)) & 65535;
      const shift = jitterShifts[axis] & 31;
      const delta = signed((noise.x << shift) & 65535) >> shift;
      return signed((value + delta) & 65535);
    }
    const vertex = index => {
      const value = world[index];
      if (!value) { missing++; return null; }
      return [...value];
    };
    function emit(value) {
      if (options.trace) options.trace.push({index:cursor, at:sourceOffset, value:[...value]});
      local[cursor++] = [...value];
    }
    function projectRange(count, start) {
      for (let index = start; index < start + count; index++) {
        if (local[index]) {
          const scale = referenceScale / cameraScale;
          world[index] = add(local[index].map(value=>value*scale), origin);
          vertexScale[index] = scale;
        }
      }
      cursor = start + count;
    }
    // The shape program orders its drawing calls using facing tests. Preserve
    // that sequence across polygons, lines and point effects, including helpers.
    function primitive(kind, value) {
      const item = {...value, kind, sourceOffset};
      primitives.push(item);
      return item;
    }
    function surface(indices, faceColour = colour, textured = false, mode = null, shades = null) {
      const vertices = indices.map(vertex);
      if (!vertices.every(Boolean)) return;
      // Flat/shaded native rasterisers also reject negative screen winding
      // (0xbd4ba / 0xbda7a), independently of explicit opcode-21 branches.
      if (options.rules !== false && vertices.length >= 3) {
        if (determinant(vertices.slice(0,3).map(project)) < 0) return;
      }
      faces.push(primitive('face', {vertices, colour: faceColour & 255, mode, shades, rounded:false, textured, texture, textureSource, textureName:model.texture_name, uv}));
    }
    function run(entry, depth = 0) {
      if (depth > 64) throw Error('Shape call nesting exceeds 64');
      let address = entry;
      while (true) {
        if (++steps > 50000) throw Error('Shape instruction limit exceeded');
        const instruction = instructions.get(address);
        if (!instruction) throw Error(`Branch does not land on an instruction: 0x${address.toString(16)}`);
        const [at, opcode, args] = instruction;
        sourceOffset = at;
        const next = at + 2 + args.length * 2;
        const target = next - 2 + signed(args.at(-1));
        address = next;
        if (opcode === 0 || opcode === 65535) return;
        if (opcode === 7) { address = target; continue; }
        if (opcode === 8) { run(target, depth + 1); continue; }
        if (opcode === 98) {
          cursor = args[0]; emit(transform(matrix, args.slice(1).map(signed))); continue;
        }
        if (opcode === 99) {
          if (!local[cursor - 1]) throw Error(`Delta vertex has no predecessor at 0x${at.toString(16)}`);
          emit(add(local[cursor - 1], transform(matrix, args.map(signed)))); continue;
        }
        if (opcode >= 100 && opcode <= 112) {
          const axes = {100:[0],101:[1],102:[2],103:[0,1],104:[0,2],105:[1,2],
                        106:[0,1,2],107:[0],108:[1],109:[2],110:[0,1],111:[0,2],112:[1,2]}[opcode];
          const delta = [0, 0, 0];
          axes.forEach((axis, index) => delta[axis] = signed(args[index]));
          const previous = local[cursor - 1];
          if (!previous) throw Error(`Delta vertex has no predecessor at 0x${at.toString(16)}`);
          const value = add(previous, transform(matrix, delta));
          if (opcode >= 106) cursor = args.at(-1);
          emit(value); continue;
        }
        if (opcode === 97) { projectRange(args[0], args[1]); continue; }
        if (opcode === 117) { projectRange(1, args[0]); continue; }
        if (opcode === 83) {
          if (!noise) warnings.add('Procedural vertex jitter held at zero');
          cursor = args[1];
          for (let index = 2; index < args.length; index += 3) {
            emit(transform(matrix, args.slice(index, index + 3).map((value,axis)=>jitter(signed(value),axis))));
          }
          continue;
        }
        if (opcode === 82) { jitterShifts = args.map(value=>value & 255); continue; }
        if (opcode === 72) { state = parameters[args[0]] || 0; continue; }
        if ([23,24,32,33,34,35,36,37,38,39,40,41,63,64,65,66,67,68,69,70].includes(opcode)) {
          const value = args[0] & 255, status = signed(options.status || 0);
          let active = false;
          if (opcode === 23 || opcode === 24) active = Boolean(value & state);
          if (opcode === 32 || opcode === 35) active = value > state;
          if (opcode === 33 || opcode === 36) active = value === state;
          if (opcode === 34 || opcode === 37) active = value < state;
          if (opcode === 38 || opcode === 40) active = signed(args[0]) > distance;
          if (opcode === 39 || opcode === 41) active = signed(args[0]) < distance;
          if (opcode === 63 || opcode === 64) active = Boolean(args[0] & status);
          if (opcode === 65 || opcode === 68) active = signed(args[0]) > status;
          if (opcode === 66 || opcode === 69) active = signed(args[0]) === status;
          if (opcode === 67 || opcode === 70) active = signed(args[0]) < status;
          if (active) {
            if ([24,35,36,37,40,41,64,68,69,70].includes(opcode)) run(target, depth + 1);
            else address = target;
          }
          continue;
        }
        if (opcode === 21) {
          if (options.rules !== false) {
            const vertices = args.slice(0, 3).map(vertex);
            if (vertices.every(Boolean)) {
              if (determinant(vertices.map(project)) >= 0) address = target;
            }
          }
          continue;
        }
        if (opcode === 45 || opcode === 73) {
          const anchorIndex = opcode === 45 ? args[0] : args[9];
          const oldOrigin = origin, oldMatrix = matrix, oldScale = cameraScale;
          const anchor = vertex(anchorIndex);
          if (anchor) {
            origin = anchor;
            if (opcode === 73) matrix = compose(oldMatrix, rotation(args.slice(0,3)));
            run(target, depth + 1);
          }
          origin = oldOrigin; matrix = oldMatrix; cameraScale = oldScale;
          continue;
        }
        if (opcode === 48 || opcode === 54 || opcode === 55) {
          const factor = signed(args[0]);
          if (!factor) throw Error('Zero camera-translation scale cannot be inspected');
          if (opcode === 54) cameraScale *= factor;
          else {
            // 48 and 55 use the original actor translation, discarding an
            // anchored helper's temporary origin; 54 scales its current one.
            cameraScale = opcode === 48 ? factor : 1/factor;
            origin = [0,0,0];
          }
          continue;
        }
        if (opcode === 81) {
          if(!options.externalModels){warnings.add('Carried-store slots have no supplied actor loadout');continue;}
          const child=options.externalModels[args[1]/2],anchor=vertex(args[0]);
          if(!child||!anchor)continue;
          if((options.externalDepth||0)>=4){warnings.add('External submodel recursion limit');continue;}
          // External weapons inherit the parent's matrix and current scale.
          // Their raw vertices use the aircraft's units; they do not start
          // another independently normalised model camera.
          const mesh=inspect(child,{...options,level:0,detailRecord:undefined,initialState:0xf9,
            referenceScale,cameraScale,origin:anchor,matrix,
            externalDepth:(options.externalDepth||0)+1,project});
          for(const item of mesh.primitives){
            const value={...item,externalModel:child.id,externalSlot:args[1]/2};
            primitives.push(value);({face:faces,line:lines,point:points}[value.kind]).push(value);
          }
          for(const warning of mesh.warnings)warnings.add(child.name+': '+warning);
          continue;
        }
        if (opcode === 1) {
          colour = args[0] & 255;
          const vertices = args.slice(1).map(vertex);
          if (vertices.every(Boolean)) lines.push(primitive('line', {vertices, colour}));
          continue;
        }
        if (opcode === 2 || opcode === 3 || opcode === 56) {
          colour = args[0] & 255; surface(args.slice(1)); continue;
        }
        if (opcode === 4) { colour = args[0] & 255; surface(args.slice(2)); continue; }
        if ([26, 27, 62, 90, 91].includes(opcode)) {
          const offset = [26, 27, 62, 91].includes(opcode) ? 1 : 0;
          colour = args[offset] & 255;
          const before=faces.length;surface(args.slice(offset + 1),colour,false,[26,27,62].includes(opcode)?args[0]:null);
          if(opcode===62&&faces.length>before)faces.at(-1).rounded=true;
          continue;
        }
        if (opcode === 76 || opcode === 78) {
          // The converter deliberately leaves these four packed bytes alone.
          // Native 0xbc498/0xbc4b8 stores each colour byte as an 8.8 index.
          shadeColours=args.flatMap(word=>[word>>>8,word&255]).slice(0,opcode===76?3:4);
          continue;
        }
        if (opcode === 77 || opcode === 79) {
          if(shadeColours.length<args.length)warnings.add('Shaded polygon has incomplete colour attributes');
          surface(args,shadeColours[0]??colour,false,null,shadeColours.slice(0,args.length));continue;
        }
        if (opcode === 113 || opcode === 114) {
          surface(args); continue;
        }
        if (opcode === 115 || opcode === 80) { surface(args.slice(1)); continue; }
        if (opcode === 46 || opcode === 71) {
          texture = args[0]; textureSource = opcode === 71 ? 'global' : 'model'; uv = [];
          for (let index = 2; index < args.length; index += 2) uv.push(args.slice(index,index+2));
          continue;
        }
        if (opcode === 47) { surface(args.slice(1), 112, true); continue; }
        if (opcode === 50) { surface(args.slice(1),shadeColours[0]??colour,false,null,shadeColours.slice(0,args[0])); continue; }
        if ([51, 52, 92, 93, 95, 96].includes(opcode)) {
          const records = opcode === 95 || opcode === 96 ? args[0] : 1;
          const stride = opcode === 96 ? 4 : opcode === 95 ? 3 : args.length;
          for (let index = 0; index < records; index++) {
            const record = records === 1 && ![95,96].includes(opcode) ? args : args.slice(1+index*stride,1+(index+1)*stride);
            const offset = opcode === 93 || opcode === 96 ? 1 : 0;
            const position = vertex(record[offset + 1]);
            // Only 51/52 are fixed-size screen dots. A nonzero pixelSize
            // takes precedence over radius in viewers, so sized-circle
            // commands must leave it zero even when their radius is tiny.
            const pixelSize = opcode === 51 ? 1 : opcode === 52 ? 2 : 0;
            if (position) points.push(primitive('point', {vertex:position, colour:record[offset]&255,
                                       radius: (record[offset+2] || 0)*Math.abs(vertexScale[record[offset+1]] ?? 1), mode: offset ? record[0] : null, pixelSize}));
          }
          continue;
        }
        if ([63, 71, 74, 76, 78, 84, 86, 87, 88, 89, 118].includes(opcode)) continue;
        warnings.add(`Drawing opcode ${opcode} omitted`);
      }
    }
    run(model.levels[options.level || 0].entry);
    if (missing) warnings.add(`${missing} unavailable vertex references omitted`);
    return {faces, lines, points, primitives, warnings:[...warnings], steps};
  }
  root.TFXModel = {inspect,rotation};
})(typeof globalThis !== 'undefined' ? globalThis : window);
