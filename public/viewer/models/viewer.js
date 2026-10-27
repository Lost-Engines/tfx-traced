'use strict';
const element = id => document.getElementById(id);
const labels = {
  f22:'F-22 Raptor', f_22:'F-22 variant', f_16:'F-16 Fighting Falcon',
  efa:'Eurofighter', efa_ded:'Eurofighter wreck', f117:'F-117 Nighthawk',
  f117a:'F-117 variant', mig_29:'MiG-29', mig_21:'MiG-21',
  airaew:'Airborne early warning aircraft', tanker:'Tanker aircraft',
  chinook:'Chinook', amraam:'AIM-120 AMRAAM', sidewind:'Sidewinder',
  carrier:'Aircraft carrier', battlesh:'Battleship', apache:'Apache',
};
const models = TFX_DATA.models;
const usageById=TFX_MODEL_USAGE.models,categories=TFX_MODEL_USAGE.categories,categoryById=new Map(categories.map(c=>[c.id,c]));
const usageSearch=new Map(models.map(m=>[m.id,[m.name,m.id,labels[m.name]||'',...m.names,...(usageById[m.id]?.roles||[]).map(r=>categoryById.get(r).label),...(usageById[m.id]?.evidence||[]).map(e=>e.detail)].join(' ').toLowerCase()]));
const allGroup=new Option('All models ('+models.length.toLocaleString()+')','all');element('group').append(allGroup);
for(const root of categories.filter(c=>!c.parent)){
 const optgroup=document.createElement('optgroup');optgroup.label=root.label;
 optgroup.append(new Option('All '+root.label.toLowerCase()+' ('+root.count+')',root.id));
 for(const child of categories.filter(c=>c.parent===root.id))if(child.count)optgroup.append(new Option('  '+child.label+' ('+child.count+')',child.id));
 element('group').append(optgroup);
}
element('group').append(new Option('Use not yet classified ('+TFX_MODEL_USAGE.summary.unassigned+')','unassigned'));
function showAssemblies(model){
 const assemblies=usageById[model.id]?.assemblies||[];
 element('assembly-summary').textContent=`Assembled scenery & actors (${assemblies.length})`;
 element('assembly-empty').hidden=assemblies.length>0;
 element('assembly-links').replaceChildren(...assemblies.map(assembly=>{
  const link=document.createElement('a'),name=document.createElement('strong'),note=document.createElement('small');
  link.href='https://lostengines.com/tfx/analysis/objects/index.html#'+assembly.id;name.textContent=assembly.name;
  const roles=[];
  for(const [field,label] of [['drawn_parts','Initial assembly'],['loaded_parts','Loaded, hidden initially'],['event_parts','Event / conditional assignment']]){
   const parts=assembly[field];if(parts.length)roles.push(`${label} · part${parts.length===1?'':'s'} ${parts.join(', ')}`);
  }
  note.textContent=roles.join('; ');link.append(name,note);return link;
 }));
}
function showUses(model){
 const usage=usageById[model.id]||{roles:[],evidence:[]};
 // Show the most specific categories; parent choices remain in the Use menu.
 const leaves=usage.roles.filter(role=>!categories.some(c=>c.parent===role&&usage.roles.includes(c.id)));
 element('usage-tags').replaceChildren(...leaves.map(role=>{const c=categoryById.get(role),button=document.createElement('button');button.type='button';button.textContent=(c.parent?categoryById.get(c.parent).label+' › ':'')+c.label;button.onclick=()=>{element('group').value=role;element('naming').value='all';element('search').value='';filter();};return button;}));
 const list=document.createElement('ul');
 for(const evidence of usage.evidence){const li=document.createElement('li'),label=document.createElement('strong');label.textContent=categoryById.get(evidence.role).label+' · '+evidence.kind+': ';li.append(label,document.createTextNode(evidence.detail));if(evidence.link){const a=document.createElement('a');a.href=evidence.link;a.textContent=' Source';if(evidence.link.startsWith('#'))a.onclick=event=>{const target=models.find(m=>m.id===evidence.link.slice(1));if(target){event.preventDefault();element('group').value='all';element('naming').value='all';element('search').value='';choose(target);filter();}};li.append(a);}list.append(li);}
 element('usage-evidence').replaceChildren(usage.evidence.length?list:document.createTextNode('No use has been assigned from the current references. The model remains available for inspection.'));
}
let active = models.find(model => model.name === decodeURIComponent(location.hash.slice(1)) || model.id === location.hash.slice(1)) || models.find(model => model.name === 'f22');
let yaw = .65, pitch = .35, zoom = 1, pan = [0,0], page = 0, filtered = [], parameters = Array(256).fill(0);
let externalModels=Array(10).fill(null);
let bounds, previousTime, effectTime=0, stateTime=0, statePlaying=false, stateDirection=1;
let noise={x:12609,y:22822},proceduralNoise={seed:0x4321};
const pageSize = 30;
const canvas = element('main'), context = canvas.getContext('2d');
const thumbnails = new Map(), visibleThumbnails = new Set();
let thumbnailRevision = 0, thumbnailFrame = 0, thumbnailView = '';
// Keep the unpaged gallery affordable: redraw only visible and nearby tiles.
const thumbnailObserver = new IntersectionObserver(entries => {
  for(const entry of entries) {
    const view=thumbnails.get(entry.target);if(!view)continue;
    if(entry.isIntersecting)visibleThumbnails.add(view);else visibleThumbnails.delete(view);
  }
  updateThumbnails();
}, {rootMargin:'120px'});
const title = model => labels[model.name] ? `${labels[model.name]} · ${model.name}` : model.name;
function project(vertex) {
  const [x,y,z] = vertex;
  const horizontal = x*Math.cos(yaw) - z*Math.sin(yaw);
  const depth = x*Math.sin(yaw) + z*Math.cos(yaw);
  // Look towards the origin from positive Z. Native negative Y is up;
  // reversing screen X keeps this view's handedness and facing tests consistent.
  return [-horizontal, y*Math.cos(pitch)+depth*Math.sin(pitch), -y*Math.sin(pitch)+depth*Math.cos(pitch)];
}
function getBounds(geometry) {
  const vertices = [...geometry.faces.flatMap(face => face.vertices), ...geometry.lines.flatMap(line => line.vertices),
    ...geometry.points.flatMap(point => point.radius ? [point.vertex.map(v=>v-point.radius),point.vertex.map(v=>v+point.radius)] : [point.vertex])];
  if (!vertices.length) return {centre:[0,0,0], radius:100};
  const minimum = [0,1,2].map(axis => Math.min(...vertices.map(vertex => vertex[axis])));
  const maximum = [0,1,2].map(axis => Math.max(...vertices.map(vertex => vertex[axis])));
  const centre = minimum.map((value,axis) => (value+maximum[axis])/2);
  return {centre, radius:Math.max(1,...vertices.map(vertex => Math.hypot(...vertex.map((value,axis) => value-centre[axis]))))};
}
function colours() { return TFX_DATA.palettes[element('palette').value]; }
function rgb(index, neutral = false, textured = false) {
  if (neutral || textured) return [156,170,183];
  return colours()[index].map(value => Math.round(value*255/63));
}
function renderGeometry(ctx, geometry, width, height, framing, thumbnail = false) {
  const raster=TFXRaster.begin(ctx,width,height,[16,23,33],{palette:TFXTextures.colours(colours()),procedural:element('jitter').checked?proceduralNoise:{seed:0x4321}});
  const edgeColour=TFXRaster.colour([3,9,15]);
  const scale = Math.min(width,height)*.42/framing.radius*(thumbnail ? 1 : zoom);
  const offset = project(framing.centre);
  const screen = vertex => {
    const value = project(vertex);
    return [width/2+(value[0]-offset[0])*scale+(thumbnail?0:pan[0]), height/2+(value[1]-offset[1])*scale+(thumbnail?0:pan[1]), value[2]];
  };
  // Facing branches already select the authored painter's order. Centroid
  // sorting would undo it, especially for long fuselages and crossing wings.
  for (const item of geometry.primitives) {
    const projected = (item.kind==='point'?[item.vertex]:item.vertices).map(screen);
    const colour=TFXRaster.colour(rgb(item.colour,element('neutral').checked,item.textured));
    if(item.kind==='point') {
      const [x,y]=projected[0];if(item.pixelSize)raster.point(x,y,item.pixelSize,colour);
      else raster.circle(x,y,TFXEffects.radius(item,scale),colour,item.mode,item.colour);
    }else if(item.kind==='face') {
      const page=TFXTextures.resolve(item);
      if(page&&!element('neutral').checked)raster.texture(projected,item.uv,page,TFXTextures.colours(colours()));
      else if(item.shades?.length===projected.length&&!element('neutral').checked&&element('shading').checked)raster.shaded(projected,item.shades,TFXTextures.colours(colours()));
      else if(item.rounded)raster.rounded(projected,colour,item.mode,item.colour);
      else raster.polygon(projected,colour,item.mode,item.colour);
      if(element('edges').checked)raster.line(projected,edgeColour,true,.55);
    }else raster.line(projected,colour);
  }
  raster.finish();
}
function detailOptions() {
  const value=element('lod').value;
  return value.startsWith('point:') ? {externalModels,detailRecord:+value.slice(6)} : {externalModels,level:+value||0};
}
function geometry(model = active, rules = element('rules').checked) {
  return TFXModel.inspect(model,{project,rules,...detailOptions(),parameters,distance:+element('distance').value});
}
function draw() {
  const rect=canvas.getBoundingClientRect(), ratio=Math.min(2,window.devicePixelRatio||1);
  const width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  try {
    const mesh=TFXModel.inspect(active,{project,rules:element('rules').checked,...detailOptions(),parameters,distance:+element('distance').value,jitter:element('jitter').checked?noise:null});renderGeometry(context,mesh,width,height,bounds);
    element('summary').textContent=`${title(active)} — ${mesh.faces.length} faces, ${mesh.lines.length} lines, ${mesh.points.length} point effects`;
    element('status').textContent='';
    const warnings=[...mesh.warnings,...active.parameter_warnings];
    const modes=[...new Set(mesh.primitives.map(item=>item.mode).filter(mode=>mode!==null&&mode!==undefined&&!TFXEffects.supportedModes.includes(mode)))];
    if(modes.length)warnings.push(`Drawing modes ${modes.join(', ')} use solid fill`);
    const textures=mesh.faces.filter(face=>face.textured&&!TFXTextures.resolve(face)).length;
    if(textures)warnings.unshift(`${textures} surfaces have unresolved runtime texture bindings`);
    element('notes').textContent=warnings.length?'Preview notes: '+warnings.join('; ')+'.':'';
  }catch(error){element('status').textContent=error.message;}
  updateThumbnails();
}
function refreshColours() {
 const used=[...new Set(geometry(active,false).primitives.filter(item=>!item.textured).map(item=>item.colour))].sort((a,b)=>a-b);
 element('swatches').replaceChildren(...used.map(index=>{const swatch=document.createElement('span');swatch.className='swatch';swatch.style.background=`rgb(${rgb(index).join(',')})`;swatch.title=`Palette index ${index}`;return swatch;}));
}
function choose(model) {
  externalModels=Array(10).fill(null);
  active=model;parameters=Array(256).fill(0);zoom=1;pan=[0,0];noise={x:12609,y:22822};proceduralNoise={seed:0x4321};statePlaying=false;stateTime=0;effectTime=0;
  element('lod').replaceChildren(...model.levels.map((level,index)=>new Option(`${index===0?'Highest':`Level ${index+1}`} (distance ${level.distance})`,index)));
  model.detail_records.forEach((detail,index)=>{
    if([2,3].includes(detail.kind))element('lod').append(new Option(`${detail.pixel_size}-pixel point (distance ${detail.distance}, colour ${detail.colour})`,'point:'+index));
  });
  element('store-panel').hidden=!model.instructions.some(i=>i[1]===81);
  element('stores').replaceChildren(...externalModels.map((_,slot)=>{
    const label=document.createElement('label'),select=document.createElement('select');label.textContent=`Slot ${slot+1} `;
    select.append(new Option('Empty',''));
    const choices=models.filter(m=>usageById[m.id]?.roles.includes('weapons.carried'));
    select.append(...choices.map(m=>new Option(m.name,m.id)));select.dataset.slot=slot;
    select.onchange=()=>{externalModels[slot]=models.find(m=>m.id===select.value)||null;bounds=getBounds(geometry());draw();refreshColours();};
    label.append(select);return label;
  }));
  element('parameter-panel').hidden=!model.parameters.length;
  element('parameter').replaceChildren(...model.parameters.map(spec=>new Option(`${spec.index} · ${spec.label}`,spec.index)));
  element('jitter').disabled=!model.instructions.some(([,op,args])=>op===83||([26,27,62,93].includes(op)&&args[0]===4)||(op===96&&Array.from({length:args[0]},(_,i)=>args[1+i*4]).includes(4)));
  resetPlayback();
  bounds=getBounds(geometry(model,true));
  element('source').textContent=`Resource ${model.id} · ${model.path} · ${model.size.toLocaleString()} bytes · ${model.instructions.length.toLocaleString()} instructions. Name: ${model.name_status}${model.names.length>1?'; candidates: '+model.names.join(', '):''}. SHA-256: ${model.sha256}`;
  showUses(model);showAssemblies(model);
  element('model').value=model.id;
  history.replaceState(null,'','#'+model.id);
  refreshColours();draw();
  document.querySelectorAll('.tile').forEach(tile=>tile.classList.toggle('active',tile.dataset.id===model.id));
}
function updateThumbnails() {
  const view=[yaw,pitch,element('palette').value,element('rules').checked,element('edges').checked,element('neutral').checked,element('shading').checked].join('|');
  if(view!==thumbnailView){thumbnailView=view;thumbnailRevision++;}
  if(thumbnailFrame||![...visibleThumbnails].some(tile=>tile.revision!==thumbnailRevision))return;
  // Coalesce pointer events into one redraw per animation frame. Parameter
  // playback, main-view pan and zoom do not change the thumbnails' base poses.
  thumbnailFrame=requestAnimationFrame(()=>{
    thumbnailFrame=0;
    for(const tile of visibleThumbnails) {
      if(tile.revision===thumbnailRevision)continue;
      try {
        // Facing rules remain view-dependent; only the framing is cached so
        // the model does not grow and shrink as its visible faces change.
        tile.framing??=getBounds(TFXModel.inspect(tile.model,{rules:false}));
        const mesh=TFXModel.inspect(tile.model,{project,rules:element('rules').checked});
        renderGeometry(tile.preview.getContext('2d'),mesh,tile.preview.width,tile.preview.height,tile.framing,true);
        tile.caption.textContent=tile.captionText;
      }catch(error){tile.caption.textContent='Preview unavailable';}
      tile.revision=thumbnailRevision;
    }
  });
}
function gallery() {
  const paging=element('paging').checked;
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages-1);
  element('page-controls').hidden=!paging;
  element('count').textContent=`${filtered.length.toLocaleString()} models shown · ${models.length.toLocaleString()} recovered in total`;
  element('page').textContent=`${page+1} / ${pages}`;element('previous').disabled=page===0;element('next').disabled=page===pages-1;
  thumbnailObserver.disconnect();visibleThumbnails.clear();thumbnails.clear();
  element('gallery').replaceChildren();
  for(const model of paging?filtered.slice(page*pageSize,(page+1)*pageSize):filtered) {
    const tile=document.createElement('button');tile.type='button';tile.className='tile';tile.dataset.id=model.id;tile.classList.toggle('active',model.id===active.id);
    const preview=document.createElement('canvas');preview.width=220;preview.height=130;
    const label=document.createElement('strong');label.textContent=title(model);
    const caption=document.createElement('small');caption.textContent=model.named?model.name+'.3':`Unidentified · ${model.id}`;
    tile.append(preview,label,caption);tile.onclick=()=>choose(model);element('gallery').append(tile);
    thumbnails.set(preview,{model,preview,caption,captionText:caption.textContent,framing:null,revision:-1});
    thumbnailObserver.observe(preview);
  }
}
function filter() {
  const query=element('search').value.toLowerCase(),group=element('group').value,naming=element('naming').value;
  filtered=models.filter(model=>{
    const roles=usageById[model.id]?.roles||[];
    return (group==='all'||group==='unassigned'&&!roles.length||roles.includes(group))&&
      (naming==='all'||naming==='named'&&model.named||naming==='unknown'&&!model.named)&&usageSearch.get(model.id).includes(query);
  });
  if(query){const rank=m=>m.name===query||m.id===query?0:[m.name,...m.names].some(n=>n.toLowerCase().includes(query))?1:2;filtered.sort((a,b)=>rank(a)-rank(b));}
  element('model').replaceChildren(...filtered.map(model=>new Option(title(model),model.id)));
  const exact=filtered.find(model=>model.name===query||model.id===query);
  if(exact&&exact.id!==active.id)choose(exact);
  else if(filtered.some(model=>model.id===active.id))element('model').value=active.id;
  else if(filtered.length)choose(filtered[0]);
  page=0;gallery();
}
for(const name of Object.keys(TFX_DATA.palettes))element('palette').add(new Option(name,name));
element('palette').value='yugoslav';
element('model').onchange=()=>choose(models.find(model=>model.id===element('model').value));
element('search').oninput=filter;element('group').onchange=filter;element('naming').onchange=filter;
for(const id of ['edges','neutral','rules','shading'])element(id).onchange=draw;
for(const id of ['palette','lod','distance'])element(id).onchange=()=>{refreshColours();draw();};
function parameterSpec(){return active.parameters.find(p=>p.index===+element('parameter').value);}
const parameterActions = {
  'Landing gear':['Extend','Retract','Gear lowered'],
  'Weapon bay doors':['Open','Close','Bays open'],
  'Refuelling probe':['Extend','Retract','Probe extended'],
  'Refuelling connection':['Extend','Retract','Refuelling active'],
  'Damage / destruction':['Forward','Reverse','Damaged / destroyed'],
  'Engine / afterburner':['Forward','Reverse','Engine effect enabled'],
  'Ejection sequence':['Forward','Reverse','Pilot ejected'],
  'Braking parachute':['Forward','Reverse','Parachute deployed'],
};
function resetPlayback(){
  statePlaying=false;stateDirection=1;stateTime=0;
  element('parameter-loop').checked=parameterSpec()?.playback==='cyclic';
  syncParameter();
}
function syncParameter(){
  const spec=parameterSpec(),value=parameters[spec?.index??0];
  const toggle=spec?.playback==='toggle',reversible=spec?.playback==='reversible';
  const animated=spec?.range_known&&spec.max>0&&!toggle;
  const actions=parameterActions[spec?.label]||['Forward','Reverse','Alternate state'];
  const switches=spec?.toggle_states||spec?.states||[0,0];
  const bitSwitch=spec?.comparisons.length===1&&[23,24].includes(spec.comparisons[0][0]);
  for(const id of ['parameter-value','parameter-slider']){
    element(id).max=spec?.max??0;element(id).value=value;element(id).hidden=toggle;
  }
  element('parameter-toggle-control').hidden=!toggle;
  element('parameter-toggle').checked=toggle&&(bitSwitch?Boolean(value&spec.comparisons[0][1]):value>=switches[1]);
  element('parameter-toggle-text').textContent=actions[2];
  element('parameter-range').textContent=spec?(toggle?`${switches[0]} / ${switches[1]}`:spec.range_known?`0–${spec.max}`:'0–255 (range unconfirmed)'):'';
  element('parameter-info').textContent=spec?(toggle?`State ${value}. Switch between the two authored states; other parameter values are retained.`:spec.range_known?`${spec.indexed?'Authored indexed states':'Drawing stage boundaries'}: ${spec.states.join(', ')}. ${reversible?'Playback can run in either direction; repetition reverses at each end.':'Playback uses the selected parameter; other values are retained.'}`:'Range not established; the full byte remains available for manual inspection.'):'';
  element('parameter-play').hidden=toggle;
  element('parameter-play').textContent=statePlaying&&(!reversible||stateDirection>0)?'Pause states':reversible?actions[0]:spec&&value>=spec.max?'Replay states':'Play states';
  element('parameter-play').disabled=!animated||(reversible&&!statePlaying&&value>=spec.max);
  element('parameter-reverse').hidden=!reversible;
  element('parameter-reverse').textContent=statePlaying&&stateDirection<0?'Pause states':actions[1];
  element('parameter-reverse').disabled=!animated||(!statePlaying&&value<=0);
  element('parameter-loop-control').hidden=!animated;
  element('parameter-loop-text').textContent=reversible?'Back and forth':'Loop';
  element('parameter-speed-control').hidden=!animated;
  element('parameter-fit').textContent=toggle?'Fit both states':'Fit state range';
}
function startPlayback(direction){
  const spec=parameterSpec();
  if(!spec?.range_known||!spec.max||spec.playback==='toggle')return;
  if(statePlaying&&stateDirection===direction){statePlaying=false;refreshColours();}
  else {
    stateDirection=direction;statePlaying=true;
    if(spec.playback!=='reversible'&&parameters[spec.index]>=spec.max)parameters[spec.index]=0;
    fitParameter();
  }
  stateTime=performance.now();syncParameter();
}
function advanceParameter(){
  const spec=parameterSpec(),value=parameters[spec.index];
  const boundary=stateDirection>0?spec.max:0;
  if(value===boundary){
    if(!element('parameter-loop').checked){statePlaying=false;refreshColours();return;}
    if(spec.playback==='reversible')stateDirection=-stateDirection;
    else {parameters[spec.index]=0;return;}
  }
  if(spec.indexed)parameters[spec.index]=stateDirection>0?spec.states.find(state=>state>value):spec.states.findLast(state=>state<value);
  else parameters[spec.index]=value+stateDirection;
}
function setParameter(value){
  const spec=parameterSpec();if(!spec)return;
  let selected=Math.max(0,Math.min(spec.max,Math.round(+value)||0));
  if(spec.indexed)selected=spec.states.reduce((best,state)=>Math.abs(state-selected)<Math.abs(best-selected)?state:best);
  parameters[spec.index]=selected;syncParameter();draw();
}
function fitParameter(){
  const spec=parameterSpec();if(!spec)return;
  const meshes=[];
  for(const value of [...new Set([parameters[spec.index],...spec.states])]){
    const pose=[...parameters];pose[spec.index]=value;
    try{meshes.push(TFXModel.inspect(active,{project,rules:false,...detailOptions(),parameters:pose,distance:+element('distance').value}));}catch(error){/* The normal preview retains the error for the selected pose. */}
  }
  bounds=getBounds({faces:meshes.flatMap(m=>m.faces),lines:meshes.flatMap(m=>m.lines),points:meshes.flatMap(m=>m.points)});draw();
}
element('parameter').onchange=()=>{resetPlayback();refreshColours();};
element('parameter-toggle').onchange=event=>{const spec=parameterSpec();statePlaying=false;setParameter((spec.toggle_states||spec.states)[event.target.checked?1:0]);fitParameter();refreshColours();};
element('parameter-value').onchange=event=>{statePlaying=false;setParameter(event.target.value);refreshColours();};
element('parameter-slider').oninput=event=>{statePlaying=false;setParameter(event.target.value);};
element('parameter-slider').onchange=refreshColours;
element('parameter-fit').onclick=fitParameter;
element('parameter-play').onclick=()=>startPlayback(1);
element('parameter-reverse').onclick=()=>startPlayback(-1);
element('jitter').onchange=draw;

