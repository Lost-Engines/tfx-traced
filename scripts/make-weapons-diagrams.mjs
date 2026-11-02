import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {drawBoost,drawRelease} from '../src/weapons-draw.js';
const root=fileURLToPath(new URL('../',import.meta.url));
// The full native states and capture tapes stay in the separate research workspace.
const data=JSON.parse(await fs.readFile(root+'src/weapons-data.json','utf8'));
for(const width of [720,360]){
 const suffix=width===360?'-small':'';
 await fs.writeFile(`${root}public/images/weapons/boost${suffix}.svg`,drawBoost(data,width)+'\n');
 await fs.writeFile(`${root}public/images/weapons/release${suffix}.svg`,drawRelease(data,200,width)+'\n');
}
console.log('Wrote weapon diagrams and selected original-code plot measurements.');
