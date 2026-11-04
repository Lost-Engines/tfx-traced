// Shared by the live illustrations and their static SVG versions.
const C={bg:'#111e29',ink:'#e6eceb',muted:'#aabdc6',gold:'#edca82',teal:'#88cdbd',line:'#405865',red:'#ed9e8c',panel:'#1b2d39'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(s,x,y,size=21,fill=C.ink,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
const line=(x,y,xx,yy,colour=C.line)=>`<path d="M${x} ${y} L${xx} ${yy}" fill="none" stroke="${colour}" stroke-width="3"/>`;
const box=(x,y,w,h,colour=C.line,fill=C.panel)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${colour}" stroke-width="2"/>`;
const lines=(values,x,y,size=20,fill=C.muted)=>values.map((s,i)=>text(s,x,y+i*(size+9),size,fill)).join('');
const svg=(title,desc,w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><desc>${esc(desc)}</desc><rect width="100%" height="100%" rx="5" fill="${C.bg}"/><g font-family="system-ui, sans-serif">${body}</g></svg>`;

export function pack(values,fill){
 const body=[];let at=0;
 while(at<values.length){let run=0,literal=[];while(at<values.length&&values[at]===fill&&run<255){at++;run++;}while(at<values.length&&values[at]!==fill&&literal.length<255)literal.push(values[at++]);body.push(run,literal.length,...literal);}
 return [body.length&255,body.length>>8,...body];
}
export function scanVisit(visit){const start=visit*6%50;return {start,slots:Array.from({length:6},(_,i)=>(start+i)%50),next:(start+6)%50};}
export function clockTimes(ticks){return {requested:ticks/50,game:ticks*21845/1193182};}
export function comparison(mode){
 const indices=Array.from({length:48},(_,i)=>{const x=i%8,y=Math.floor(i/8);return y>=3?1:x===3&&y===2?2:0;});
 const other=[...indices],palette=['#365366','#4e7568','#edca82','#4e7568'],paletteB=[...palette];
 let stateA='target = 12',stateB=stateA;
 if(mode==='pixel')other[27]=2;
 if(mode==='alias')other[27]=3;
 if(mode==='palette')paletteB[1]='#956649';
 if(mode==='state')stateB='target = 19';
 return {indices,other,palette,paletteB,stateA,stateB,indexDiff:indices.filter((v,i)=>v!==other[i]).length,rgbDiff:indices.filter((v,i)=>palette[v]!==paletteB[other[i]]).length,stateDiff:stateA!==stateB};
}

export function drawDemo(kind,values,data,compact=false){
 const w=compact?520:900;
 if(kind==='campaign'){
  const row=data.campaign.find(r=>r.completed===Number(values.completed)&&r.kills===Number(values.kills));
  const h=compact?600:520, x=35,bw=w-70,good=row.result===2;
  let b=text('Arcade mission 605',x,42,26)+text(`completed = ${row.completed}   ·   enemy kills = ${row.kills}`,x,80,20,C.muted);
  const cards=[['Completion test',row.completed?'Enter the outer block.':'Skip the outer block.',!!row.completed],['Ten-kill test',good?'True: award 20,000, return 2.':row.completed?'False: leave the first inner block.':'Not reached.',good],['Partial-success test',row.completed&&!good?'Skipped by the original brace cleanup.':good?'Not reached: RETURN has ended the script.':'Not reached.',false]];
  cards.forEach(([title,detail,active],i)=>{const y=110+i*(compact?116:100);b+=box(x,y,bw,compact?96:82,active?C.teal:C.line)+text(title,x+18,y+31,21,active?C.teal:C.ink);b+=text(detail,x+18,y+63,compact?17:20,C.muted);if(i<2)b+=line(w/2,y+(compact?96:82),w/2,y+(compact?113:97));});
  b+=text(`Result ${row.result}   ·   Finish bonus ${row.bonus.toLocaleString('en-GB')}`,x,h-42,compact?24:28,good?C.teal:C.gold);
  return svg('The result returned by miss605',`Completed ${row.completed}, kills ${row.kills}, result ${row.result}, bonus ${row.bonus}.`,w,h,b);
 }
 if(kind==='scan'){
  const visit=Number(values.visit),s=scanVisit(visit),cols=compact?5:10,rows=50/cols,h=compact?750:520,cell=compact?82:78,side=compact?69:65,left=(w-cols*cell)/2,top=compact?135:150;
  let b=text(`Acquisition visit ${visit+1}`,30,42,26)+text('Six candidates out of fifty slots',30,78,20,C.muted);
  for(let i=0;i<50;i++){const x=left+i%cols*cell,y=top+Math.floor(i/cols)*(compact?48:55),active=s.slots.includes(i);b+=box(x,y,side,39,active?C.gold:C.line,active?'#594c31':C.panel)+text(String(i).padStart(2,'0'),x+side/2,y+27,20,active?C.gold:C.muted,'middle');}
  b+=text(`Checked: ${s.slots.join(', ')}`,30,h-82,compact?19:24,C.gold)+text(`Next cursor: ${s.next}`,30,h-44,23,C.teal);
  return svg('A rolling aircraft search',`Visit ${visit+1} checks slots ${s.slots.join(', ')}. The next cursor is ${s.next}.`,w,h,b);
 }
 if(kind==='packing'){
  const d=data.packing[Number(values.example)],hex=xs=>xs.map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(' '),h=compact?620:520;
  const source=d.input.length>24?`00 repeated ${d.input.length} times`:d.input.length?hex(d.input):'(empty)';
  const groups=[];for(let i=2;i<d.encoded.length;){const run=d.encoded[i++],n=d.encoded[i++],literal=d.encoded.slice(i,i+n);i+=n;groups.push({run,n,literal});}
  let b=text(d.name,30,42,26)+text(`Fill byte: ${hex([d.fill])}`,30,78,20,C.muted)+box(25,105,w-50,100)+text('Input',45,136,19,C.muted)+text(source,45,176,compact?18:25,C.ink);
  b+=text(`Stored length: ${hex(d.encoded.slice(0,2))}`,30,246,22,C.teal);
  const limit=compact?5:8;groups.slice(0,limit).forEach((g,i)=>{const y=285+i*36;const detail=`${g.run} fill + ${g.n} literal${g.n===1?'':'s'}${g.n?'  ['+hex(g.literal)+']':''}`;b+=text(detail,35,y,compact?18:22);});
  if(!groups.length)b+=text('No runs follow the zero length.',35,285,21);
  b+=text(`${d.input.length} input bytes → ${d.encoded.length} stored bytes`,30,h-74,compact?23:27,C.gold)+text('Stored size includes the two-byte length.',30,h-36,compact?18:20,C.muted);
  return svg('The original fill and literal compressor',`${d.name}: ${d.input.length} source bytes, ${d.encoded.length} stored bytes including length.`,w,h,b);
 }
 if(kind==='clock'){
  const ticks=Number(values.ticks),t=clockTimes(ticks),h=compact?560:520,maxWidth=w-90;
  let b=text(`${ticks.toLocaleString('en-GB')} sequencer ticks`,30,44,27)+lines(['A fixed passage, timed by two clocks.'],30,83,compact?20:23);
  [['Requested 50 Hz',t.requested,C.muted],['TFX shared interrupt',t.game,C.teal]].forEach(([label,n,col],i)=>{const y=145+i*135;b+=text(label,35,y,24,col)+box(35,y+20,maxWidth*n/t.requested,42,col,col)+text(n.toFixed(3)+' seconds',35,y+96,23,C.ink);});
  b+=text(`${(t.requested-t.game).toFixed(3)} seconds difference`,30,h-66,25,C.gold)+text('PIT: 1,193,182 Hz ÷ 21,845',30,h-28,compact?19:22,C.muted);
  return svg('The shared timer changes the duration',`${ticks} ticks take ${t.requested.toFixed(3)} seconds at 50 Hz and ${t.game.toFixed(3)} seconds in TFX.`,w,h,b);
 }
 if(kind==='comparison'){
  const d=comparison(values.mode),h=compact?770:520,cell=compact?24:31,gap=compact?260:0,origin=compact?155:45;
  let b=text('Compare more than the picture',30,42,compact?25:28);
  const panels=[['Reference',d.indices,d.palette],['Reconstruction',d.other,d.paletteB]];
  panels.forEach(([title,pixels,palette],i)=>{const x=origin+(compact?0:440)*i,y=compact?115+i*gap:150;b+=text(title,x,y-23,24,C.teal);for(let j=0;j<48;j++)b+=`<rect x="${x+j%8*cell}" y="${y+Math.floor(j/8)*cell}" width="${cell}" height="${cell}" fill="${palette[pixels[j]]}"/>`;if(i&&d.indexDiff){const x0=x+3*cell,y0=y+3*cell;b+=`<rect x="${x0}" y="${y0}" width="${cell}" height="${cell}" fill="none" stroke="${C.red}" stroke-width="4"/>`;}b+=text(i?d.stateB:d.stateA,x,y+6*cell+30,21,C.muted);});
  const y=compact?660:420;b+=text(`Changed indices: ${d.indexDiff} / 48`,30,y,22,d.indexDiff?C.red:C.teal)+text(`Changed visible pixels: ${d.rgbDiff} / 48`,30,y+35,22,d.rgbDiff?C.red:C.teal)+text(`Retained target: ${d.stateDiff?'different':'same'}`,30,y+70,22,d.stateDiff?C.red:C.teal);
  return svg('Example image and state comparisons',`${d.indexDiff} changed indices, ${d.rgbDiff} changed visible pixels; target state ${d.stateDiff?'differs':'matches'}.`,w,h,b);
 }
 throw Error('Unknown article diagram: '+kind);
}

const flows={
 'campaign-flow':{title:'From briefing to debriefing',cards:[['Career program',['Briefing, menus, mission call']],['Flight',['Targets, losses, player outcome']],['Mission FINISH',['Conditions, score, return value']],['Career resumes',['Retry, next mission, discipline']],['Pilot save',['Variables and return locations']]]},
 'ai-layers':{title:'One aircraft, several jobs',cards:[['Authored route',['Waypoints, waits, attacks, radio']],['Formation relationship',['Leader, offset, catch-up state']],['Combat and threats',['Acquire, engage, withdraw, evade']],['Control commands',['Pitch, heading, speed, manoeuvre']],['Motion and requests',['Move, fire, notify, animate']]]},
 'recording-flow':{title:'Save the submitted scene',cards:[['Flight and scenery',['Submit model parts']],['Model queue',['Priority, transform, parameters']],['Recording file',['Frame fields and model names']],['Playback queue',['Resolve names; restore fields']],['Renderer',['Draw without advancing flight']]]},
 'audio-path':{title:'From a cue to the speakers',cards:[['Flight or presentation',['Choose a cue, resource and order']],['Shared PIT interrupt',['Approximately 54.62 ticks/s']],['OSL sequencer',['Rows, channels and ongoing effects']],['Device driver',['OPL registers or MIDI messages']],['Synthesiser',['Instrument voices and audio']]]},
 'testing-harness':{title:'Calling the original code',cards:[['Declared inputs',['State, resources, input and time']],['Original executable',['Relocate, initialise, call in Unicorn']],['C++ reconstruction',['Run with the same case inputs']],['Capture outputs',['State, requests, indices, palette']],['Compare and keep the case',['Locate the first difference']]]}
};
export function drawOverview(kind,compact=false){
 const d=flows[kind],w=compact?520:900,h=compact?740:520;
 if(kind==='testing-harness'){
  const x=compact?40:245,bw=compact?440:410,left=compact?25:35,right=compact?275:470,side=compact?220:395;
  let b=text(d.title,30,45,compact?26:30)+box(x,80,bw,88,C.gold)+text('Declared inputs',x+18,113,24,C.gold)+text('State, resources, input and time',x+18,144,compact?19:22);
  b+=line(w/2,168,left+side/2,220,C.teal)+line(w/2,168,right+side/2,220,C.teal);
  b+=box(left,220,side,100)+text('Original routine',left+15,255,compact?22:25)+text('Relocate and call',left+15,288,compact?18:21,C.muted);
  b+=box(right,220,side,100)+text('C++ routine',right+15,255,compact?22:25)+text('Same case inputs',right+15,288,compact?18:21,C.muted);
  b+=line(left+side/2,320,w/2,375,C.teal)+line(right+side/2,320,w/2,375,C.teal)+box(x,375,bw,100,C.teal)+text('Compare the outputs',x+18,411,25,C.teal)+text('State, requests, pixels and palette',x+18,446,compact?18:20);
  if(compact)b+=lines(['DOS and device calls are hosted','at declared boundaries.','The original routine still executes.'],40,550,22);
  return svg(d.title,'Declared inputs feed original and C++ routines independently. Their returned state and outputs are compared.',w,h,b);
 }
 if(kind==='audio-path'){
  const side=compact?220:395,left=compact?25:35,right=compact?275:470,x=compact?40:245,bw=compact?440:410;
  let b=text(d.title,30,45,compact?26:30)+box(left,85,side,100)+text('Game cue',left+15,122,24,C.gold)+text('Resource and order',left+15,156,compact?18:21);
  b+=box(right,85,side,100)+text('PIT interrupt',right+15,122,24,C.gold)+text('54.62 ticks/s',right+15,156,compact?18:21);
  b+=line(left+side/2,185,w/2,235,C.teal)+line(right+side/2,185,w/2,235,C.teal)+box(x,235,bw,95,C.teal)+text('OSL sequencer',x+18,272,25,C.teal)+text('Rows, channels, ongoing effects',x+18,306,compact?19:21);
  if(compact){b+=line(w/2,330,w/2,375,C.teal)+box(x,375,bw,95)+text('Device driver',x+18,413,25)+text('OPL registers or MIDI messages',x+18,446,20)+line(w/2,470,w/2,515,C.teal)+box(x,515,bw,95)+text('Synthesiser',x+18,553,25)+text('Instrument voices and audio',x+18,586,20);}
  else{b+=line(w/2,330,left+side/2,380,C.teal)+box(left,380,side,100)+text('Device driver',left+18,417,25)+text('OPL registers or MIDI messages',left+18,452,20)+text('→',left+side+10,441,27,C.teal)+box(right,380,side,100)+text('Synthesiser',right+18,417,25)+text('Instrument voices and audio',right+18,452,20);}
  return svg(d.title,'The game selects a cue; the independent PIT interrupt advances the sequencer. Device output drives a synthesiser.',w,h,b);
 }
 let b=text(d.title,30,48,compact?26:30);
 d.cards.forEach(([name,notes],i)=>{const col=compact?0:i%2,row=compact?i:Math.floor(i/2),x=compact?35:35+col*435,y=compact?90+row*126:100+row*135,bw=compact?450:395;
  b+=box(x,y,bw,100,i===d.cards.length-1?C.teal:C.line)+text(String(i+1).padStart(2,'0'),x+16,y+30,17,C.gold)+text(name,x+16,y+57,compact?23:22)+lines(notes,x+16,y+85,compact?18:17);
  if(compact&&i<d.cards.length-1)b+=line(w/2,y+101,w/2,y+122,C.teal);
  else if(!compact&&i%2===0&&i<d.cards.length-1)b+=text('→',x+bw+9,y+60,27,C.teal);
 });
 return svg(d.title,d.cards.map(x=>x[0]+': '+x[1].join(' ')).join('. '),w,h,b);
}
