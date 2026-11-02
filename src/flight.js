import {aircraft,liftSample,thrustSample,wheelSample} from './flight-math.js';
import {drawLift,drawThrust,drawWheel} from './flight-draw.js';
const number=(n,digits=1)=>n.toLocaleString('en-GB',{minimumFractionDigits:digits,maximumFractionDigits:digits});
for(const figure of document.querySelectorAll('[data-flight-demo]')){
 const kind=figure.dataset.flightDemo,visual=figure.querySelector('.demo-visual'),controls=figure.querySelector('.flight-controls');
 const value=name=>figure.querySelector(`[name="${name}"]`),stat=(name,text)=>{figure.querySelector(`[data-stat="${name}"]`).textContent=text;};
 const render=()=>{
  const opts={id:value('id').value};
  for(const name of ['speed','height','alpha','throttle','afterburner','engines','compression','sink'])if(value(name))opts[name]=Number(value(name).value);
  if(value('failed'))opts.failed=value('failed').checked;
  if(kind==='thrust'){
   const max=aircraft[opts.id].afterburner_stages;
   value('afterburner').max=max;value('afterburner').disabled=!max;opts.afterburner=Math.min(max,opts.afterburner);value('afterburner').value=opts.afterburner;
   if(opts.afterburner){value('throttle').value=100;opts.throttle=100;}
   value('throttle').disabled=opts.afterburner>0;
  }
  for(const el of controls.querySelectorAll('input[type="range"]'))figure.querySelector(`output[for="${el.id}"]`).textContent=el.value;
  if(kind==='thrust')opts.throttle/=100;
  if(kind==='wheel')opts.compression/=100;
  const width=Math.max(240,Math.round(figure.clientWidth));
  visual.innerHTML=({lift:drawLift,thrust:drawThrust,wheel:drawWheel}[kind])(width,opts);
  if(kind==='lift'){
   const s=liftSample(opts);stat('force',number(s.lift/1000)+' kN');stat('load',number(s.lift/(s.mass*9.81),2)+' × weight');stat('stall',s.stalled?'Set':'Clear');
   figure.querySelector('.demo-readout').textContent=`Trailing-edge flap demand: ${number(s.flap*100,0)}%. Leading-edge allowance: ${number(s.leading*100,0)}%. Total lift coefficient: ${number(s.coefficient,3)}. Neutral elevator; full internal fuel; no stores.`;
  }else if(kind==='thrust'){
   const s=thrustSample(opts);stat('force',number(s.thrust/1000)+' kN');stat('ratio',number(s.thrust/s.weight,2));stat('reheat',s.stage?`Step ${s.stage} of 4`:'Off');
   figure.querySelector('.demo-readout').textContent=opts.id==='f117'?'The F-117 has no afterburner. Full internal fuel, no stores.':'Afterburner sets full throttle. Nozzles are straight; full internal fuel, no stores.';
  }else{
   const s=wheelSample(opts);stat('force',number(s.reaction/1000)+' kN');stat('weight',number(s.weightPerWheel/1000)+' kN');stat('gear',s.condition);
   figure.querySelector('.demo-readout').textContent='Initially healthy nosewheel, with gear-damage checks enabled. Failure halves damping. The dashed line is one third of full-fuel aircraft weight.';
  }
 };
 try{
  render();figure.querySelector('.demo-fallback').hidden=true;visual.hidden=false;controls.hidden=false;figure.classList.add('demo-ready');
  controls.addEventListener('input',render);controls.addEventListener('change',render);
  new ResizeObserver(render).observe(figure);
 }catch(error){console.error('Flight illustration:',error);}
}
