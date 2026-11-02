// Rebuild the article figures using the same equations as its interactive exhibits.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {drawLift,drawThrust,drawWheel,drawMach,drawControls,drawForces,drawContacts} from '../src/flight-draw.js';
const directory=fileURLToPath(new URL('../public/images/flight/',import.meta.url));
await fs.mkdir(directory,{recursive:true});
for(const [name,draw] of Object.entries({lift:drawLift,thrust:drawThrust,wheel:drawWheel,mach:drawMach,controls:drawControls,forces:drawForces,contacts:drawContacts})){
 for(const width of [720,360])await fs.writeFile(`${directory}/${name}${width===360?'-small':''}.svg`,draw(width)+'\n');
}
console.log('Wrote seven flight diagrams, each with a compact layout.');