element('reset').onclick=()=>{yaw=.65;pitch=.35;zoom=1;pan=[0,0];draw();};
element('previous').onclick=()=>{page--;gallery();};element('next').onclick=()=>{page++;gallery();};
element('paging').onchange=()=>{page=0;gallery();};
let drag;
canvas.onpointerdown=event=>{drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);};
canvas.onpointermove=event=>{
  if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag={x:event.clientX,y:event.clientY};
  if(event.shiftKey){const ratio=canvas.width/canvas.getBoundingClientRect().width;pan[0]+=dx*ratio;pan[1]+=dy*ratio;}
  else{yaw+=dx*.008;pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,pitch+dy*.008));}draw();
};
canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
canvas.onwheel=event=>{event.preventDefault();zoom=Math.max(.1,Math.min(12,zoom*Math.exp(-event.deltaY*.001)));draw();};
window.addEventListener('resize',draw);
function animate(time){
  let redraw=false;
  if(element('spin').checked&&previousTime){yaw+=(time-previousTime)*.0003;redraw=true;}
  const interval=1000/Math.max(1,Math.min(30,+element('parameter-speed').value||4));
  if(statePlaying&&(!stateTime||time-stateTime>=interval)){
    stateTime=time;advanceParameter();syncParameter();redraw=true;
  }
  if(element('jitter').checked&&!element('jitter').disabled&&(!effectTime||time-effectTime>=interval)){effectTime=time;redraw=true;}
  if(redraw)draw();previousTime=time;requestAnimationFrame(animate);
}

choose(active);filter();requestAnimationFrame(animate);
