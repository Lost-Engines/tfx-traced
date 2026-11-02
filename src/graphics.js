// Small algorithm illustrations for the article. Game viewers keep their own renderers.
const colours = {bg:'#111e29', ink:'#e6eceb', muted:'#abbcc5', grid:'#304453', teal:'#88cdbd', gold:'#edca82', red:'#db938b'};
const nearInput=document.querySelector('#near-depth'), scanInput=document.querySelector('#scan-step');
function text(ctx,value,x,y,colour=colours.muted,size=14){ctx.fillStyle=colour;ctx.font=`${size}px ui-sans-serif, system-ui, sans-serif`;ctx.fillText(value,x,y);}
function line(ctx,x1,y1,x2,y2,colour=colours.grid,width=1){ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function dot(ctx,x,y,colour,r=4){ctx.fillStyle=colour;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function nearIntersection(z,x,bz,bx){
  // All values stay in the native signed ranges in this illustration.
  if(z===16)return {x,steps:[]};
  let a=z,b=bz,ax=x,bx1=bx;const steps=[];
  for(let n=0;n<16;n++){
    const mid=(a+b)>>1,mx=(ax+bx1)>>1;steps.push(mid);
    if(mid===16)return {x:mx,steps};
    if(mid>16){b=mid;bx1=mx;}else{a=mid;ax=mx;}
  }
  return {x:(ax+bx1)>>1,steps};
}
function near(ctx,w,h){
  const z=Number(nearInput.value), zx=n=>46+(n+32)/128*(w-70), xy=n=>151-n*4;
  ctx.fillStyle='#34292b';ctx.fillRect(zx(-32),35,zx(0)-zx(-32),200);
  ctx.fillStyle='#383329';ctx.fillRect(zx(0),35,zx(16)-zx(0),200);
  line(ctx,zx(-32),xy(0),zx(96),xy(0),colours.muted);
  line(ctx,zx(16),31,zx(16),241,colours.gold,2);
  text(ctx,'Near plane: Z = 16',Math.min(zx(16)+9,w-158),22,colours.gold);
  for(const tick of [-16,0,16,48,80]){line(ctx,zx(tick),xy(0)-4,zx(tick),xy(0)+4,colours.muted);text(ctx,String(tick),zx(tick)-8,247);}
  ctx.setLineDash([5,5]);line(ctx,zx(z),xy(-12),zx(80),xy(14),colours.muted,2);ctx.setLineDash([]);
  let readout;
  if(z<=16){
    const hit=nearIntersection(z,-12*65536,80,14*65536),x=hit.x/65536;
    line(ctx,zx(16),xy(x),zx(80),xy(14),colours.teal,3);dot(ctx,zx(16),xy(x),colours.gold,5);
    const shown=hit.steps.slice(0,6).join(' → ');
    text(ctx,'Depth search',16,269,colours.ink);
    text(ctx,shown||'A is already on the near plane',16,292,colours.gold,w<400?12:14);
    readout=`A is clipped. Intersection X = ${x.toFixed(4)}; projected offset = ${Math.trunc((hit.x>>8)/16)} pixels. ${hit.steps.length} midpoint tests.`;
  }else{
    line(ctx,zx(z),xy(-12),zx(80),xy(14),colours.teal,3);
    text(ctx,'Both endpoints are beyond the near plane.',16,269,colours.teal,w<400?13:14);
    readout='The complete edge survives. Both endpoints use the ordinary perspective division.';
  }
  dot(ctx,zx(z),xy(-12),z<=16?colours.red:colours.teal,5);text(ctx,'A',zx(z)-5,xy(-12)+22,colours.ink);
  dot(ctx,zx(80),xy(14),colours.teal,5);text(ctx,'B',zx(80)+9,xy(14)-8,colours.ink);
  dot(ctx,zx(0),xy(0),colours.ink,4);text(ctx,'Camera',Math.max(10,zx(0)-25),130,colours.ink,12);
  nearInput.setAttribute('aria-valuetext',`Endpoint A depth ${z}`);
  document.querySelector('#near-value').value=String(z).replace('-','−');
  document.querySelector('#near-result').textContent=readout;
}
const polygon=[[3,4],[24,2],[29,18],[8,22]];
function interval(at,axis){
  const hits=[];
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    if(at<Math.min(a[axis],b[axis])||at>=Math.max(a[axis],b[axis]))continue;
    hits.push(a[1-axis]+(at-a[axis])*(b[1-axis]-a[1-axis])/(b[axis]-a[axis]));
  }
  return hits.sort((a,b)=>a-b);
}
function scan(ctx,w,h){
  const columns=document.querySelector('#scan-direction').value==='columns',axis=columns?0:1;
  const max=columns?31:23;scanInput.max=String(max);const selected=Math.min(max,Number(scanInput.value));scanInput.value=String(selected);
  const cell=Math.min((w-28)/32,12),ox=(w-32*cell)/2,oy=44;
  const pos=(x,y)=>[ox+x*cell,oy+y*cell];
  for(let slice=0;slice<=selected;slice++){
    const hit=interval(slice+.5,axis);if(hit.length!==2)continue;
    for(let step=Math.ceil(hit[0]-.5);step<hit[1]-.5;step++){
      const [x,y]=pos(columns?slice:step,columns?step:slice);
      ctx.fillStyle=slice===selected?colours.gold:'#38695f';ctx.fillRect(x,y,cell,cell);
    }
  }
  for(let x=0;x<=32;x++)line(ctx,ox+x*cell,oy,ox+x*cell,oy+24*cell);
  for(let y=0;y<=24;y++)line(ctx,ox,oy+y*cell,ox+32*cell,oy+y*cell);
  ctx.strokeStyle=colours.ink;ctx.lineWidth=2;ctx.beginPath();polygon.forEach(([x,y],i)=>{const p=pos(x,y);i?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.closePath();ctx.stroke();
  const hit=interval(selected+.5,axis);
  if(hit.length===2){const a=pos(columns?selected+.5:hit[0],columns?hit[0]:selected+.5),b=pos(columns?selected+.5:hit[1],columns?hit[1]:selected+.5);line(ctx,...a,...b,colours.gold,2);dot(ctx,...a,colours.gold);dot(ctx,...b,colours.gold);}
  text(ctx,columns?'Inferno: walk columns left to right':'TFX: construct spans top to bottom',14,25,colours.ink,w<400?13:15);
  document.querySelector('#scan-value').value=String(selected);
  document.querySelector('#scan-result').textContent=hit.length===2?`${columns?'Column':'Row'} ${selected}: the two edges meet the slice at ${hit[0].toFixed(2)} and ${hit[1].toFixed(2)}. Gold marks the interval to fill.`:'This slice is outside the polygon.';
}
function checker(ctx,x,y,w,h,ratio,perspective){
  const pw=Math.floor(w),ph=Math.floor(h),surface=document.createElement('canvas');surface.width=pw;surface.height=ph;
  const s=surface.getContext('2d'),data=s.createImageData(pw,ph),nearWidth=pw*.89,farWidth=nearWidth/ratio;
  for(let py=0;py<ph;py++){
    const t=1-py/(ph-1),width=nearWidth*(1-t)+farWidth*t,v=perspective?(t/ratio)/(1-t+t/ratio):t;
    for(let px=0;px<pw;px++){
      const u=(px-pw/2)/width+.5;if(u<0||u>1)continue;
      const light=(Math.floor(Math.min(.999999,u)*8)+Math.floor(Math.min(.999999,v)*8))%2;
      const rgb=light?[231,198,132]:[65,105,100],at=(py*pw+px)*4;
      data.data.set([...rgb,255],at);
    }
  }
  s.putImageData(data,0,0);ctx.drawImage(surface,x,y);
  ctx.strokeStyle=colours.muted;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+pw/2-farWidth/2,y);ctx.lineTo(x+pw/2+farWidth/2,y);ctx.lineTo(x+pw/2+nearWidth/2,y+ph);ctx.lineTo(x+pw/2-nearWidth/2,y+ph);ctx.closePath();ctx.stroke();
}
function texture(ctx,w,h){
  const ratio=Number(document.querySelector('#texture-depth').value)/10,stack=w<600,pw=stack?w-28:(w-48)/2,ph=stack?190:246;
  for(let i=0;i<2;i++){
    const x=stack?14:16+i*(pw+16),y=stack?36+i*260:48;
    text(ctx,i?'Perspective-correct coordinates':'Affine screen-space coordinates',x,y-17,i?colours.teal:colours.gold,stack?14:15);
    checker(ctx,x,y,pw,ph,ratio,i===1);
  }
  document.querySelector('#texture-value').value=`${ratio.toFixed(1)}×`;
}
function stipple(ctx,w,h){
  const mode=document.querySelector('#stipple-mode').value,gap=Number(document.querySelector('#stipple-gap').value),cell=Math.min((w-24)/80,8);
  const ox=(w-80*cell)/2,oy=40;
  for(let y=0;y<36;y++)for(let x=0;x<80;x++){
    const circle=(x-(40-gap/2))**2+(y-18)**2<13**2||(x-(40+gap/2))**2+(y-18)**2<13**2;
    const mask=mode==='solid'||(mode==='0'?((x+y)&1)!==0:(x&3)===(y&1?3:1));
    ctx.fillStyle=circle&&mask?'#c5d0bd':((Math.floor((x+y/3)/12)+Math.floor(y/12))%2?'#465254':'#34434a');
    ctx.fillRect(ox+x*cell,oy+y*cell,cell+.05,cell+.05);
  }
  text(ctx,'The mask is anchored to the screen.',12,23,colours.ink,w<400?13:15);
  document.querySelector('#stipple-result').textContent=mode==='solid'?'Every covered pixel receives the circle colour.':`The same ${mode==='0'?'half-coverage checkerboard':'quarter-coverage pattern'} applies to both circles, including their overlap.`;
}
const drawers={near,scan,texture,stipple};
for(const figure of document.querySelectorAll('.engine-demo')){
  const type=figure.dataset.demo,canvas=figure.querySelector('canvas'),ctx=canvas.getContext('2d');if(!ctx)continue;
  let lastWidth=0;
  const draw=()=>{
    const w=Math.max(260,Math.round(figure.clientWidth)),h=type==='texture'?(w<600?535:320):type==='near'?315:type==='scan'?Math.min((w-28)/32,12)*24+62:Math.min((w-24)/80,8)*36+56;
    const dpr=Math.min(window.devicePixelRatio||1,3);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.height=`${h}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=colours.bg;ctx.fillRect(0,0,w,h);drawers[type](ctx,w,h);lastWidth=w;
  };
  figure.querySelector('.demo-fallback').hidden=true;canvas.hidden=false;figure.querySelector('.demo-controls').hidden=false;
  figure.addEventListener('input',draw);figure.addEventListener('change',draw);
  new ResizeObserver(()=>{if(Math.round(figure.clientWidth)!==lastWidth)draw();}).observe(figure);draw();
}
