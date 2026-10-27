/* Native .TM pages: 256 columns by 192 rows, ordinary indexed bytes.
   Opcode 71 selects a global page; opcode 46 uses a shape's cached binding. */
(function(root){
'use strict';
const pages=TFX_MEDIA.entries.filter(e=>e.family==='texture_page'),names=new Map(),decoded=new Map(),colourCache=new WeakMap();
for(const page of pages)for(const name of [page.name,...page.names])names.set(name.split('/').at(-1).replace(/\.tm$/,'').toLowerCase(),page);
const globalSlots=Array.from({length:8},(_,i)=>names.get(`global_${i+1}`)||null);
function pixels(page){if(!decoded.has(page.id))decoded.set(page.id,Uint8Array.from(atob(page.pixels),c=>c.charCodeAt(0)));return decoded.get(page.id);}
function binding(source,index,name){return source==='model'?names.get(name?.replace(/^!/,'')):globalSlots[index];}
function image(page,colours){
 const canvas=document.createElement('canvas');canvas.width=page.width;canvas.height=page.height;const data=new Uint8ClampedArray(page.width*page.height*4);
 pixels(page).forEach((index,i)=>data.set([...colours[index],index?255:0],i*4));canvas.getContext('2d').putImageData(new ImageData(data,page.width,page.height),0,0);return canvas;
}
function resolve(face){
 if(!face.textured)return null;
 const page=binding(face.textureSource,face.texture,face.textureName);
 return page&&face.uv?.length===face.vertices.length?page:null;
}
function colours(palette){if(!colourCache.has(palette))colourCache.set(palette,palette.map(rgb=>rgb.map(n=>Math.round(n*255/63))));return colourCache.get(palette);}
root.TFXTextures={pages,globalSlots,pixels,binding,resolve,colours,image};
})(globalThis);
