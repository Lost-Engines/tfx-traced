'use strict';
const el=id=>document.getElementById(id),environments=TFX_WORLD.environments,missions=TFX_WORLD.missions;
let environment=TFXScenery.environmentNamed('yugoslav'),lighting=TFXScenery.environmentNamed('yugos_n'),mission=null,x=136,z=114,yaw=.6,pitch=.65,distance=11,mesh,sceneRadius=1,hiddenRoutes=new Set();
for(const [label,rows]of [
 ['Game terrain',TFXScenery.regions.map(r=>new Option(`${r.label} (${r.name})`,r.name))],
 ['Archived and auxiliary grids — inspection only',environments.filter(e=>!TFXScenery.isRegional(e)).map(e=>new Option(e.name==='clouds'?'clouds (cloud layer)':`Archived: ${e.name}`,e.name))]
]){const group=document.createElement('optgroup');group.label=label;group.append(...rows);el('environment').append(group);}
function chooseLighting(preferred){
 const choices=TFXScenery.lightingChoices(environment),fallback=TFXScenery.regionFor(environment.name)?.day;
 lighting=choices.find(e=>e.name===preferred)||choices.find(e=>e.name===fallback)||null;
 el('lighting').replaceChildren(...choices.map(e=>new Option(e.name,e.name)));
 el('lighting').disabled=!choices.length;if(lighting)el('lighting').value=lighting.name;
}
function updateURL(){
 const url=new URL(location.href);url.hash=`${environment.name}/${x}/${z}`;
 if(mission)url.searchParams.set('mission',mission.id);else url.searchParams.delete('mission');
 if(lighting)url.searchParams.set('lighting',lighting.name);else url.searchParams.delete('lighting');
 if(TFXScenery.isRegional(environment))url.searchParams.delete('retained');else url.searchParams.set('retained','1');
 history.replaceState(null,'',url);
}
TFXMissions.groupSelect(el('mission-group'));
TFXMissions.missionOptions(el('mission'),missions);
el('palette').replaceChildren(...Object.keys(TFX_DATA.palettes).map(name=>new Option(name,name)));
el('palette').value='yugoslav';el('environment').value=environment.name;
const canvas=el('scene'),gl=canvas.getContext('webgl2',{antialias:false,preserveDrawingBuffer:true});
let program,buffer,vertexCount=0,backdropVertexCount=0,lineStart=0,collisionStart=0,totalLines=0,totalCollisions=0,pointStart=0,totalPoints=0;
const vertexStride=11;
if(gl){function shader(kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,`#version 300 es
 in vec3 position;in vec3 colour;in vec2 textureUV;in float textureLayer;in float shadeIndex;in float pointPixels;uniform float pixelScale;uniform vec3 camera;uniform vec3 right;uniform vec3 up;uniform vec3 forward;uniform float aspect;uniform vec2 depthProjection;out vec3 rgb;out vec2 uv;out float clipDepth;flat out float page;out float shade;
 // Multiplying UVs by clip W and dividing interpolated values in the
 // fragment shader preserves screen-space affine sampling in WebGL.
 void main(){vec3 p=vec3(position.x,-position.y,-position.z)-camera;float d=dot(p,forward);gl_Position=vec4(dot(p,right)*1.7/aspect,dot(p,up)*1.7,depthProjection.x*d-depthProjection.y,d);
 // Lights sit on authored ground planes. A tiny depth offset prevents
 // coplanar flicker while retaining occlusion by buildings and hills.
 gl_Position.z-=pointPixels>0.0?0.000002*d:0.0;
 gl_PointSize=max(1.0,floor(pointPixels*pixelScale+.5));rgb=colour;uv=textureUV*d;clipDepth=d;page=textureLayer;shade=shadeIndex*d;}`));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`#version 300 es
 precision highp float;precision highp sampler2DArray;in vec3 rgb;in vec2 uv;in float clipDepth;flat in float page;in float shade;uniform sampler2DArray indexPages;uniform sampler2D paletteColours;out vec4 pixel;
 void main(){if(page<0.0){if(shade/clipDepth>=0.0){int index=clamp(int(floor(shade/clipDepth)),0,255);pixel=vec4(texelFetch(paletteColours,ivec2(index,0),0).rgb,1.0);}else pixel=vec4(rgb,1.0);return;}int index=int(texture(indexPages,vec3(uv/clipDepth,page)).r*255.0+.5);if(index==0)discard;pixel=vec4(texelFetch(paletteColours,ivec2(index,0),0).rgb,1.0);}`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const [name,offset] of [['position',0],['colour',12],['textureUV',24],['textureLayer',32],['shadeIndex',36],['pointPixels',40]]){const at=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,name==='textureUV'?2:['textureLayer','shadeIndex','pointPixels'].includes(name)?1:3,gl.FLOAT,false,vertexStride*4,offset);}gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,gl.createTexture());gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.R8,256,192,TFXTextures.pages.length);
 TFXTextures.pages.forEach((page,layer)=>gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,256,192,1,gl.RED,gl.UNSIGNED_BYTE,TFXTextures.pixels(page)));
 for(const target of [gl.TEXTURE_2D_ARRAY]){gl.texParameteri(target,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(target,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(target,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(target,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
 gl.uniform1i(gl.getUniformLocation(program,'indexPages'),0);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.uniform1i(gl.getUniformLocation(program,'paletteColours'),1);
}
function palette(){return TFX_DATA.palettes[el('palette').value];}
function rebuild(){mesh=TFXScenery.assemble(environment,x,z,+el('radius').value,{status:el('night-lights').checked?TFXScenery.nightStatus:0});const data=[],colours=palette();let textured=0;const emit=(v,colour,uv=[0,0],layer=-1,shade=-1,pointPixels=0)=>data.push(...v.slice(0,3),...(colours[colour]||[63,30,63]).map(n=>n/63),...uv,layer,shade,pointPixels);
 const emitFace=f=>{
  const page=TFXTextures.resolve(f);if(f.textured&&!page)textured++;
  const vertices=page?f.vertices.map((v,i)=>[...v,...f.uv[i]]):f.shades?.length===f.vertices.length?f.vertices.map((v,i)=>[...v,f.shades[i]]):f.vertices;
  for(const triangle of TFXPolygon.triangulate(vertices))for(const v of triangle)emit(v,f.textured?112:f.colour,page?[v[3]/page.width,v[4]/page.height]:[0,0],page?TFXTextures.pages.indexOf(page):-1,!page&&f.shades?.length===f.vertices.length?v[3]:-1);
 };
 for(const f of mesh.faces)if(f.inspection)emitFace(f);
 backdropVertexCount=data.length/vertexStride;
 for(const f of mesh.faces)if(!f.inspection)emitFace(f);
 sceneRadius=1;for(const face of [...mesh.faces,...mesh.lines,...mesh.collisions])for(const v of face.vertices)sceneRadius=Math.max(sceneRadius,Math.hypot(...v));vertexCount=data.length/vertexStride;lineStart=vertexCount;for(const line of mesh.lines)for(const v of line.vertices)emit(v,line.colour);totalLines=data.length/vertexStride-lineStart;collisionStart=data.length/vertexStride;for(const line of mesh.collisions)for(const v of line.vertices)data.push(...v,1,.3,.15,0,0,-1,-1,0);totalCollisions=data.length/vertexStride-collisionStart;
 // Only opcodes 51/52 are screen-sized lights. Sized smoke and fire circles
 // have world-space radii and belong to the separate actor-effects path.
 pointStart=data.length/vertexStride;
 for(const point of mesh.points)if(point.pixelSize){emit(point.vertex,point.colour,[0,0],-1,-1,point.pixelSize);sceneRadius=Math.max(sceneRadius,Math.hypot(...point.vertex));}
 totalPoints=data.length/vertexStride-pointStart;
 if(gl){gl.activeTexture(gl.TEXTURE1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,256,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array(colours.flat().map(n=>Math.round(n*255/63))));gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);}el('radius-value').textContent=`${el('radius').value} tiles`;el('scene-status').textContent=`${mesh.cells} cells · ${mesh.faces.length.toLocaleString()} faces · ${totalPoints.toLocaleString()} lights. ${textured?`${textured} faces have unresolved runtime textures. `:''}${!gl?'WebGL 2 is unavailable in this browser. ':''}${mesh.warnings.slice(0,4).join('; ')}${mesh.warnings.length>4?'; see the research archive for full notes':''}`;
 render();}
function render(){if(!gl)return;const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.05,.08,.12,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);/* Flip Y and Z together to preserve handedness in WebGL; match the model viewer's native orbit. */const camera=[Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,-Math.cos(yaw)*Math.cos(pitch)*distance],forward=camera.map(v=>-v/distance),right=[-Math.cos(yaw),0,-Math.sin(yaw)],up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),Math.cos(yaw)*Math.sin(pitch)];for(const [key,value] of Object.entries({camera,forward,right,up}))gl.uniform3fv(gl.getUniformLocation(program,key),value);gl.uniform1f(gl.getUniformLocation(program,'aspect'),canvas.width/canvas.height);gl.uniform1f(gl.getUniformLocation(program,'pixelScale'),Math.min(canvas.width/320,canvas.height/200));const near=Math.max(.01,(distance-sceneRadius)*.5),far=distance+sceneRadius+1;gl.uniform2fv(gl.getUniformLocation(program,'depthProjection'),[(far+near)/(far-near),2*far*near/(far-near)]);/* The inspection backdrop fills gaps but must never compete with
   authored terrain for depth, especially over distant flat water. */gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,backdropVertexCount);gl.depthMask(true);gl.drawArrays(gl.TRIANGLES,backdropVertexCount,vertexCount-backdropVertexCount);gl.drawArrays(gl.LINES,lineStart,totalLines);gl.depthMask(false);gl.drawArrays(gl.POINTS,pointStart,totalPoints);gl.depthMask(true);if(el('bounds').checked)gl.drawArrays(gl.LINES,collisionStart,totalCollisions);}
