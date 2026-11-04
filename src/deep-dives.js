import {drawDemo,scanVisit,clockTimes,comparison} from './deep-dive-draw.js';
const elements=[...document.querySelectorAll('[data-demo]')];
if(elements.length){
 try{
  const response=await fetch(new URL('./deep-dive-data.json',import.meta.url));
  if(!response.ok)throw Error('Article examples unavailable');
  const data=await response.json();
  for(const element of elements){
   const controls=element.querySelector('.research-controls'),picture=element.querySelector('.demo-picture'),kind=element.dataset.demo;
   const update=()=>{
    const values=Object.fromEntries([...controls.querySelectorAll('input,select')].map(x=>[x.name,x.type==='checkbox'?Number(x.checked):x.value]));
    for(const output of controls.querySelectorAll('[data-value]'))output.value=output.dataset.value==='visit'?Number(values.visit)+1:values[output.dataset.value];
    picture.innerHTML=drawDemo(kind,values,data,picture.getBoundingClientRect().width<600);
    let readout='';
    if(kind==='campaign'){const r=data.campaign.find(r=>r.completed===Number(values.completed)&&r.kills===Number(values.kills));readout=`Original result: ${r.result}. Finish bonus: ${r.bonus.toLocaleString('en-GB')} points. Completed-mission count increases by ${r.missions}.`;}
    if(kind==='scan'){const r=scanVisit(Number(values.visit));readout=`Slots ${r.slots.join(', ')} are checked. With no match, the next visit starts at slot ${r.next}.`;}
    if(kind==='packing'){const r=data.packing[Number(values.example)];readout=`${r.input.length} input bytes become ${r.encoded.length} stored bytes, including the two-byte length. Captured from the original compressor.`;}
    if(kind==='clock'){const r=clockTimes(Number(values.ticks));readout=`50 Hz: ${r.requested.toFixed(3)} seconds. TFX: ${r.game.toFixed(3)} seconds. The TFX passage is ${((1-r.game/r.requested)*100).toFixed(2)}% shorter.`;}
    if(kind==='comparison'){const r=comparison(values.mode);readout=`Changed colour indices: ${r.indexDiff}. Changed visible pixels: ${r.rgbDiff}. Retained target ${r.stateDiff?'differs':'matches'}. These are illustrative test images.`;}
    controls.querySelector('.research-readout').textContent=readout;
   };
   // Reveal controls only after a successful first draw; otherwise the SVG remains.
   update();controls.hidden=false;
   controls.addEventListener('input',update);
   let compact=picture.getBoundingClientRect().width<600;
   new ResizeObserver(()=>{const next=picture.getBoundingClientRect().width<600;if(next!==compact){compact=next;update();}}).observe(picture);
  }
 }catch(error){console.warn('Using static article illustrations:',error.message);}
}
