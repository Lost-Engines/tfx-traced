// These diagrams plot measurements returned by the original executable.
// They do not simulate guidance or run game resources in the browser.
const ink='#e1e9e8',muted='#acbec5',grid='#344853',gold='#edca82',teal='#8ccfbd',coral='#f49b84';
const n=v=>Number(v.toFixed(2));
const text=(x,y,value,size=13,colour=ink,extra='')=>`<text x="${n(x)}" y="${n(y)}" fill="${colour}" font-size="${size}" ${extra}>${value}</text>`;
const line=(x1,y1,x2,y2,colour=grid,extra='')=>`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${colour}" ${extra}/>`;
const svg=(w,h,title,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title><rect width="${w}" height="${h}" fill="#111e29" rx="3"/><g font-family="system-ui,sans-serif">${body}</g></svg>`;
export function drawBoost(data,width=720){
 const small=width<500,h=small?476:382,left=small?30:190,right=width-58,scale=(right-left)/900;
 let s=text(24,31,'The same motor, different update intervals',small?14:19)+text(24,54,'Launch speed: 190.5 m/s · original-code measurements',small?11:13,muted);
 const groups=[[1,'50 ticks','Sidewinder / ASRAAM / AAAM / Maverick'],[19,'100 ticks','AGM 109 H / Sidearm / Harpoon'],[4,'120 ticks','AMRAAM / AA-ARM / HARM']];
 const top=small?123:101,stride=small?104:87;
 for(const [i,[id,label,names]] of groups.entries()){
  const y=top+i*stride;
  if(small)s+=text(26,y-27,`${label} of boost`,14)+text(26,y-9,names,10,muted);
  else s+=text(24,y+1,`${label} of boost`,14);
  for(const [j,dt] of [4,10].entries()){
   const v=data.speeds.find(r=>r.weapon===id&&r.elapsed===dt).metresPerSecond, yy=y+j*21;
   s+=`<rect x="${left}" y="${yy}" width="${n(v*scale)}" height="13" fill="${j?teal:gold}"/>`+text(left+v*scale+7,yy+11,String(Math.round(v)),12);
  }
  if(!small)s+=text(left,y+51,names,11,muted);
 }
 const y=h-44;
 s+=`<rect x="24" y="${y}" width="12" height="12" fill="${gold}"/>`+text(44,y+11,'4 ticks per update',12)+`<rect x="${small?195:235}" y="${y}" width="12" height="12" fill="${teal}"/>`+text(small?215:255,y+11,'10 ticks per update',12);
 s+=text(24,h-13,'Numbers at the bar ends are metres per model second.',small?10:12,muted);
 return svg(width,h,'Motor timing changes missile speed',s);
}
export function drawRelease(data,height=200,width=720){
 const small=width<500,h=390,left=small?46:64,right=width-25,top=75,bottom=290;
 const ymax=height*1.12,xmax=5200,X=v=>left+v/xmax*(right-left),Y=v=>bottom-v/ymax*(bottom-top);
 let s=text(22,29,`GBU 24 released from ${height.toLocaleString('en-GB')} m`,small?16:19)+text(22,51,'Target 5 km ahead · launch speed 190.5 m/s',small?11:13,muted);
 for(const v of [0,height/2,height])s+=line(left,Y(v),right,Y(v))+text(left-9,Y(v)+4,String(v),11,muted,'text-anchor="end"');
 for(const km of (small?[0,2,4]:[0,1,2,3,4,5])){const x=X(km*1000);s+=line(x,top,x,bottom)+text(x,bottom+20,`${km}`,11,muted,'text-anchor="middle"');}
 s+=text(left,top-10,'Altitude (m)',11,muted)+text(right,bottom+39,'Distance ahead (km)',11,muted,'text-anchor="end"');
 s+=line(X(5000),top,X(5000),bottom,'#71868d','stroke-dasharray="3 6"')+text(X(5000)-4,top+12,'Target',11,muted,'text-anchor="end"');
 for(const [i,pitch]of [0,30,60].entries()){
  const points=data.trajectories.find(r=>r.height===height&&r.pitch===pitch).points,c=[gold,teal,coral][i];
  // A transition update completes the old callback; the next sample is the first guided movement.
  const transition=points.findIndex(p=>p[3]===5),cut=transition<0?points.length:transition+1;
  const path=ps=>ps.map((p,i)=>`${i?'L':'M'}${n(X(p[1]))},${n(Y(Math.max(0,p[2])))}`).join(' ');
  s+=`<path d="${path(points.slice(0,cut))}" fill="none" stroke="${c}" stroke-width="2.5"/>`;
  if(cut<points.length)s+=`<path d="${path(points.slice(cut-1))}" fill="none" stroke="${c}" stroke-width="2.5" stroke-dasharray="6 4"/>`;
  const last=points.at(-1);s+=`<circle cx="${n(X(last[1]))}" cy="${n(Y(Math.max(0,last[2])))}" r="4" fill="${c}"/>`;
  const lx=small?22+i*110:40+i*215;
  s+=line(lx,356,lx+19,356,c,'stroke-width="3"')+text(lx+25,360,pitch?`${pitch}° down`:'Level',small?11:13);
 }
 s+=text(22,382,'Solid: release / falling · Dashed: guided flight',small?10:12,muted);
 return svg(width,h,`Original GBU 24 trajectories from ${height} metres`,s);
}
