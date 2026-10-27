/* Inspection drawing of native sized circles and their screen-door modes. */
(function(root){
  'use strict';
  const patterns=new WeakMap();
  const supportedModes=[0,1,2,3,4,7,10,11,12];
  function visible(mode,x,y,span={left:0,bottom:0}) {
    if(mode===0)return (x+y)%2!==0;
    if(mode===1)return x%4===(y%2?3:1);
    if(mode===7)return y%2===0;
    // The sparse native callbacks advance through spans from bottom to top.
    // Their phase is local to the left VGA byte and starting row; unlike
    // modes 0/1, there is no single repeating screen-wide transparency tile.
    if(mode===2){
      if(y%2)return false;
      const phase=(Math.floor(span.left/4)+Math.floor(((span.bottom&~1)-y)/2)+(span.bottom&1))&1;
      return (x&7)===phase*4+3;
    }
    if(mode===3){
      const row=span.bottom-y;if(row%3)return false;
      const phase=(Math.floor(span.left/4)+(span.bottom%2?0:2)+((row/3)&1)*2)&3;
      return (x&15)===phase*4+3;
    }
    return true;
  }
  function fill(context,point,colour){
    if(![0,1,2].includes(point.mode))return colour;
    let cache=patterns.get(context);if(!cache){cache=new Map();patterns.set(context,cache);}
    const key=point.mode+':'+colour;
    if(!cache.has(key)){
      // Native VGA write masks: half coverage, quarter coverage, then a
      // sparse every-other-row pattern. Keep the stored palette colours.
      const tile=document.createElement('canvas');tile.width=point.mode===2?8:4;tile.height=2;
      const ctx=tile.getContext('2d');ctx.fillStyle=colour;
      for(let y=0;y<2;y++)for(let x=0;x<tile.width;x++){
        if(visible(point.mode,x,y))ctx.fillRect(x,y,1,1);
      }
      cache.set(key,context.createPattern(tile,'repeat'));
    }
    return cache.get(key);
  }
  const radius=(point,scale)=>point.radius?Math.max(1,Math.abs(point.radius)*scale):Math.max(1,(point.pixelSize||1)/2);
  root.TFXEffects={fill,radius,visible,supportedModes};
})(globalThis);
