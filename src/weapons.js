import {drawRelease} from './weapons-draw.js';
const host=document.querySelector('#release-plot'),controls=document.querySelector('#release-controls'),select=document.querySelector('#release-height'),output=document.querySelector('#release-readout');
if(host&&controls&&select&&output){
 try{
  const response=await fetch(new URL('./weapons-data.json',import.meta.url));
  if(!response.ok)throw new Error('Weapon plot data unavailable');
  const data=await response.json();
  const draw=()=>{
   const height=Number(select.value),width=host.clientWidth<500?360:720;
   host.innerHTML=drawRelease(data,height,width);
   output.textContent=height===200?'The 30° and 60° releases reach the ground before guidance begins.':'All three releases survive the fall and begin steering towards the target.';
  };
  controls.hidden=false;select.addEventListener('change',draw);
  new ResizeObserver(draw).observe(host);draw();
 }catch(error){console.warn(error.message);}
}
