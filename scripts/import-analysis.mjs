// Optional maintainer import; ordinary builds use the committed display snapshot.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.resolve(process.argv[2]||'../tfx-reverse','analysis');
const destination=path.join(root,'public/viewer');
const provenance={format:1,reference:'TFX 2.05, September 1994 CD',sources:{}};
async function read(file){const bytes=await fs.readFile(path.join(source,file));provenance.sources[file]=crypto.createHash('sha256').update(bytes).digest('hex');return bytes.toString();}
async function write(file,text){const target=path.join(destination,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,text);}
async function data(file,name,adapt=value=>value){const context=vm.createContext({});vm.runInContext(await read(file),context);const value=adapt(vm.runInContext(name,context));await write(file,`const ${name}=${JSON.stringify(value)};\n`);return value;}
function replace(text,from,to){if(!text.includes(from))throw Error('Source adapter no longer matches: '+String(from).slice(0,90));return text.replace(from,to);}
function section(text,first,last,body){const start=text.indexOf(first),end=text.indexOf(last,start);if(start<0||end<0)throw Error('Missing adapter boundary: '+first);return text.slice(0,start)+body+text.slice(end);}
for(const file of ['models/model.js','models/raster.js','models/effects.js','maps/map.js','maps/triangulate.js','maps/world.js','textures/textures.js','missions/style.css'])await write(file,await read(file));
await fs.writeFile(path.join(root,'scripts/check-map-selection.cjs'),await read('../tools/check_map_selection.js'));
await fs.writeFile(path.join(root,'scripts/check_map_depth.py'),await read('../tools/check_map_depth.py'));
const models=await data('models/data.js','TFX_DATA');
const world=await data('maps/data.js','TFX_WORLD');
await data('models/usage.js','TFX_MODEL_USAGE',usage=>{for(const m of Object.values(usage.models))for(const e of m.evidence||[])delete e.link;return usage;});
// Keep only indexed textures and the map schematics used by these exhibits.
// Other bitmaps, sprite sheets and animation sequences are not staged.
const schematics=new Set(world.environments.map(e=>e.config.trim().split(/\s+/).at(-1)));
await data('media/data.js','TFX_MEDIA',media=>({entries:media.entries.filter(e=>e.family==='texture_page'||e.family==='sprites'&&schematics.has(e.name))}));
await data('missions/data.js','TFX_MISSIONS');
await data('waypoints/data.js','TFX_WAYPOINTS',data=>({programs:data.programs.map(p=>({id:p.id,names:p.names,records:p.records.map(r=>({type:r.type,route:r.route,x:r.x,z:r.z}))}))}));
let model=await read('models/viewer.js');
model=section(model,'function refreshExports() {','function choose(model)',`function refreshColours() {
 const used=[...new Set(geometry(active,false).primitives.filter(item=>!item.textured).map(item=>item.colour))].sort((a,b)=>a-b);
 element('swatches').replaceChildren(...used.map(index=>{const swatch=document.createElement('span');swatch.className='swatch';swatch.style.background=\`rgb(\${rgb(index).join(',')})\`;swatch.title=\`Palette index \${index}\`;return swatch;}));
}
`);
model=replace(model,"for(const id of ['obj','mtl'])element(id).onclick=()=>{statePlaying=false;syncParameter();refreshExports();};",'');
model=model.replaceAll('refreshExports','refreshColours').replace('bounds, exported = [],','bounds,');
model=model.replace("'../objects/index.html#'","'https://lostengines.com/tfx/analysis/objects/index.html#'");
await write('models/viewer.js',model);
let map=await read('maps/viewer.js');
map=map.replace('sceneRadius=1,exportURL,','sceneRadius=1,');
map=replace(map,"if(exportURL)URL.revokeObjectURL(exportURL);exportURL=null;el('obj').href='#';render();}","render();}");
map=section(map,'function exportScene(){','function render(){','');
map=section(map,'function settings(){','function selectMission(focus)',`function settings(){el('map-status').textContent=TFXScenery.mapDescription(environment,lighting);el('grid-note').textContent=TFXScenery.gridNote(environment);}
`);
map=section(map,"let link=el('compiled-link');","el('route-list').replaceChildren",'');
map=map.replace("el('obj').onclick=exportScene;",'').replace('; more preview notes in model-format.md','; see the research archive for full notes');
// A public starting point with a recognisable night city, not an anonymous runway.
map=map.replace('x=61,z=23','x=136,z=114');
await write('maps/viewer.js',map);
let missions=await read('missions/missions.js');
missions=section(missions,"  link('Original mission script'",'  if(row.briefings.length)', '');
missions=replace(missions,"source.hidden=!b.source_path;if(b.source_path)source.href='../../extracted/cd_1994_09/resources/'+b.source_path;","source.hidden=true;");
await write('missions/missions.js',missions);
provenance.scope={models:models.models.length,environments:world.environments.length,missions:world.missions.length,notes:'Display snapshot only. Resource downloads and geometry exporters are absent from the public adapters. Modern projection and inspection state are not a running game.'};
await fs.writeFile(path.join(root,'content/data-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(`Imported ${models.models.length} models and ${world.environments.length} environments`);
