#!/usr/bin/env node
'use strict';
// Real resource regression: a weather-named retained grid is not mission terrain.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const file of ['models/data.js','models/model.js','maps/data.js','maps/world.js','media/data.js','maps/map.js'])
 vm.runInThisContext(fs.readFileSync(`${process.argv[2]||'analysis'}/${file}`,'utf8'),{filename:file});
const {missionGrid,environmentNamed,lightingChoices,isRegional}=TFXScenery;
for(const [world,type,grid]of [['yugoslavia','yugos_n','yugoslav'],['columbia','colum_d','columbia'],['somalia','somal_st','somalia'],['libya','libya_tw','libya'],['seaworld','seastorm','seaworld']]){
 const terrain=missionGrid({world,environment:type}),lighting=environmentNamed(type);
 assert.equal(terrain.name,grid);assert(isRegional(terrain));assert(!isRegional(lighting));
 assert(lightingChoices(terrain).includes(lighting));
 assert.equal(TFXMap.schematic(lighting)?.width,200);
 assert(!Object.keys(terrain.undefined_tile_indices).length);
}
for(const mission of TFX_WORLD.missions){
 const grid=missionGrid(mission);assert(grid,mission.name);assert(isRegional(grid),mission.name);
 const lighting=environmentNamed(mission.environment);
 // Five retained simulator templates leave the weather suffix to the launcher.
 if(lighting)assert(lightingChoices(grid).includes(lighting),mission.name);
 else assert(mission.environment.endsWith('_'),mission.name);
}
const regional=environmentNamed('yugoslav'),archived=environmentNamed('yugos_n');
assert.equal(regional.cells[113*200+137],59);
assert.equal(archived.cells[113*200+137],105);
assert.deepEqual(regional.tiles[59].variants,['m_ways1','m_ways2','m_ways3']);
assert.deepEqual(archived.tiles[105].variants,['m_ways1','m_ways4','m_ways5']);
assert(!regional.tiles.some(t=>t.variants.some(n=>['m_ways4','m_ways5'].includes(n))));
for(const [name,index,model]of [['m_ways4',562,'mt3_s2'],['m_ways5',564,'mt3_s4']]){
 const part=TFXScenery.parts(name)[0];assert.equal(part.model_index,index);assert.equal(part.name,model);
 assert(TFXScenery.geometry(model).faces.every(f=>f.vertices.every(v=>v[1]<0)));
}
const solid=grid=>TFXScenery.assemble(grid,137,113).faces.filter(f=>!f.inspection);
assert(solid(regional).length);assert(solid(regional).every(f=>f.vertices.every(v=>v[1]===0)));
assert(solid(archived).some(f=>f.vertices.some(v=>v[1]<-.7)));
assert.equal(TFXScenery.environmentStatus(archived),TFXScenery.nightStatus);
assert.equal(TFXScenery.environmentStatus(environmentNamed('yugos_d')),0);
assert.equal(TFXMap.schematic(null),null);
console.log(`Map selection passed: five regions, ${TFX_WORLD.missions.length} mission declarations, separate schematics and retained/retail motorway geometry.`);
