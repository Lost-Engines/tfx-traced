/* Crisp inspection rasterisation. Canvas path anti-aliasing leaves background
   seams when adjacent polygons cover a shared edge only partially. */
(function(root){
  'use strict';
  const frames=new WeakMap(),textureInks=new WeakMap();
  const littleEndian=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
  const colour=([r,g,b,a=255])=>littleEndian?(r|g<<8|b<<16|a<<24)>>>0:(r<<24|g<<16|b<<8|a)>>>0;
  // Native 0xdaf50, called with subdivision parameter 2 by rounded quads.
  // Integer recurrence traces a quarter arc between edge midpoints; the
  // original corner controls its tangent, rather than being a drawn vertex.
  function roundedCorner(previous,corner,next){
    const state=[0,1].map(axis=>{
      let a=(corner[axis]-next[axis])<<16,b=(corner[axis]-previous[axis])<<16;
      const base=((previous[axis]<<16)-a+32768)|0;
      let delta=b>>7;b-=delta;delta>>=8;b-=delta;delta>>=7;b-=delta;b+=a>>3;
      return {a,b,base};
    }),points=[];
    for(let step=0;step<7;step++){
      points.push(state.map(s=>(s.base+s.a)>>16));
      for(const s of state){s.b=(s.b-(s.a>>2))|0;s.a=(s.a+(s.b>>2))|0;}
    }
    points.push([...next]);return points;
  }
  function begin(context,width,height,background,options={}){
    let frame=frames.get(context);
    if(!frame||frame.image.width!==width||frame.image.height!==height){
      const image=context.createImageData(width,height);
      frame={image,pixels:new Uint32Array(image.data.buffer)};frames.set(context,frame);
    }
    const pixels=frame.pixels;pixels.fill(colour(background));
    const procedural=options.procedural||{seed:0x4321};
    const palette=options.palette,inks=palette?.map(colour),inkIndices=new Map();
    const indices=palette?(frame.indices??=new Uint8Array(width*height)):null;
    if(palette)palette.forEach((rgb,index)=>{if(!inkIndices.has(inks[index]))inkIndices.set(inks[index],index);});
    function indexFor(ink){
      if(inkIndices.has(ink))return inkIndices.get(ink);
      const shifts=littleEndian?[0,8,16]:[24,16,8];let best=0,error=Infinity;
      palette.forEach((rgb,index)=>{const d=rgb.reduce((sum,v,i)=>sum+(v-((ink>>>shifts[i])&255))**2,0);if(d<error){error=d;best=index;}});
      inkIndices.set(ink,best);return best;
    }
    if(indices)indices.fill(indexFor(colour(background)));
    function span(y,left,right,ink,mode=null,index=null,bottom=0){
      if(y<0||y>=height)return;
      const first=Math.max(0,Math.ceil(left-.5)),last=Math.min(width,Math.ceil(right-.5));
      if(first>=last)return;
      const row=y*width;
      const source=indices?(index??indexFor(ink)):null;
      if(mode===null){pixels.fill(ink,row+first,row+last);if(indices)indices.fill(source,row+first,row+last);return;}
      for(let x=first;x<last;x++)if(TFXEffects.visible(mode,x,y,{left:first,bottom})){
        const at=row+x;
        if(indices&&[10,11,12].includes(mode)){
          const dest=indices[at],value=mode===10?dest^source:mode===11?dest&source:dest|source;
          pixels[at]=inks[value];indices[at]=value;
        }else{pixels[at]=ink;if(indices)indices[at]=source;}
      }
    }
    // Sparse native callbacks count VGA bytes, without clipping individual
    // planes at the right edge. Their final dot can lie outside the span.
    function sparseSpan(y,left,right,ink,mode,index,bottom){
      if(y<0||y>=height)return;
      const firstByte=Math.floor(left/4),difference=Math.floor(right/4)-firstByte;
      let first,last;
      if(mode===2){first=firstByte*4;last=(firstByte+(difference&~1))*4+3;}
      else{
        const row=bottom-y;if(row%3)return;
        const offset=((bottom&1)?0:2)+((row/3)&1)*2;
        first=(firstByte+(offset&3))*4+3;
        last=first+Math.floor((difference-1)/4)*16;
      }
      const source=indices?(index??indexFor(ink)):null;
      for(let x=Math.max(0,first);x<=Math.min(width-1,last);x++)if(TFXEffects.visible(mode,x,y,{left,bottom})){
        pixels[y*width+x]=ink;if(indices)indices[y*width+x]=source;
      }
    }
    // Mode 4 keeps a self-modifying 16-bit seed at native 0xe3a3f.
    // ADD CH,CL / ADC CL,CH supplies a mask per VGA byte, alternating
    // odd/even planes. It advances across draws, independently of vertex jitter.
    function proceduralSpan(y,left,right,ink,index,bottom,paint=true,inclusive=false){
      const first=Math.max(0,Math.ceil(left-.5)),last=Math.min(width,inclusive?Math.floor(right)+1:Math.ceil(right-.5));
      const source=indices?(index??indexFor(ink)):null;
      for(let byte=Math.floor(left/4);byte<=Math.floor(right/4);byte++){
        let low=procedural.seed&255,high=procedural.seed>>>8;
        const sum=high+low;high=sum&255;low=(low+high+(sum>255?1:0))&255;
        procedural.seed=high*256+low;
        const mask=low&(((bottom-y)&1)?5:10);
        if(paint&&y>=0&&y<height)for(let bit=0;bit<4;bit++){
          const x=byte*4+bit;if(x<first||x>=last||!(mask&(1<<bit)))continue;
          pixels[y*width+x]=ink;if(indices)indices[y*width+x]=source;
        }
      }
    }
    function polygon(vertices,ink,mode=null,index=null){
      if(vertices.length<3)return;
      const edges=[];
      for(let index=0;index<vertices.length;index++){
        let a=vertices[index],b=vertices[(index+1)%vertices.length];
        if(a[1]===b[1])continue;
        // Always evaluate a shared edge from its lower-Y endpoint. Reversing
        // a polygon then cannot change the floating-point intersection.
        if(a[1]>b[1])[a,b]=[b,a];
        edges.push({x:a[0],y:a[1],end:b[1],slope:(b[0]-a[0])/(b[1]-a[1])});
      }
      if(!edges.length)return;
      const first=Math.max(0,Math.ceil(Math.min(...edges.map(e=>e.y))-.5));
      const last=Math.min(height,Math.ceil(Math.max(...edges.map(e=>e.end))-.5));
      if(mode===4){
        const bottom=Math.round(Math.max(...edges.map(e=>e.end))),top=Math.round(Math.min(...edges.map(e=>e.y)));
        for(let y=bottom;y>=top;y--){
          const sample=y===bottom?y-1e-9:y,hits=[];
          for(const edge of edges)if(sample>=edge.y&&sample<edge.end)hits.push(edge.x+(sample-edge.y)*edge.slope);
          hits.sort((a,b)=>a-b);
          for(let pair=0;pair+1<hits.length;pair+=2)proceduralSpan(y,hits[pair],hits[pair+1],ink,index,bottom,y>=first&&y<last);
        }
        return;
      }
      for(let y=first;y<last;y++){
        const centre=y+.5,intersections=[];
        for(const edge of edges)if(centre>=edge.y&&centre<edge.end)intersections.push(edge.x+(centre-edge.y)*edge.slope);
        intersections.sort((a,b)=>a-b);
        // Half-open spans give adjoining faces complete coverage without
        // alpha blending, including concave polygons and clipped boundaries.
        for(let pair=0;pair+1<intersections.length;pair+=2)span(y,intersections[pair],intersections[pair+1],ink,mode,index,Math.round(Math.max(...edges.map(e=>e.end))));
      }
    }
    function rounded(vertices,ink,mode=null,index=null){
      if(vertices.length!==4){polygon(vertices,ink,mode,index);return;}
      const corners=vertices.map(v=>v.slice(0,2).map(Math.round));
      const midpoints=corners.map((v,i)=>v.map((n,axis)=>(n+corners[(i+1)%4][axis])>>1));
      polygon(midpoints,ink,mode,index);
      for(let i=0;i<4;i++)polygon(roundedCorner(midpoints[(i+3)%4],corners[i],midpoints[i]),ink,mode,index);
    }
    // Affine UV interpolation, matching the native textured scanline path.
    // Keep palette indices discrete and leave index-zero texels untouched.
    function texture(vertices,uv,page,colours){
      if(!textureInks.has(colours))textureInks.set(colours,colours.map(colour));
      const texels=TFXTextures.pixels(page),inks=textureInks.get(colours),edges=[];
      for(let i=0;i<vertices.length;i++){
        let a=[...vertices[i].slice(0,2),...uv[i]],b=[...vertices[(i+1)%vertices.length].slice(0,2),...uv[(i+1)%vertices.length]];
        if(a[1]===b[1])continue;if(a[1]>b[1])[a,b]=[b,a];
        edges.push({a,b});
      }
      if(!edges.length)return;
      const first=Math.max(0,Math.ceil(Math.min(...edges.map(e=>e.a[1]))-.5));
      const last=Math.min(height,Math.ceil(Math.max(...edges.map(e=>e.b[1]))-.5));
      for(let y=first;y<last;y++){
        const row=y+.5,hits=[];
        for(const {a,b}of edges)if(row>=a[1]&&row<b[1]){
          const t=(row-a[1])/(b[1]-a[1]);hits.push([a[0]+t*(b[0]-a[0]),a[2]+t*(b[2]-a[2]),a[3]+t*(b[3]-a[3])]);
        }
        hits.sort((a,b)=>a[0]-b[0]);
        for(let i=0;i+1<hits.length;i+=2){
          const a=hits[i],b=hits[i+1],left=Math.max(0,Math.ceil(a[0]-.5)),right=Math.min(width,Math.ceil(b[0]-.5));
          for(let x=left;x<right;x++){
            const t=(x+.5-a[0])/(b[0]-a[0]),u=Math.floor(a[1]+t*(b[1]-a[1])),v=Math.floor(a[2]+t*(b[2]-a[2]));
            if(u<0||u>=page.width||v<0||v>=page.height)continue;
            const index=texels[v*page.width+u];if(index){pixels[y*width+x]=inks[index];if(indices)indices[y*width+x]=index;}
          }
        }
      }
    }
    // Gouraud shading interpolates an 8.8 palette index, never RGB. The
    // browser keeps half-open geometry edges while retaining native integer
    // horizontal shade increments and discrete output palette entries.
    function shaded(vertices,shades,colours){
      const edges=[],shadingInks=colours.map(colour);
      for(let i=0;i<vertices.length;i++){
        let a=[...vertices[i].slice(0,2),shades[i]],b=[...vertices[(i+1)%vertices.length].slice(0,2),shades[(i+1)%vertices.length]];
        if(a[1]===b[1])continue;if(a[1]>b[1])[a,b]=[b,a];edges.push({a,b});
      }
      if(!edges.length)return;
      const first=Math.max(0,Math.ceil(Math.min(...edges.map(e=>e.a[1]))-.5));
      const last=Math.min(height,Math.ceil(Math.max(...edges.map(e=>e.b[1]))-.5));
      for(let y=first;y<last;y++){
        const hits=[];
        for(const {a,b}of edges)if(y>=a[1]&&y<b[1]){
          const height=b[1]-a[1],t=(y-a[1])/height;
          const first=Math.trunc(a[2]*256),diff=(Math.trunc(b[2]*256)-first)<<16>>16;
          const step=diff*2*Math.floor(32768/Math.max(1,height))/65536;
          const fixed=Math.floor(first+.5+(Math.abs(diff)>=height?step/2:0)+step*(y-a[1]));
          hits.push([a[0]+t*(b[0]-a[0]),fixed/256]);
        }
        hits.sort((a,b)=>a[0]-b[0]);
        for(let i=0;i+1<hits.length;i+=2){
          const a=hits[i],b=hits[i+1],origin=Math.ceil(a[0]),left=Math.max(0,Math.ceil(a[0]-.5)),right=Math.min(width,Math.ceil(b[0]-.5));
          // Native 0xe6170 uses table[floor(right)-left+1], an integer
          // reciprocal, an 8.8 edge colour, and a half-step bias for steeper
          // ramps. Its byte accumulator wraps rather than clamping at 255.
          const extent=Math.max(1,Math.floor(b[0])-origin),aFixed=Math.trunc(a[1]*256),bFixed=Math.trunc(b[1]*256);
          const diff=(bFixed-aFixed)<<16>>16,sign=diff<0?-1:1;
          const product=Math.abs(diff)*2*Math.floor(32768/(extent+1));
          const delta=sign*Math.floor(product/256)/65536;
          const bias=Math.floor((32768+(Math.abs(diff)>=extent?sign*Math.floor(product/2):0))/256)/65536;
          const start=aFixed/256+bias;
          for(let x=left;x<right;x++){
            const index=Math.floor(start+delta*(x-origin))&255;
            pixels[y*width+x]=shadingInks[index];if(indices)indices[y*width+x]=index;
          }
        }
      }
    }
    function circle(x,y,radius,ink,mode=null,index=null){
      const tables=options.circleSpans||(typeof TFX_DATA!=='undefined'?TFX_DATA.circle_spans:null),r=Math.trunc(radius);
      if(tables?.[r]?.length){
        const cx=Math.round(x),cy=Math.round(y),bottom=cy+r;
        for(let row=bottom;row>=cy-r;row--){
          const d=Math.abs(row-cy),extent=d===0?r:tables[r][r-d];
          if(mode===4)proceduralSpan(row,cx-extent,cx+extent,ink,index,bottom,true,true);
          else if(mode===2||mode===3)sparseSpan(row,cx-extent,cx+extent,ink,mode,index,bottom);
          else span(row,cx-extent,cx+extent+1,ink,mode,index,bottom);
        }
        return;
      }
      if(mode===4){
        const bottom=Math.round(y+radius),top=Math.round(y-radius);
        for(let row=bottom;row>=top;row--){const dy=row-y,extent=Math.sqrt(Math.max(0,radius*radius-dy*dy));proceduralSpan(row,x-extent,x+extent,ink,index,bottom);}
        return;
      }
      const first=Math.max(0,Math.ceil(y-radius-.5)),last=Math.min(height,Math.ceil(y+radius-.5));
      for(let row=first;row<last;row++){
        const dy=row+.5-y,extent=Math.sqrt(Math.max(0,radius*radius-dy*dy));
        span(row,x-extent,x+extent,ink,mode,index,Math.round(y+radius));
      }
    }
    function pixel(x,y,ink,alpha){
      if(x<0||x>=width||y<0||y>=height)return;
      const index=y*width+x;
      if(alpha===1){pixels[index]=ink;if(indices)indices[index]=indexFor(ink);return;}
      const shifts=littleEndian?[0,8,16]:[24,16,8],old=pixels[index];
      pixels[index]=colour(shifts.map(shift=>Math.round(((ink>>>shift)&255)*alpha+((old>>>shift)&255)*(1-alpha))));
    }
    function segment(a,b,ink,alpha){
      let x0=a[0],y0=a[1],x1=b[0],y1=b[1];
      // Clip before integer stepping so zoomed or very distant endpoints
      // cannot make a short visible line require millions of iterations.
      const dx=x1-x0,dy=y1-y0;let start=0,end=1;
      for(const [p,q]of [[-dx,x0],[dx,width-1-x0],[-dy,y0],[dy,height-1-y0]]){
        if(p===0){if(q<0)return;continue;}
        const t=q/p;
        if(p<0){if(t>end)return;start=Math.max(start,t);}
        else {if(t<start)return;end=Math.min(end,t);}
      }
      x1=Math.round(x0+end*dx);y1=Math.round(y0+end*dy);
      x0=Math.round(x0+start*dx);y0=Math.round(y0+start*dy);
      const ax=Math.abs(x1-x0),ay=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
      let error=ax-ay;
      while(true){
        pixel(x0,y0,ink,alpha);
        if(x0===x1&&y0===y1)break;
        const twice=error*2;
        if(twice>-ay){error-=ay;x0+=sx;}
        if(twice<ax){error+=ax;y0+=sy;}
      }
    }
    function line(vertices,ink,closed=false,alpha=1){
      for(let i=1;i<vertices.length;i++)segment(vertices[i-1],vertices[i],ink,alpha);
      if(closed&&vertices.length>2)segment(vertices.at(-1),vertices[0],ink,alpha);
    }
    return {polygon,rounded,shaded,texture,circle,line,point:(x,y,size,ink)=>{x=Math.round(x);y=Math.round(y);for(let row=y;row<y+size;row++)span(row,x,x+size,ink);},finish:()=>context.putImageData(frame.image,0,0)};
  }
  root.TFXRaster={begin,colour,roundedCorner};
})(globalThis);
