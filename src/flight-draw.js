import {aircraft,coefficients,liftSample,thrustSample,wheelSample} from './flight-math.js';
const c={bg:'#111e29',ink:'#e6eceb',muted:'#abbcc5',grid:'#304453',teal:'#88cdbd',gold:'#edca82',red:'#db938b'};
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const fmt=n=>Math.abs(n)>=100?String(Math.round(n)):Number(n.toFixed(2)).toString();
const text=(v,x,y,size=15,colour=c.muted,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${colour}" text-anchor="${anchor}">${esc(v)}</text>`;
const line=(x,y,x2,y2,colour=c.grid,width=1,dash='')=>`<path d="M${x},${y}L${x2},${y2}" fill="none" stroke="${colour}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const dot=(x,y,colour=c.gold,r=4)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${colour}"/>`;
const svg=(name,description,w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(name+': '+description)}"><rect width="${w}" height="${h}" fill="${c.bg}"/><g font-family="system-ui, sans-serif">${body}</g></svg>`;
function plot(w,{top=83,bottom=322,xmin=0,xmax=1,ymin=0,ymax=1,xticks=[0,.5,1],yticks=[0,.5,1],xlabel='',ylabel=''}){
  const small=w<500,left=small?48:66,right=w-22;
  const x=n=>left+(n-xmin)/(xmax-xmin)*(right-left),y=n=>bottom-(n-ymin)/(ymax-ymin)*(bottom-top);
  let body=text(ylabel,left,top-14,small?12:15,c.ink);
  for(const n of yticks)body+=line(left,y(n),right,y(n))+text(fmt(n),left-9,y(n)+4,small?11:14,c.muted,'end');
  for(const n of xticks)body+=line(x(n),top,x(n),bottom)+text(fmt(n),x(n),bottom+21,small?11:14,c.muted,'middle');
  body+=text(xlabel,(left+right)/2,bottom+48,small?12:15,c.ink,'middle');
  return {x,y,body,left,right,top,bottom};
}
function curve(p,fn,xmin,xmax,colour=c.teal,dash=''){
  let d='';for(let i=0;i<=240;i++){const x=xmin+(xmax-xmin)*i/240;d+=`${i?'L':'M'}${p.x(x).toFixed(2)},${p.y(fn(x)).toFixed(2)} `;}
  return `<path d="${d}" stroke="${colour}" stroke-width="2.6" fill="none" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
}
function legend(w,items,y=48){
  const step=(w-32)/items.length;
  return items.map(([label,colour,dash],i)=>line(16+i*step,y-4,35+i*step,y-4,colour,2.6,dash)+text(label,41+i*step,y,w<500?11:14,colour)).join('');
}
export function drawLift(w,options={}){
  const opts={id:'ef',speed:120,height:0,alpha:10,failed:false,...options};
  const p=plot(w,{xmin:-12,xmax:50,ymin:-2,ymax:4,xticks:[-10,0,10,20,30,40,50],yticks:[-2,-1,0,1,2,3,4],xlabel:'Angle of attack (degrees)',ylabel:'Lift coefficient'}),s=liftSample(opts);
  let body=text(aircraft[opts.id].name+' · neutral elevator',16,26,w<500?16:21,c.ink)+legend(w,[['Total lift',c.teal,''],['Wing term',c.gold,'5 4']]);
  body+=p.body+curve(p,a=>liftSample({...opts,alpha:a}).coefficient,-12,50)+curve(p,a=>liftSample({...opts,alpha:a}).wing,-12,50,c.gold,'5 4');
  body+=line(p.x(opts.alpha),p.top,p.x(opts.alpha),p.bottom,c.muted,1,'3 4')+dot(p.x(opts.alpha),p.y(s.coefficient),s.stalled?c.red:c.ink,5);
  return svg('TFX lift calculation',`Total coefficient ${fmt(s.coefficient)}, wing coefficient ${fmt(s.wing)}, stall flag ${s.stalled?'set':'clear'}.`,w,390,body);
}
export function drawThrust(w,options={}){
  const opts={id:'ef',height:0,throttle:1,afterburner:0,engines:2,...options},s=thrustSample(opts);
  const p=plot(w,{xmin:0,xmax:20.3,ymin:0,ymax:340,xticks:[0,5,10,15,20],yticks:[0,80,160,240,320],xlabel:'Altitude (km)',ylabel:'Total thrust (kN)'});
  let body=text(aircraft[opts.id].name+' · '+opts.engines+' engines',16,26,w<500?16:21,c.ink)+legend(w,[['Dry',c.gold,'5 4'],['Selected',c.teal,'']])+p.body;
  body+=curve(p,h=>thrustSample({...opts,height:h,afterburner:0}).thrust/1000,0,20.3,c.gold,'5 4')+curve(p,h=>thrustSample({...opts,height:h}).thrust/1000,0,20.3);
  body+=line(p.x(opts.height),p.top,p.x(opts.height),p.bottom,c.muted,1,'3 4')+dot(p.x(opts.height),p.y(s.thrust/1000),c.ink,5);
  return svg('TFX engine thrust',`${fmt(s.thrust/1000)} kilonewtons at ${opts.height} kilometres.`,w,390,body);
}
export function drawWheel(w,options={}){
  const opts={id:'ef',compression:.12,sink:2,...options},s=wheelSample(opts);
  const p=plot(w,{xmin:0,xmax:.3,ymin:-50,ymax:250,xticks:[0,.1,.2,.3],yticks:[-50,0,50,100,150,200,250],xlabel:'Wheel compression (metres)',ylabel:'Upward reaction (kN)'});
  let body=text(aircraft[opts.id].name+' · one nosewheel',16,26,w<500?16:21,c.ink)+legend(w,[['Reaction',c.teal,''],['⅓ weight',c.gold,'5 4']])+p.body;
  body+=curve(p,d=>wheelSample({...opts,compression:d}).reaction/1000,0,.3)+line(p.left,p.y(s.weightPerWheel/1000),p.right,p.y(s.weightPerWheel/1000),c.gold,2,'5 4');
  body+=line(p.x(opts.compression),p.top,p.x(opts.compression),p.bottom,c.muted,1,'3 4')+dot(p.x(opts.compression),p.y(s.reaction/1000),s.condition==='Within sink limit'?c.ink:c.red,5);
  return svg('TFX wheel reaction',`${fmt(s.reaction/1000)} kilonewtons. Sink-speed check: ${s.condition}.`,w,390,body);
}
export function drawMach(w){
  const top=plot(w,{top:94,bottom:240,xmin:0,xmax:2.5,ymin:0,ymax:6,xticks:[0,.5,1,1.5,2,2.5],yticks:[0,2,4,6],ylabel:'Lift slope (per radian)'});
  const bottom=plot(w,{top:333,bottom:480,xmin:0,xmax:2.5,ymin:0,ymax:.055,xticks:[0,.5,1,1.5,2,2.5],yticks:[0,.02,.04],xlabel:'Mach',ylabel:'Zero-lift drag coefficient'});
  let body=text('Three different aircraft',16,27,w<500?18:24,c.ink)+legend(w,[['Eurofighter',c.teal,''],['F-117',c.gold,'6 4'],['F-22',c.red,'2 3']]);
  body+=top.body+bottom.body;
  for(const [id,col,dash] of [['ef',c.teal,''],['f117',c.gold,'6 4'],['f22',c.red,'2 3']])body+=curve(top,m=>coefficients(id,m).slope,0,2.5,col,dash)+curve(bottom,m=>coefficients(id,m).drag,0,2.5,col,dash);
  return svg('Mach-dependent coefficients','The F-117 lift slope stays constant. The fighters vary. Wave drag enters between Mach 0.95 and 1.1.',w,545,body);
}
export function drawControls(w){
  const p=plot(w,{xmin:0,xmax:1,ymin:0,ymax:1,xticks:[0,.25,.5,.75,1],yticks:[0,.25,.5,.75,1],xlabel:'Fraction of stick travel',ylabel:'Fraction of command'});
  let body=text('Joystick response shapes',16,26,w<500?17:23,c.ink)+legend(w,[['Linear',c.muted,'3 4'],['Roll',c.teal,''],['Pitch',c.gold,'6 4']])+p.body;
  body+=curve(p,s=>s,0,1,c.muted,'3 4')+curve(p,s=>s*s,0,1,c.teal)+curve(p,s=>s**4,0,1,c.gold,'6 4');
  return svg('Joystick input response','The calibrated axis is squared for roll and squared again for advanced pitch, before trim and limits.',w,390,body);
}
export function drawForces(w){
  const small=w<500,h=small?410:460,s=w/720;
  const arrow=(x,y,x2,y2,col)=>line(x,y,x2,y2,col,3)+`<path d="M${x2-8},${y2-5}L${x2},${y2}L${x2-8},${y2+5}" transform="rotate(${Math.atan2(y2-y,x2-x)*180/Math.PI},${x2},${y2})" fill="none" stroke="${col}" stroke-width="3"/>`;
  let body=text('Nose direction ≠ flight path',16,30,small?18:25,c.ink);
  body+=`<g transform="translate(0,${small?30:0}) scale(${s})">`;
  body+=`<path d="M110,242L155,242L155,210L172,210L191,237L359,237L380,225L405,225L424,232L490,237L530,245L489,250L355,251L278,273L245,273L284,251L163,251L121,260Z" transform="rotate(-25,325,245)" fill="#426960" stroke="${c.teal}" stroke-width="2"/>`;
  body+=line(325,245,647,93,c.muted,1,'5 5')+line(325,245,648,208,c.gold,1,'5 5');
  body+=`<path d="M415,235 A91,91 0 0 0 406,207" fill="none" stroke="${c.gold}" stroke-width="2"/>`+text('α',421,218,25,c.gold);
  body+=arrow(325,245,304,80,c.teal)+arrow(325,245,325,392,c.red)+arrow(325,245,525,150,c.ink)+arrow(325,245,165,264,c.gold);
  body+=dot(325,245,c.ink,5)+'</g>';
  if(small){body+=text('Lift ⟂ flight path',16,277,15,c.teal)+text('Drag opposes flight path',16,304,15,c.gold)+text('Thrust follows the body',16,331,15,c.ink)+text('Weight points down',16,358,15,c.red)+text('α = angle of attack',16,391,15,c.gold);}
  else body+=text('Lift',278,64,21,c.teal)+text('Weight',290,421,21,c.red)+text('Thrust',513,136,21,c.ink)+text('Drag',113,259,21,c.gold)+text('Nose axis',538,89,19,c.muted)+text('Flight path',541,235,19,c.gold);
  return svg('Force directions and angle of attack','Side view. Thrust follows the nose, drag opposes motion through the air, lift is perpendicular to that motion, and weight points down.',w,h,body);
}
export function drawContacts(w){
  const small=w<500,h=small?540:610,scale=small?17:23,ox=w/2,oy=small?300:340;
  const point=(f,r)=>[ox+r*scale,oy-f*scale];
  let body=text('Eurofighter ground contacts',16,28,small?18:25,c.ink)+legend(w,[['Wheels',c.gold,''],['Body / wing',c.teal,'']],54);
  // Schematic silhouette only; dots below are the actual preset coordinates.
  const outline=[[10.6,0],[3,.6],[-1,5.6],[-3,5.6],[-1.5,1],[-4,.65],[-4.7,2],[-5,2],[-4.5,0],[-5,-2],[-4.7,-2],[-4,-.65],[-1.5,-1],[-3,-5.6],[-1,-5.6],[3,-.6]].map(([f,r])=>point(f,r).join(',')).join(' ');
  body+=`<polygon points="${outline}" fill="#29443f" stroke="#48776f" stroke-width="2"/>`;
  body+=line(ox,75,ox,oy+145,c.grid,1,'3 5')+line(20,oy,w-20,oy,c.grid,1,'3 5');
  const points=[[2.81,0,2.174],[-.86,-1.942,2.374],[-.86,1.942,2.374],[-2.325,-6.78,0],[-2.325,6.78,0],[10.52,0,0]];
  points.forEach(([f,r,d],i)=>{const [x,y]=point(f,r);body+=dot(x,y,i<3?c.gold:c.teal,6)+text(String(i+1),x+(r>0?-13:13),y-8,15,c.ink,r>0?'end':'start');});
  body+=dot(ox,oy,c.ink,3)+text('Forward ↑',w-16,86,14,c.muted,'end');
  const y=small?425:490;
  body+=text('1  Nosewheel: forward 2.81 m',16,y,small?13:17,c.gold)+text('2–3  Main wheels: right ±1.942 m',16,y+27,small?13:17,c.gold)+text('4–5  Body contacts: right ±6.78 m',16,y+54,small?13:17,c.teal)+text('6  Forward body contact: 10.52 m',16,y+81,small?13:17,c.teal);
  return svg('Six contact points','The Eurofighter uses three wheels and three body/wing contacts. Dots are drawn at the actual forward/right coordinates. Vertical offsets differ.',w,h,body);
}
