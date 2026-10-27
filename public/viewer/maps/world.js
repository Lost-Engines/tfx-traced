/* Shared scenery assembly. Each terrain tag lists alternative SSDs: choose
   one per cell. Native negative Y points up; a tile spans 2048 world units. */
(function(root){
'use strict';
const models=new Map(),objects=new Map(),cache=new Map(),variantCache=new WeakMap();
const cellUnits=2048,inspectionGroundColour=32,nightStatus=0x80;
for(const model of TFX_DATA.models){models.set(model.name,model);for(const name of model.names||[])models.set(name.split('/').at(-1).replace(/\.3$/,''),model);}
for(const object of Object.values(TFX_WORLD.objects))for(const name of object.names)objects.set(name,object);
// Separate shapes share native world units in an assembly. The standalone
// browser keeps each resource's first camera scale for convenient inspection;
// applying that convention here enlarges e.g. runway details by ten times.
function geometry(name,status=0){const key=`${name}:${status}`;if(cache.has(key))return cache.get(key);const model=models.get(name);let mesh={faces:[],lines:[],points:[],warnings:[]};if(model)try{mesh=TFXModel.inspect(model,{rules:false,referenceScale:1,status});}catch(e){mesh.warnings=[e.message];}else mesh.warnings=[`No decoded model: ${name}`];cache.set(key,mesh);return mesh;}
// The original environment parser sets the shape status bit tested by city
// and runway programs. Twilight configurations also explicitly request night.
function environmentStatus(environment){return (environment.config||'').split(/\s+/).includes('night')?nightStatus:0;}
// The mission's world selects geometry; type selects a separate lighting
// configuration. Weather-named grids are retained data, not retail maps.
const regions=[
 {name:'yugoslav',label:'Yugoslavia',prefix:'yugos',day:'yugos_d'},
 {name:'columbia',label:'Colombia',prefix:'colum',day:'colum_d'},
 {name:'somalia',label:'Somalia',prefix:'somal',day:'somal_d'},
 {name:'libya',label:'Libya',prefix:'libya',day:'libya_d'},
 {name:'seaworld',label:'Atlantic',prefix:'sea',day:'seaclear'}
];
const environmentNamed=name=>TFX_WORLD.environments.find(e=>e.name===name);
function regionFor(name){return regions.find(r=>name?.startsWith(r.prefix)||(name==='y_winter'&&r.name==='yugoslav'));}
function isRegional(environment){return regions.some(r=>r.name===environment?.name);}
function missionGrid(mission){return environmentNamed(mission?.world?.toLowerCase().slice(0,8));}
function lightingChoices(environment){const region=regionFor(environment?.name);return TFX_WORLD.environments.filter(e=>region&&regionFor(e.name)===region&&/\b(day|night)\b/.test(e.config));}
function gridNote(environment){
 if(environment.name==='clouds')return 'Cloud-layer geometry, shown here in isolation from its runtime altitude and regional ground map.';
 return isRegional(environment)?'':'Archived terrain: this grid is not used for retail mission terrain. Obsolete scenery may appear here.';
}
function mapDescription(environment,lighting){
 const note=gridNote(environment);
 const undefinedCount=Object.keys(environment.undefined_tile_indices).length;
 return `${environment.name}: ${environment.width} × ${environment.height} cells, ${environment.tiles.length} authored tiles. Lighting: ${lighting?.name||'none'}.${note?' '+note:''}${undefinedCount?' Undefined stored tile references are shown magenta.':''}`;
}
function parts(name){const definition=objects.get(name);if(!definition)return[{name,offset:[0,0,0]}];const draws=definition.draw_parts.length?definition.draw_parts:definition.parts.filter(p=>p.slot===0).map(p=>({slot:p.slot}));return draws.map(draw=>{const p=definition.parts.find(p=>p.slot===draw.slot);return p?{...p,offset:definition.anchors[draw.anchor]||[0,0,0]}:null;}).filter(Boolean);}
// SSD draw calls enqueue complete shapes. Native 0xcc226 adds the model's
// signed header bias to camera depth; the queue then paints far to near.
// This inspection projection returns depth towards the viewer, so subtract
// the projected anchor. Keep authored primitive order inside each shape.
function drawOrder(definition,project){
 const draws=definition.draw_parts.length?definition.draw_parts:definition.parts.filter(p=>p.slot===0).map(p=>({slot:p.slot}));
 return draws.map(draw=>{
  const part=definition.parts.find(p=>p.slot===draw.slot),model=models.get(part?.name);
  const offset=definition.anchors[draw.anchor]||[0,0,0];
  return {draw,key:(model?.sort_depth_bias||0)-project(offset)[2]};
 }).sort((a,b)=>b.key-a.key).map(item=>item.draw);
}
function variants(environment){
 if(variantCache.has(environment))return variantCache.get(environment);
 const result=Array(environment.width*environment.height);
 // Native rand reset/step at 0xc9898/0xc98a3. Keep a reproducible inspection
 // choice in the loader's row-major, reversed-Z visitation order. SSD
 // initialiser side effects may consume additional draws in the full game.
 let low=0x5926,high=0x3141;
 for(let row=environment.height-1;row>=0;row--)for(let col=0;col<environment.width;col++){
  const index=row*environment.width+col,tile=environment.tiles[environment.cells[index]];
  if(!tile?.variants.length)continue;
  const sum=high+low;high=sum&65535;low=(low+high+(sum>65535?1:0))&65535;
  result[index]=tile.variants[high%tile.variants.length];
 }
 variantCache.set(environment,result);return result;
}
function variant(environment,x,z){return variants(environment)[z*environment.width+x];}
// Native terrain placement (0xb481c–0xb4888) uses four exact quarter
// turns: positive heading maps +X towards -Z. Apply the same turn to
// geometry, part anchors and collision boxes; the map grid itself is unchanged.
function rotateTile(v,angle){
 switch((angle>>>14)&3){
  case 1:return[v[2],v[1],-v[0]];
  case 2:return[-v[0],v[1],-v[2]];
  case 3:return[-v[2],v[1],v[0]];
  default:return[...v];
 }
}
function assemble(environment,x,z,radius=0,{status=environmentStatus(environment)}={}){
 const faces=[],lines=[],points=[],warnings=new Set(),collisions=[];let cells=0;
 const firstRow=Math.max(0,z-radius),lastRow=Math.min(environment.height-1,z+radius);
 const firstColumn=Math.max(0,x-radius),lastColumn=Math.min(environment.width-1,x+radius);
 // Field and desert models contain markings rather than a complete ground
 // surface. Supply an inspection backdrop one native unit below ground.
 // The viewer draws it without writing depth, so authored terrain and water
 // always cover it even when their small height gap loses depth precision.
 faces.push({vertices:[[firstColumn-x-.5,1/cellUnits,firstRow-z-.5],[lastColumn-x+.5,1/cellUnits,firstRow-z-.5],[lastColumn-x+.5,1/cellUnits,lastRow-z+.5],[firstColumn-x-.5,1/cellUnits,lastRow-z+.5]],colour:inspectionGroundColour,component:'inspection_ground',inspection:true});
 for(let row=firstRow;row<=lastRow;row++)for(let col=firstColumn;col<=lastColumn;col++){
  const tile=environment.tiles[environment.cells[row*environment.width+col]];
  if(!tile){warnings.add('Undefined tile reference');continue;}cells++;
  const move=(v,offset=[0,0,0])=>{const a=rotateTile(v.map((n,i)=>n+offset[i]),tile.rotation);return[a[0]/cellUnits+col-x,a[1]/cellUnits,a[2]/cellUnits+row-z];};
  const name=variant(environment,col,row),definition=objects.get(name);
  if(!name)continue;
  for(const part of parts(name)){
   const mesh=geometry(part.name,status),rotation=TFXModel.rotation(part.rotation||[0,0,0]);
   const placed=v=>rotation.map(row=>row.reduce((sum,n,i)=>sum+n*v[i],0));
   for(const warning of mesh.warnings)warnings.add(warning);
   for(const face of mesh.faces)faces.push({...face,vertices:face.vertices.map(v=>move(placed(v),part.offset)),component:part.name,cell:[col,row],variant:name});
   for(const line of mesh.lines)lines.push({...line,vertices:line.vertices.map(v=>move(placed(v),part.offset))});
   for(const point of mesh.points)points.push({...point,vertex:move(placed(point.vertex),part.offset),radius:point.radius/cellUnits,component:part.name,cell:[col,row],variant:name});
  }
  for(const box of definition?.collision_tests||[]){
   if(![12,13].includes(box.opcode))continue;
   const a=box.coordinates.slice(0,3),b=box.coordinates.slice(3),points=[];
   for(let i=0;i<8;i++)points.push(move([i&1?b[0]:a[0],i&2?b[1]:a[1],i&4?b[2]:a[2]]));
   for(const [a,b] of [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]])collisions.push({vertices:[points[a],points[b]],colour:255});
  }
 }
 return{faces,lines,points,collisions,warnings:[...warnings],cells};
}
root.TFXScenery={regions,environmentNamed,regionFor,isRegional,missionGrid,lightingChoices,gridNote,mapDescription,assemble,parts,drawOrder,geometry,environmentStatus,nightStatus,variant,rotateTile,models,objects};
})(globalThis);
