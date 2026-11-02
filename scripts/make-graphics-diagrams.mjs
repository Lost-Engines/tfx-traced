// Rebuild the article's static, script-free SVG illustrations. No game files needed.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/images/graphics');
const ink='#e6eceb',muted='#abbcc5',gold='#edca82',teal='#88cdbd',grid='#304453';
const text=(s,x,y,size=22,colour=muted)=>`<text x="${x}" y="${y}" fill="${colour}" font-size="${size}">${s}</text>`;
const line=(a,b,c,d,colour=grid,width=2)=>`<path d="M${a},${b} L${c},${d}" fill="none" stroke="${colour}" stroke-width="${width}"/>`;
const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const svg=(title,desc,w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${desc}</desc><rect width="100%" height="100%" fill="#111e29"/><g font-family="system-ui, sans-serif">${body}</g></svg>\n`;
const write=(name,title,desc,w,h,body)=>fs.writeFile(path.join(directory,name+'.svg'),svg(title,desc,w,h,body));
await fs.mkdir(directory,{recursive:true});
const plane=`<path d="M0,-80 L13,-16 L81,39 L81,52 L14,30 L10,65 L30,78 L30,86 L0,77 L-30,86 L-30,78 L-10,65 L-14,30 L-81,52 L-81,39 L-13,-16 Z" fill="#48776f" stroke="${teal}" stroke-width="2"/>`;
const frames=[{x:145,angle:0,label:'Model',note:'A point on the wing'},{x:470,angle:32,label:'World',note:'Rotate, then translate'},{x:800,angle:70,label:'Camera',note:'Relative to the eye'}];
await write('transforms','One vertex, three coordinate systems','Local model coordinates are rotated and placed in the world, then transformed relative to the camera.',960,300,frames.map(({x,angle,label,note},i)=>`${text(label,x-55,34,25,ink)}<g transform="translate(${x},145) rotate(${angle})">${plane}${circle(54,32,6,gold)}</g>${line(x-100,245,x+105,245)}${line(x-100,245,x-100,65)}${text(note,x-115,281,18)}${i<2?text('→',x+135,160,34,gold):''}`).join(''));
await write('painter','Sort keys control whole parts','Water with a positive depth bias draws before the rig. Smoke with a negative bias draws after it. Bias does not move any vertices.',960,390,
`${text('Paint order',35,42,26,ink)}${text('Camera depth + header bias',35,78,20)}
${text('1',35,142,26,gold)}${text('Water',80,142,24,ink)}${text('+3,000',270,142,24,teal)}
${text('2',35,217,26,gold)}${text('Structure',80,217,24,ink)}${text('0',270,217,24,teal)}
${text('3',35,292,26,gold)}${text('Smoke',80,292,24,ink)}${text('−100',270,292,24,teal)}
<path d="M480,265 L735,164 L925,263 L670,365Z" fill="#3c6780" stroke="#8ca6bc" stroke-width="2"/>
<path d="M590,229 L590,297 M660,255 L660,324 M818,190 L818,255 M749,166 L749,226" stroke="#9faea6" stroke-width="10"/>
<path d="M568,210 L749,140 L841,185 L660,259Z" fill="#618174" stroke="${teal}" stroke-width="2"/>
<path d="M618,189 L618,144 L712,108 L762,132 L762,178 L668,214Z" fill="#91a593" stroke="#c1caba" stroke-width="2"/>
<path d="M618,144 L668,169 L762,132 M668,169 L668,214" stroke="#344d46" fill="none" stroke-width="2"/>
${circle(746,103,17,'#b4b8a4')}${circle(765,76,24,'#b4b8a4')}${circle(799,57,30,'#b4b8a4')}
${text('Bias changes order, not position.',480,382,19)}`);
let vga=text('Screen pixels',30,40,25,ink);
const shades=[teal,gold,'#b0acd0','#e1a59c'];
for(let n=0;n<8;n++){const x=220+n*80;vga+=`<rect x="${x}" y="62" width="73" height="48" fill="${shades[n%4]}"/>${text(String(n),x+28,95,24,'#111e29')}`;}
vga+=text('x =',164,95,23)+text('Byte address 0',320,152,22,ink)+text('Byte address 1',645,152,22,ink);
for(let p=0;p<4;p++){
 const y=170+p*47;vga+=text(`Plane ${p}`,50,y+31,22,shades[p]);
 for(let i=0;i<2;i++)vga+=`<rect x="${300+i*320}" y="${y}" width="210" height="38" rx="2" fill="${shades[p]}"/>${text(`pixel ${p+i*4}`,355+i*320,y+26,21,'#111e29')}`;
}
vga+=text('address = page base + 80 × y + floor(x / 4)',215,376,22);
await write('vga','The four VGA planes','Consecutive pixels use different planes at the same byte address. Pixels four positions apart occupy successive bytes of the same plane.',960,395,vga);
await write('near-plane','Clip before dividing','An edge with one endpoint behind the depth-16 plane is shortened at its intersection. Depth bisection visits 36, 14, 25, 19 and 16.',960,390,
`<rect x="45" y="65" width="210" height="210" fill="#34292b"/><rect x="255" y="65" width="105" height="210" fill="#383329"/>
${line(45,180,920,180,muted)}${line(360,55,360,285,gold,3)}${text('Near plane: Z = 16',365,36,24,gold)}
<path d="M202,228 L780,124" fill="none" stroke="${muted}" stroke-dasharray="7 7" stroke-width="3"/>
${line(360,199,780,124,teal,4)}${circle(202,228,7,'#db938b')}${circle(360,199,7,gold)}${circle(780,124,7,teal)}${circle(255,180,6,ink)}
${text('A: depth −8',70,265,22,ink)}${text('B: depth 80',770,95,22,ink)}${text('Camera',210,305,22,ink)}
${text('Bisect depth, then replay the same halves on X and Y.',40,345,23,ink)}${text('36 → 14 → 25 → 19 → 16',40,378,22,gold)}`);
const poly=[[3,4],[24,2],[29,18],[8,22]],cell=12,ox=45,oy=65;
let scan=text('Walk the two boundaries',40,34,25,ink);
for(let y=0;y<24;y++)scan+=line(ox,oy+y*cell,ox+32*cell,oy+y*cell);
for(let x=0;x<=32;x++)scan+=line(ox+x*cell,oy,ox+x*cell,oy+24*cell);
scan+=`<path d="${poly.map(([x,y],i)=>`${i?'L':'M'}${ox+x*cell},${oy+y*cell}`).join(' ')}Z" fill="#38695f" fill-opacity=".45" stroke="${ink}" stroke-width="2"/>`;
scan+=line(ox+5.36*cell,oy+12.5*cell,ox+27.28*cell,oy+12.5*cell,gold,9);
scan+=text('One row',520,125,26,gold)+text('Left edge → span → right edge',520,162,21)+text('Inferno turns the traversal',520,235,22,ink)+text('for textures and shading:',520,267,22,ink)+text('top edge → column → bottom edge',520,309,19,teal);
await write('scan','Spans and columns','Two edge walkers define an interval of pixels. TFX fills horizontal spans; Inferno uses vertical columns for textures and shading.',960,390,scan);
let affine='';const ratio=4;
for(let view=0;view<2;view++){
 const ox=35+view*475,oy=70,w=410,h=275,near=w*.9,far=near/ratio;
 affine+=text(view?'Perspective-correct':'Affine screen space',ox,37,25,view?teal:gold);
 const point=(u,v)=>{const t=view?v*ratio/(1+v*(ratio-1)):v;return [ox+w/2+(u-.5)*(near*(1-t)+far*t),oy+h*(1-t)];};
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]].map(([a,b])=>point(a/8,b/8).map(n=>n.toFixed(2)).join(','));
  affine+=`<polygon points="${corners.join(' ')}" fill="${(x+y)%2?'#e7c684':'#416964'}"/>`;
 }
}
affine+=text('The far edge is four times as distant as the near edge.',35,389,22);
await write('affine','Affine and perspective-correct texture coordinates','Identical projected quads carry a checkerboard. Affine interpolation spreads rows evenly in screen space; perspective correction compresses them with depth.',960,420,affine);
await write('stipple','Overlapping screen-door smoke','Two overlapping circles share the same half-coverage checker pattern. Their overlap keeps the same holes.',960,420,
`<defs><pattern id="terrain" width="128" height="128" patternUnits="userSpaceOnUse"><rect width="128" height="128" fill="#34434a"/><path d="M0,0H64V64H0ZM64,64H128V128H64Z" fill="#465254"/></pattern><pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8,0H16V8H8ZM0,8H8V16H0Z" fill="#c5d0bd"/></pattern></defs>
${text('The mask stays in screen coordinates',40,39,25,ink)}<rect x="40" y="65" width="880" height="280" fill="url(#terrain)"/>
<circle cx="405" cy="204" r="110" fill="url(#dots)"/><circle cx="541" cy="204" r="110" fill="url(#dots)"/>
${text('One circle: half coverage',40,391,23)}${text('Overlap: still half coverage',515,391,23,gold)}`);
console.log('Wrote seven self-contained graphics diagrams.');
// Tall versions keep labels readable on a phone without scrolling the figure sideways.
await write('transforms-compact','One vertex, three coordinate systems','Model, world and camera frames arranged vertically.',320,870,
frames.map(({angle,label,note},i)=>{const y=i*290;return `${text(`${i+1}. ${label}`,22,y+30,24,ink)}<g transform="translate(160,${y+138}) rotate(${angle})">${plane}${circle(54,32,6,gold)}</g>${line(32,y+240,290,y+240)}${line(32,y+240,32,y+61)}${text(note,22,y+270,18)}`;}).join(''));
const painter=await fs.readFile(path.join(directory,'painter.svg'),'utf8');
const rig=painter.slice(painter.indexOf('<path d="M480,265'),painter.indexOf('<text x="480" y="382"'));
await write('painter-compact','Object paint order','Water draws first with a positive bias, the structure next, smoke last with a negative bias.',320,550,
`${text('Object paint order',20,36,25,ink)}${text('Camera depth + header bias',20,70,18)}
${text('1  Water',20,125,22,ink)}${text('+3,000',223,125,22,teal)}
${text('2  Structure',20,178,22,ink)}${text('0',223,178,22,teal)}
${text('3  Smoke',20,231,22,ink)}${text('−100',223,231,22,teal)}
<g transform="translate(-199,280) scale(.55)">${rig}</g>
${text('Order changes. Vertices stay put.',20,531,17)}`);
let compact=text('Screen pixels',20,33,24,ink);
for(let n=0;n<8;n++){const x=22+n*35;compact+=`<rect x="${x}" y="55" width="32" height="35" fill="${shades[n%4]}"/>${text(String(n),x+10,80,20,'#111e29')}`;}
compact+=text('Byte 0',103,134,20,ink)+text('Byte 1',223,134,20,ink);
for(let p=0;p<4;p++){
 const y=154+p*45;compact+=text(`Plane ${p}`,12,y+25,17,shades[p]);
 for(let i=0;i<2;i++)compact+=`<rect x="${90+i*120}" y="${y}" width="93" height="34" fill="${shades[p]}"/>${text(`pixel ${p+i*4}`,110+i*120,y+24,18,'#111e29')}`;
}
compact+=text('plane = x &amp; 3',20,370,19)+text('address = page base',20,404,18)+text('+ 80 × y + floor(x / 4)',20,432,18);
await write('vga-compact','The four VGA planes','Consecutive pixels select different planes. One byte address spans four neighbouring screen pixels.',320,455,compact);
console.log('Wrote three compact variants for narrow screens.');
