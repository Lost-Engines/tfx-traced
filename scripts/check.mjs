// Check the complete standalone publication, including generated local links.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'parse5';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
async function files(dir){const result=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Symlink in publication: '+file);result.push(...e.isDirectory()?await files(file):[file]);}return result;}
function* nodes(node){yield node;for(const c of node.childNodes||[])yield* nodes(c);}
const all=await files(root),pages=new Map(),errors=[];let links=0;
for(const file of all){
 const rel=path.relative(root,file);
 if(/\.(bin|cue|iso|img|dat|exe|com|rom|zip|7z|obj|mtl|mid)$/i.test(file))errors.push('Original resource or export in publication: '+rel);
 if((await fs.stat(file)).size>50*1024*1024)errors.push('Unexpected large file: '+rel);
 if(!file.endsWith('.html'))continue;
 const text=await fs.readFile(file,'utf8'),tree=parse(text),ids=new Set(),refs=[];
 for(const node of nodes(tree)){
  const attributes=new Map((node.attrs||[]).map(a=>[a.name,a.value]));
  if(attributes.has('download'))errors.push('Download control: '+rel);
  if(attributes.has('id')){const id=attributes.get('id');if(ids.has(id))errors.push('Duplicate ID '+id+' in '+rel);ids.add(id);}
  for(const name of ['href','src','poster'])if(attributes.has(name))refs.push(attributes.get(name));
 }
 pages.set(rel,{ids,refs});
 if(/\bthe user\b/i.test(text))errors.push('Internal narrative in public copy: '+rel);
}
for(const [file,{refs}]of pages)for(const ref of refs){
 if(!ref||/^(https?:|mailto:|data:)/.test(ref))continue;
 const url=new URL(ref,'https://local/'+file);let target=path.join(root,decodeURIComponent(url.pathname));
 if(!target.startsWith(root+path.sep)&&target!==root){errors.push('Escaping path '+ref);continue;}
 try{if((await fs.stat(target)).isDirectory())target=path.join(target,'index.html');await fs.stat(target);links++;
  const hash=decodeURIComponent(url.hash.slice(1));if(hash&&pages.has(path.relative(root,target))){const dynamic=/^models\//.test(path.relative(root,target))||/^maps\//.test(path.relative(root,target));if(!dynamic&&!pages.get(path.relative(root,target)).ids.has(hash))errors.push('Missing fragment '+ref+' from '+file);}
 }catch{errors.push('Missing link '+ref+' from '+file);}
}
// Executable adapters must not regain a removed exporter or original-file link.
for(const file of ['models/viewer.js','maps/viewer.js','missions/missions.js']){
 const text=await fs.readFile(path.join(root,'viewer',file),'utf8');
 if(/\.download\s*=|createObjectURL|extracted\/|function exportScene|function refreshExports/.test(text))errors.push('Exporter/resource link returned to '+file);
}
const context=vm.createContext({});
for(const [file,name]of [['models/data.js','TFX_DATA'],['maps/data.js','TFX_WORLD'],['media/data.js','TFX_MEDIA']]){vm.runInContext(await fs.readFile(path.join(root,'viewer',file),'utf8'),context);const data=vm.runInContext(name,context);if(name==='TFX_DATA'&&data.models.length!==1012)errors.push('Model snapshot incomplete');if(name==='TFX_WORLD'&&data.environments.some(e=>e.cells.length!==40000))errors.push('Terrain grid is not 200 × 200');if(name==='TFX_MEDIA'&&data.entries.some(e=>!['texture_page','sprites'].includes(e.family)))errors.push('Unneeded media in display snapshot');}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Checked ${pages.size} HTML pages, ${links} local links, viewer snapshots and no-download boundary.`);
