import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {drawDemo,drawOverview} from '../src/deep-dive-draw.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(await fs.readFile(path.join(root,'content/deep-dive-native-checks.json'),'utf8'));
const output=path.join(root,'public/images/articles');
const demos=[['campaign-result','campaign',{completed:1,kills:5}],['ai-scan','scan',{visit:0}],['recording-packing','packing',{example:0}],['audio-clock','clock',{ticks:500}],['testing-comparison','comparison',{mode:'pixel'}]];
await fs.mkdir(output,{recursive:true});
const drawings=[];
for(const compact of [false,true]){
 const suffix=compact?'-small':'';
 for(const name of ['campaign-flow','ai-layers','recording-flow','audio-path','testing-harness'])drawings.push([name+suffix,drawOverview(name,compact)]);
 for(const [name,kind,values]of demos)drawings.push([name+suffix,drawDemo(kind,values,data,compact)]);
}
for(const [name,svg]of drawings){const file=path.join(output,name+'.svg');if(process.argv.includes('--check')){if(await fs.readFile(file,'utf8')!==svg+'\n')throw Error('Stale illustration '+name);}else await fs.writeFile(file,svg+'\n');}
console.log(`${process.argv.includes('--check')?'Checked':'Wrote'} ${drawings.length} article illustrations.`);
