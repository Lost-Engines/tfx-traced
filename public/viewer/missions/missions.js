/* Shared mission navigation for the offline maps and waypoint viewers. */
(function(root){
 'use strict';
 const groups=TFX_MISSIONS.groups,byGroup=new Map(groups.map((g,i)=>[g.id,{...g,index:i}]));
 const records=new Map(TFX_MISSIONS.missions.map(m=>[m.id,m]));
 const programs=new Map(TFX_MISSIONS.programs.map(p=>[p.id,p.mission_ids]));
 const categories=[['training','Training'],['flashpoints','Flashpoints'],['tour','Tour of Duty'],['arcade','Arcade'],['simulator','Simulator']];
 const get=m=>records.get(typeof m==='string'?m:m?.id);
 function compare(a,b){const x=get(a),y=get(b);return byGroup.get(x.group).index-byGroup.get(y.group).index||(x.order??Infinity)-(y.order??Infinity)||(x.number??Infinity)-(y.number??Infinity)||x.name.localeCompare(y.name,undefined,{numeric:true});}
 function matches(m,filter){const row=get(m);return !!row&&(!filter||filter==='all'||filter==='demo'&&row.demo?.entry_path||filter==='category:'+row.category||filter==='group:'+row.group);}
 function search(m,query){const row=get(m);if(!row)return false;const text=[row.name,row.number===null?'':'Mission '+row.number,row.number,row.id,row.location,row.environment,row.craft,row.group,row.weather,byGroup.get(row.group).label,...row.briefings.map(b=>b.text),row.opening_message?.text].join(' ').toLowerCase();const normalise=value=>value.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');return text.includes(query.toLowerCase())||normalise(text).includes(normalise(query));}
 function label(m,short=false){const row=get(m);if(!row)return m.name||m.id;
  const name=row.number===null?row.name:'Mission '+row.number;
  const prefix=row.order?String(row.order).padStart(2,'0')+' · ':'';
  const detail=row.weather||(!short&&row.summary?row.summary.slice(0,66)+(row.summary.length>66?'…':''):row.location);
  return prefix+name+(detail?' · '+detail:'');
 }
 function groupSelect(select,standalone=false){
  select.replaceChildren(new Option('All modes & campaigns','all'));
  const modes=document.createElement('optgroup');modes.label='Game modes';
  modes.append(...categories.map(([id,name])=>new Option(name,'category:'+id)));select.append(modes);
  const campaigns=document.createElement('optgroup');campaigns.label='Campaigns & simulator locations';
  campaigns.append(...groups.filter(g=>['flashpoints','tour','simulator'].includes(g.category)).map(g=>new Option(g.label,'group:'+g.id)));select.append(campaigns);
  select.append(new Option('PC Plus demo · linked flow','demo'),new Option('Other retained mission scripts','group:retained'));
  if(standalone)select.append(new Option('Standalone / unlinked waypoint programs','standalone'));
 }
 function missionOptions(select,rows,empty='No mission overlay'){
  const sorted=[...rows].sort(compare);select.replaceChildren(new Option(empty,''));
  for(const group of groups){const items=sorted.filter(m=>get(m).group===group.id);if(!items.length)continue;
   const optgroup=document.createElement('optgroup');optgroup.label=group.label+' ('+items.length+')';
   optgroup.append(...items.map(m=>new Option(label(m),m.id)));select.append(optgroup);
  }
 }
 function programMissions(program,filter='all'){return (programs.get(program.id)||[]).map(id=>records.get(id)).filter(m=>matches(m,filter)).sort(compare);}
 function programLabel(program,filter='all'){
  const rows=programMissions(program,filter);
  return rows.length?label(rows[0])+(rows.length>1?` (+${rows.length-1} related scripts)`:''):(program.names[0]||program.id);
 }
 function programOptions(select,rows,filter='all'){
  select.replaceChildren();const ordered=[...rows].sort((a,b)=>{const x=programMissions(a,filter)[0],y=programMissions(b,filter)[0];return x&&y?compare(x,y):x?-1:y?1:(a.names[0]||a.id).localeCompare(b.names[0]||b.id,undefined,{numeric:true});});
  for(const group of [...groups,{id:'standalone',label:'Standalone / unlinked waypoint programs'}]){
   const items=ordered.filter(p=>(programMissions(p,filter)[0]?.group||'standalone')===group.id);if(!items.length)continue;
   const optgroup=document.createElement('optgroup');optgroup.label=group.label+' ('+items.length+')';
   optgroup.append(...items.map(p=>new Option(programLabel(p,filter),p.id)));select.append(optgroup);
  }
 }
 function card(container,mission){
  const row=get(mission);container.replaceChildren();container.hidden=!row;if(!row)return;
  const group=byGroup.get(row.group),heading=document.createElement('h2'),meta=document.createElement('p'),links=document.createElement('div');
  heading.textContent=group.label+(row.order?` — ${group.unit} ${row.order} of ${row.total}`:'');
  meta.className='muted';meta.textContent=[row.number===null?row.name:'Mission '+row.number,row.location,row.craft||'Aircraft not specified',row.weather,row.environment].filter(Boolean).join(' · ');
  container.append(heading,meta);
  if(row.summary){const synopsis=document.createElement('p');synopsis.className='mission-synopsis';synopsis.textContent=row.summary.slice(0,200)+(row.summary.length>200?'…':'');container.append(synopsis);}
  const context=document.createElement('p');context.className='muted';context.textContent=(row.demo?(row.demo.entry_path?`PC Plus demo: ${row.demo.unit.toLowerCase()} ${row.demo.order} of ${row.demo.total}. `:'Retained in the PC Plus demo graph, without a path from its entry function. '):'')+(row.category==='simulator'?'Alternative weather configuration.':row.category==='retained'?'No explicit retail-flow launch reference found.':'');if(context.textContent)container.append(context);
  links.className='toolbar';
  function link(text,url,parent=links){const a=document.createElement('a');a.textContent=text;a.href=url;parent.append(a);return a;}
  if(row.briefings.length){
   const details=document.createElement('details'),summary=document.createElement('summary'),toolbar=document.createElement('div'),select=document.createElement('select'),text=document.createElement('pre'),source=document.createElement('a');
   summary.textContent='Full briefing / pre-mission text';toolbar.className='toolbar';text.className='mission-briefing';
   for(const b of row.briefings)select.append(new Option(b.language[0].toUpperCase()+b.language.slice(1),b.language));
   select.setAttribute('aria-label','Briefing language');select.value=row.briefings.some(b=>b.language==='english')?'english':row.briefings[0].language;
   const show=()=>{const b=row.briefings.find(b=>b.language===select.value);text.textContent=b.text.replaceAll('%pilotname','[pilot name]').replaceAll('%callsign','[callsign]').replaceAll('%score','[score]');source.textContent=b.source_label;source.hidden=true;};
   select.onchange=show;toolbar.append(select,source);details.append(summary,toolbar,text);container.append(details);show();
  }else{const note=document.createElement('p');note.className='muted';note.textContent='No separate briefing text linked to this mission. Its script and planning/waypoint data remain available.';container.append(note);}
  if(row.opening_message){const details=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('pre');summary.textContent=`First scripted radio message · ${row.opening_message.seconds} seconds`;text.textContent=row.opening_message.text;text.className='mission-briefing';details.append(summary,text);container.append(details);}
 }
 root.TFXMissions={get,groups,compare,matches,search,label,groupSelect,missionOptions,programMissions,programLabel,programOptions,card};
})(globalThis);
