// Small equation exhibits for the flight article, using TFX 2.05 preset constants.
// Provenance and native numerical checks: content/flight-sources.md.
// These are isolated force calculations, not a running aircraft simulation.
export const aircraft = {
  "ef": {
    "name": "Eurofighter",
    "wing_area": 50.0,
    "additional_lifting_area": 2.4,
    "zero_lift": 0.0117,
    "maximum_lift": 0.98,
    "flap_lift_gradient": 0.523,
    "maximum_flap_angle": 1.0471966666666666,
    "flap_limit_gradient": 0.302,
    "automatic_flap_gradient": 3.262,
    "maximum_automatic_flap_angle": 0.3490655555555555,
    "critical_angle": 0.4363319444444444,
    "induced_drag": 0.14435834696094174,
    "base_drag": 0.008,
    "wave_drag_increment": 0.025,
    "elevator_lift_gradient": 0.0486,
    "maximum_elevator_angle": -0.8726638888888888,
    "empty_mass_kg": 10000.0,
    "fuel_capacity": 4000.0,
    "dry_thrust": 120000.0,
    "afterburner_thrust": 60000.0,
    "afterburner_stages": 4,
    "ceiling_km": 20.3,
    "spring_stiffness": 200000.0,
    "damping": 16000.0,
    "maximum_sink_speed": 3.1
  },
  "f117": {
    "name": "F-117",
    "wing_area": 105.9,
    "additional_lifting_area": 0.0,
    "zero_lift": 0.024,
    "maximum_lift": 1.52,
    "flap_lift_gradient": 1.0,
    "maximum_flap_angle": 1.0,
    "flap_limit_gradient": 1.0,
    "automatic_flap_gradient": 1.0,
    "maximum_automatic_flap_angle": 1.0,
    "critical_angle": 0.7243110277777776,
    "induced_drag": 0.193,
    "base_drag": 0.0083,
    "wave_drag_increment": 0.04200000000000001,
    "elevator_lift_gradient": 0.0,
    "maximum_elevator_angle": 0.10471966666666664,
    "empty_mass_kg": 13608.0,
    "fuel_capacity": 7938.0,
    "dry_thrust": 96000.0,
    "afterburner_thrust": 0.0,
    "afterburner_stages": 0,
    "ceiling_km": 20.3,
    "spring_stiffness": 200000.0,
    "damping": 13000.0,
    "maximum_sink_speed": 5.0
  },
  "f22": {
    "name": "F-22",
    "wing_area": 78.0,
    "additional_lifting_area": 12.72,
    "zero_lift": 0.0117,
    "maximum_lift": 0.86,
    "flap_lift_gradient": 0.808,
    "maximum_flap_angle": 1.0471966666666666,
    "flap_limit_gradient": 0.329,
    "automatic_flap_gradient": 3.375,
    "maximum_automatic_flap_angle": 0.4363319444444444,
    "critical_angle": 0.39269874999999993,
    "induced_drag": 0.135,
    "base_drag": 0.01,
    "wave_drag_increment": 0.028,
    "elevator_lift_gradient": 0.0,
    "maximum_elevator_angle": 0.10471966666666664,
    "empty_mass_kg": 15000.0,
    "fuel_capacity": 9979.0,
    "dry_thrust": 187200.0,
    "afterburner_thrust": 124800.0,
    "afterburner_stages": 4,
    "ceiling_km": 20.3,
    "spring_stiffness": 180000.0,
    "damping": 15000.0,
    "maximum_sink_speed": 3.05
  }
};
export const nativePi = 3.14159;
export const radians = degrees => degrees * nativePi / 180;
export const clamp = (n,lo,hi) => Math.min(hi,Math.max(lo,n));
export function atmosphere(heightKm, temperature=false) {
  let density=1.225*(20-heightKm)/(20+heightKm);
  if(heightKm>10)density=Math.max(.088,density+.00088*(heightKm-10)**2);
  const kelvin=(temperature?302:288.15)-.0065*Math.min(heightKm*1000,11000);
  return {density,kelvin,sound:Math.sqrt(401.8*kelvin)};
}
export function coefficients(id,mach) {
  const p=aircraft[id];
  let wave=0;
  if(mach>.95)wave=mach<1.1?p.wave_drag_increment*.5*(1+Math.sin((mach-(.95+1.1)*.5)*nativePi/(1.1-.95))):p.wave_drag_increment;
  let slope=1.78;
  if(id==='ef')slope=Math.min(2.66+.469*mach,5.82-1.8*mach);
  if(id==='f22'){
    slope=2.88+.64*mach*mach;
    const linear=.75+3.75*mach;
    if(slope<linear){
      slope=linear;
      const secondary=4.5+(mach-1)*.15225*(1/.07);
      if(linear>secondary){
        slope=secondary;
        const high=2+(mach-2.1)*2.5*(mach-2.1);
        if(secondary>high)slope=high;
      }
    }
  }
  if(id!=='f117')slope*=1+p.additional_lifting_area/p.wing_area;
  return {slope,wave,drag:p.base_drag+wave};
}
export function liftSample({id='ef',speed=120,height=0,alpha=10,failed=false}) {
  const p=aircraft[id],air=atmosphere(height),c=coefficients(id,speed/air.sound);
  const mass=p.empty_mass_kg+p.fuel_capacity, q=.5*air.density*speed*speed;
  const flap=id==='f117'||failed?0:clamp((mass*9.81/(q*p.wing_area)-p.zero_lift)/(p.flap_lift_gradient*p.maximum_flap_angle),0,1);
  const offset=p.zero_lift+p.flap_lift_gradient*flap*p.maximum_flap_angle;
  const limit=p.maximum_lift+p.flap_limit_gradient*flap*p.maximum_flap_angle;
  const a=radians(alpha);let wing=c.slope*a+offset,leading=0,stalled=id==='f117'&&a>p.critical_angle;
  if(wing>limit){
    if(id==='f117')wing=limit;
    else{
      const span=p.automatic_flap_gradient*p.maximum_automatic_flap_angle;
      leading=(wing-limit)/span;
      if(leading>1){leading=1;wing=limit+span;stalled=true;}
      if(leading!==0&&failed){leading=0;wing=limit;stalled=true;}
    }
  }
  wing=Math.max(-limit,wing);
  // Neutral elevator. Native adds alpha again after the limited wing term.
  const coefficient=wing+a, lift=q*p.wing_area*coefficient;
  return {flap,leading,wing,limit,coefficient,lift,mass,q,stalled,drag:q*p.wing_area*(c.drag+p.induced_drag*coefficient*coefficient)};
}
export function thrustSample({id='ef',height=0,throttle=1,afterburner=0,engines=2}) {
  const p=aircraft[id],stage=Math.min(afterburner,p.afterburner_stages);
  const t=Math.fround(stage?1:throttle);
  const reheat=p.afterburner_stages?stage*p.afterburner_thrust/p.afterburner_stages:0;
  const thrust=Math.max(0,Math.max(0,(t-.6)*2.5*p.dry_thrust+reheat)*(1-(height/p.ceiling_km)**2))*engines/2;
  return {thrust,stage,throttle:t,weight:(p.empty_mass_kg+p.fuel_capacity)*9.81};
}
export function wheelSample({id='ef',compression=.12,sink=2}) {
  const p=aircraft[id];
  const failed=sink>p.maximum_sink_speed*1.8,damaged=sink>p.maximum_sink_speed*1.4;
  return {reaction:p.spring_stiffness*compression+(failed?.5:1)*p.damping*sink,weightPerWheel:(p.empty_mass_kg+p.fuel_capacity)*9.81/3,
    condition:failed?'Failed':damaged?'Damaged':'Within sink limit'};
}