function drawMap(){const c=el('map'),ctx=c.getContext('2d');TFXMap.drawBackground(ctx,environment,palette(),el('map-mode').value,lighting);if(el('routes').checked&&mission){const set=TFX_WORLD.waypoints[mission.way];for(const [index,route] of (set?.routes||[]).entries()){if(hiddenRoutes.has(index))continue;ctx.strokeStyle=index===0?'#ffe77b':`hsl(${index*47%360} 80% 65%)`;ctx.lineWidth=index===0?3:1.5;ctx.beginPath();route.points.forEach((p,i)=>i?ctx.lineTo((p.x+.5)*4,(p.z+.5)*4):ctx.moveTo((p.x+.5)*4,(p.z+.5)*4));ctx.stroke();}}
 if(el('compiled').checked&&mission){const program=TFX_WAYPOINTS.programs.find(p=>p.names.some(n=>n===`waybin/${mission.way}.way`));if(program){for(const [i,r]of program.records.entries()){ctx.strokeStyle=r.type===18?'#fff399':r.type===16?'#fd9f70':'#78d7ff';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.beginPath();(r.route||[]).forEach((p,n)=>n?ctx.lineTo((p.x+.5)*4,(p.z+.5)*4):ctx.moveTo((p.x+.5)*4,(p.z+.5)*4));ctx.stroke();ctx.setLineDash([]);if(r.x!==undefined){ctx.fillRect((r.x+.5)*4-3,(r.z+.5)*4-3,6,6);}}}}
 if(el('poi').checked&&mission){for(const p of mission.points){ctx.fillStyle=p.kind==='start'?'#61ffee':'#ff7e63';ctx.beginPath();ctx.arc((p.x+(p.kind==='start'?0:.5))*4,(p.z+(p.kind==='start'?0:.5))*4,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#000';ctx.stroke();}ctx.strokeStyle='#fc7cc4';for(const box of mission.flak)ctx.strokeRect(box[0]*4,box[1]*4,(box[2]-box[0])*4,(box[3]-box[1])*4);}
 ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(x*4-2,z*4-2,8,8);ctx.fillStyle='#fff';ctx.font='12px system-ui';for(let i=0;i<200;i+=25){ctx.fillText(i,i*4+3,13);ctx.fillText(i,3,i*4+15);}}
function selectCell(){const id=environment.cells[z*200+x],tile=environment.tiles[id];el('cell-title').textContent=`Cell (${x}, ${z}) · tile ${id}`;el('cell-info').textContent=tile?`${tile.variants.length} scenery variants · preview: ${TFXScenery.variant(environment,x,z)} · rotation ${(tile.rotation*360/65536).toFixed(0)}°`:'Undefined tile index in the stored table';el('tile-data').textContent=JSON.stringify(tile||{undefined_tile:id},null,2);el('components').replaceChildren(...(tile?.variants||[]).map(name=>{const d=document.createElement('details'),summary=document.createElement('summary');summary.textContent=name+(name===TFXScenery.variant(environment,x,z)?' (previewed variant)':'');d.append(summary);const object=TFXScenery.objects.get(name),parts=TFXScenery.parts(name);for(const p of parts){const m=TFXScenery.models.get(p.name),a=document.createElement('a');a.textContent=`${p.name} at (${p.offset.join(', ')})`;if(m)a.href='../models/index.html#'+m.id;d.append(a,document.createElement('br'));}if(object){const pre=document.createElement('pre');pre.textContent=JSON.stringify({path:object.path,anchors:object.anchors,parts:object.parts,draw_parts:object.draw_parts,collision_tests:object.collision_tests,custom_initial_values:object.custom_initial_values,warnings:object.warnings},null,2);d.append(pre);}return d;}));updateURL();drawMap();rebuild();}
function settings(){el('map-status').textContent=TFXScenery.mapDescription(environment,lighting);el('grid-note').textContent=TFXScenery.gridNote(environment);}
function selectMission(focus){mission=missions.find(m=>m.id===el('mission').value)||null;hiddenRoutes.clear();if(mission){const env=TFXScenery.missionGrid(mission);if(env){environment=env;el('environment').value=env.name;chooseLighting(mission.environment);choosePalette();}const start=mission.points.find(p=>p.kind==='start');if(start){x=Math.max(0,Math.min(199,Math.floor(start.x)));z=Math.max(0,Math.min(199,Math.floor(start.z)));}}const set=mission&&TFX_WORLD.waypoints[mission.way];el('mission-data').textContent=mission?.script||'Select a mission to inspect its script.';TFXMissions.card(el('mission-info'),mission);el('way-data').textContent=set?.text||'No corresponding waypoint text was recovered.';el('route-list').replaceChildren(...(set?.routes||[]).map((r,i)=>{const label=document.createElement('label');label.style.display='flex';const box=document.createElement('input');box.type='checkbox';box.checked=true;box.onchange=()=>{box.checked?hiddenRoutes.delete(i):hiddenRoutes.add(i);drawMap();};label.append(box,`${r.name} (${r.points.length} waypoints)`);return label;}));if(focus?.environment===environment.name){x=focus.x;z=focus.z;}settings();selectCell();}
function choosePalette(){el('palette').value=TFXMap.paletteName(lighting||environment);el('night-lights').checked=Boolean(lighting&&TFXScenery.environmentStatus(lighting));}
function filterMissions(){const previous=el('mission').value,query=el('mission-search').value,rows=missions.filter(m=>TFXMissions.matches(m,el('mission-group').value)&&TFXMissions.search(m,query));TFXMissions.missionOptions(el('mission'),rows);if(rows.some(m=>m.id===previous))el('mission').value=previous;if(el('mission').value!==previous)selectMission();}
el('mission-group').onchange=filterMissions;el('mission-search').oninput=filterMissions;
el('environment').onchange=()=>{environment=environments.find(e=>e.name===el('environment').value);mission=null;el('mission').value='';chooseLighting(environment.name);choosePalette();settings();selectMission();};el('mission').onchange=selectMission;el('lighting').onchange=()=>{lighting=TFXScenery.environmentNamed(el('lighting').value);choosePalette();settings();updateURL();drawMap();rebuild();};el('palette').onchange=()=>{drawMap();rebuild();};for(const id of ['routes','poi','compiled','map-mode'])el(id).onchange=drawMap;el('map').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();x=Math.max(0,Math.min(199,Math.floor((e.clientX-r.left)/r.width*200)));z=Math.max(0,Math.min(199,Math.floor((e.clientY-r.top)/r.height*200)));selectCell();};el('radius').onchange=()=>{distance=Math.max(3,(+el('radius').value+1)*2.5);rebuild();};el('bounds').onchange=render;el('night-lights').onchange=rebuild;el('reset').onclick=()=>{yaw=.6;pitch=.65;distance=Math.max(3,(+el('radius').value+1)*3);render();};let pointer;
canvas.onpointerdown=e=>{pointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!pointer)return;yaw+=(e.clientX-pointer[0])*.008;pitch=Math.max(-.2,Math.min(1.5,pitch+(e.clientY-pointer[1])*.008));pointer=[e.clientX,e.clientY];render();};canvas.onpointerup=canvas.onpointercancel=()=>pointer=null;canvas.onwheel=e=>{e.preventDefault();distance=Math.max(.2,Math.min(Math.max(80,sceneRadius*4),distance*Math.exp(e.deltaY*.001)));render();};addEventListener('resize',render);
const query=new URLSearchParams(location.search),hash=location.hash.slice(1).split('/');
let focus=null,requestedLighting=query.get('lighting')||lighting.name;
if(hash.length===3&&TFXScenery.environmentNamed(hash[0])){
 const stored=TFXScenery.environmentNamed(hash[0]),region=TFXScenery.regionFor(stored.name);
 // Old public links named the weather setting. Keep their location and
 // lighting while moving to the game terrain; retained=1 explicitly opts out.
 environment=query.get('retained')==='1'||!region?stored:TFXScenery.environmentNamed(region.name);
 requestedLighting=query.get('lighting')||(stored.config?stored.name:TFXScenery.regionFor(stored.name)?.day);
 x=Math.max(0,Math.min(199,+hash[1]||0));z=Math.max(0,Math.min(199,+hash[2]||0));
 focus={environment:environment.name,x,z};el('environment').value=environment.name;
}
chooseLighting(requestedLighting);choosePalette();
const requestedMission=query.get('mission');if(requestedMission)el('mission').value=requestedMission;
selectMission(focus);
// An explicit lighting choice survives reloading a mission deep link.
if(query.has('lighting')){chooseLighting(query.get('lighting'));choosePalette();settings();selectCell();}
