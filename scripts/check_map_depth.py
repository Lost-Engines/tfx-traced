#!/usr/bin/env python3
"""Read back actual WebGL pixels to check coplanar ordering and occlusion.

Requires Playwright and Chromium. Pass the map-viewer URL from either site.
"""
import argparse
from playwright.sync_api import sync_playwright


def check_depth(page):
    result = page.evaluate(r"""() => {
 const require=(ok,message)=>{if(!ok)throw Error(message);};
 require(gl,'WebGL 2 is unavailable');
 // Repeated renders must not resize the element through its border/intrinsic
 // aspect ratio. Keep the unmodified responsive layout for this first check.
 render();const size=[canvas.width,canvas.height,canvas.clientWidth,canvas.clientHeight];
 for(let i=0;i<12;i++){yaw+=.1;render();}
 require(JSON.stringify(size)===JSON.stringify([canvas.width,canvas.height,canvas.clientWidth,canvas.clientHeight]),'Canvas grows during rotation');
 canvas.style.width='640px';canvas.style.height='400px';
 const original=TFXScenery.assemble,scene=original(environment,136,114,3,{status:128});
 const capture=()=>{
  render();const pixels=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  require(gl.getError()===gl.NO_ERROR,'WebGL draw/readback error');return pixels;
 };
 const differences=(a,b)=>{require(a.length===b.length,'Readback sizes differ');let count=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])count++;return count;};
 const install=(faces,lines=[],points=[])=>{
  TFXScenery.assemble=()=>({faces,lines,points,collisions:[],warnings:[],cells:1});rebuild();
 };
 const face=(vertices,colour)=>({vertices,colour});
 let coplanarCases=0,occlusionCases=0;
 const rotations=[0,.3,.6,1,1.5,2,3,-.8];
 // Real overlapping city ground polygons must exactly match painter ordering
 // when there are no raised objects to occlude them. Old interpolation failed
 // by thousands of pixels depending on the viewing angle.
 const ground=scene.faces.filter(f=>f.inspection||f.vertices.every(v=>v[1]===0));
 const base=[[-2,0,-2],[2,0,-2],[2,0,2],[-2,0,2]];
 const inset=[[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1]];
 const palettes=TFX_DATA.palettes[el('palette').value];
 require(JSON.stringify(palettes[32])!==JSON.stringify(palettes[192]),'Fixture colours must differ');
 const shapes=[ground];
 // Coplanar overlays with unrelated vertices, opposite winding and slopes.
 for(const lift of [(x,z)=>-.2,(x,z)=>x*.125+z*.25-.2]){
  const place=v=>[v[0],lift(v[0],v[2]),v[2]];
  shapes.push([face(base.map(place),32),face(inset.map(place).reverse(),192)]);
 }
 for(const faces of shapes){install(faces);for(const angle of rotations)for(const tilt of [.15,.6,1.2]){
  yaw=angle;pitch=tilt;distance=6;
  gl.enable(gl.DEPTH_TEST);const actual=capture();gl.disable(gl.DEPTH_TEST);const expected=capture();
  require(differences(actual,expected)===0,`Coplanar disagreement at yaw ${angle}, pitch ${tilt}`);coplanarCases++;
 }}
 gl.enable(gl.DEPTH_TEST);
 // Nearby parallel surfaces, including a tiny separation far from the camera,
 // must remain correctly occluded regardless of submission order.
 for(const [gap,zoom]of [[.2,6],[1/2048,40]])for(const angle of rotations){
  yaw=angle;pitch=.7;distance=zoom;
  const near=face(base.map(v=>[v[0],-gap,v[2]]),192),far=face(base,32);
  install([near,far]);const a=capture();install([far,near]);const b=capture();
  require(differences(a,b)===0,'Non-coplanar occlusion depends on draw order');occlusionCases++;
 }
 // Points and lines must still disappear behind an opaque roof. The point on
 // the roof must remain visible with the existing small light-sprite allowance.
 yaw=.6;pitch=.7;distance=6;
 const roof=face(base.map(v=>[v[0],-.3,v[2]]),32);
 install([roof]);const plain=capture();
 const line={vertices:[[-.2,.2,0],[.2,.2,0]],colour:192};
 install([roof],[line],[{vertex:[0,.2,0],colour:192,pixelSize:2}]);
 require(differences(plain,capture())===0,'Line or light shines through roof');
 install([roof],[],[{vertex:[0,-.3,0],colour:192,pixelSize:2}]);
 require(differences(plain,capture())>0,'Coplanar light disappears');
 TFXScenery.assemble=original;
 return {coplanarCases,occlusionCases,depthBits:gl.getParameter(gl.DEPTH_BITS),hiddenLinesAndLights:'passed',stableCanvas:'passed'};
}""")
    print('Map depth checks passed:', result, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:4186/analysis/maps/index.html?lighting=yugos_n#yugoslav/136/114')
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--mute-audio', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width':1440, 'height':1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(args.url, wait_until='load')
        check_depth(page)
        assert not errors, errors
        browser.close()
