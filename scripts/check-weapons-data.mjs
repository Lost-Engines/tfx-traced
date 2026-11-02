import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {drawBoost,drawRelease} from '../src/weapons-draw.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const data=JSON.parse(await fs.readFile(root+'src/weapons-data.json','utf8'));
assert.deepEqual(Object.keys(data),['speeds','trajectories']);
assert.equal(data.trajectories.length,9);
for(const height of [200,700,1800])for(const pitch of [0,30,60]){
 const path=data.trajectories.find(r=>r.height===height&&r.pitch===pitch);
 assert.ok(path&&path.points.length>0);
 for(const point of path.points)assert.ok(point.length===4&&point.every(Number.isFinite));
}
assert.deepEqual(JSON.parse(await fs.readFile(root+'dist/assets/weapons-data.json','utf8')),data);
for(const width of [720,360]){
 const suffix=width===360?'-small':'';
 assert.equal(await fs.readFile(`${root}public/images/weapons/boost${suffix}.svg`,'utf8'),drawBoost(data,width)+'\n');
 assert.equal(await fs.readFile(`${root}public/images/weapons/release${suffix}.svg`,'utf8'),drawRelease(data,200,width)+'\n');
}
console.log('Weapon diagrams and published plot measurements agree.');
