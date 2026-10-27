/* Shared top-down terrain backgrounds. Native map Z increases downwards. */
(function(root) {
'use strict';
const terrainColours=new Map(),backgrounds=new WeakMap();
function paletteName(environment) {
  const tokens=environment.config.trim().split(/\s+/),day=tokens.indexOf('day');
  if(day>=0&&TFX_DATA.palettes[tokens[day+1]])return tokens[day+1];
  // A base regional palette keeps night-map overviews readable too.
  const region=environment.name.startsWith('col')?'columbia':environment.name.startsWith('som')?'somalia':environment.name.startsWith('lib')?'libya':environment.name.startsWith('sea')?'seaclear':'yugoslav';
  return TFX_DATA.palettes[region]?region:Object.keys(TFX_DATA.palettes)[0];
}
function schematic(environment) {
  const name=environment?.config.trim().split(/\s+/).at(-1);
  if(!name)return null;
  const sprite=TFX_MEDIA.entries.find(e=>e.family==='sprites'&&(e.name===name||e.names.includes(`spr/${name}.spr`)));
  const frame=sprite?.frames[0];
  return frame?.width===environment.width&&frame.height===environment.height?frame:null;
}
function terrainColour(environment,colours,index,x,z,mode) {
  const tile=environment.tiles[index];
  if(!tile)return[255,0,190];
  if(mode==='ids')return[(index*67)%180+30,(index*107)%180+30,(index*151)%180+30];
  const name=TFXScenery.variant(environment,x,z);
  if(!terrainColours.has(name)) {
    let colour=32,area=0;
    for(const part of TFXScenery.parts(name))for(const face of TFXScenery.geometry(part.name).faces) {
      if(face.textured)continue;
      let size=0;
      for(let i=0;i<face.vertices.length;i++) {
        const a=face.vertices[i],b=face.vertices[(i+1)%face.vertices.length];
        size+=a[0]*b[2]-b[0]*a[2];
      }
      if(Math.abs(size)>area){area=Math.abs(size);colour=face.colour;}
    }
    terrainColours.set(name,colour);
  }
  return(colours[terrainColours.get(name)]||[15,22,30]).map(v=>Math.round(v*255/63));
}
function drawBackground(ctx,environment,colours,mode='terrain',lighting=environment) {
  let cached=backgrounds.get(environment);
  if(!cached||cached.colours!==colours||cached.mode!==mode||cached.lighting!==lighting) {
    const {width,height}=environment,frame=mode==='schematic'?schematic(lighting):null;
    const bytes=frame?atob(frame.pixels):null,pixels=new Uint8ClampedArray(width*height*4);
    for(let i=0;i<width*height;i++) {
      const x=i%width,z=Math.floor(i/width);
      // Schematic sprites store their rows in the opposite native Z order.
      const colour=bytes?(colours[bytes.charCodeAt((height-1-z)*width+x)]||[63,0,63]).map(v=>v*255/63):terrainColour(environment,colours,environment.cells[i],x,z,mode);
      pixels.set([...colour,255],i*4);
    }
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d').putImageData(new ImageData(pixels,width,height),0,0);
    cached={canvas,colours,mode,lighting,actualMode:mode==='schematic'&&!frame?'terrain':mode};
    backgrounds.set(environment,cached);
  }
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(cached.canvas,0,0,ctx.canvas.width,ctx.canvas.height);
  return cached.actualMode;
}
root.TFXMap={drawBackground,paletteName,schematic};
})(globalThis);
