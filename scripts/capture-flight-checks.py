#!/usr/bin/env python3
"""Capture numerical examples from TFX 2.05 for the public flight diagrams.

Run with the tfx-cpp native-reference Python environment. No original bytes are
copied into the fixture. See content/flight-sources.md for the test conditions.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--cpp', type=Path, default=Path('../tfx-cpp'))
p.add_argument('--game', type=Path, default=Path('../tfx-reverse/installs/cd_1994_09/TFX/TFX.DAT'))
a = p.parse_args()
sys.path.insert(0, str(a.cpp.resolve() / 'tools'))
from native_reference import NativeReference
from native_x87 import hardware_sine_cosine, hardware_tangent

assert hashlib.sha256(a.game.read_bytes()).hexdigest() == '2cc41a39fa95a2c9fd883c4220d7bdd9cca00c543c89b019eb270763f59d1d9a'
result = {'reference': 'TFX 2.05 CD, September 1994', 'cases': []}
def save(kind, inputs, expected):
    result['cases'].append({'kind': kind, 'input': inputs, 'expected': expected})
for index, name in enumerate(['ef', 'f117', 'f22']):
    im = NativeReference(a.game)
    im.call(0xde851)
    libraries = [hardware_tangent(im, a.cpp / 'build'), hardware_sine_cosine(im, a.cpp / 'build')]
    im.write(0x11b2a, '<H', index)
    im.write(0x1345e, '<9h', 32767, 0, 0, 0, 32767, 0, 0, 0, 32767)
    im.write(0x13444, '<i', 400)
    im.write(0x1347a, '<B', 1)
    im.write(0x13428, '<f', -800)
    im.call(0x95f3c, limit=2000000)
    read = lambda offset: im.read(offset, '<d')[0]
    for mach in [0, .8, .95, 1, 1.05, 1.1, 1.2, 1.4, 1.6, 2.1, 2.5, 3]:
        im.write(0x14778, '<d', mach)
        im.call(0x99bc0)
        save('coefficients', {'id': name, 'mach': mach}, {'slope': read(0x14420), 'wave': read(0x14688), 'drag': read(0x14160)})
    for speed, height in [(60, 0), (120, 0), (250, 7), (350, 15)]:
        density = 1.225 * (20 - height) / (20 + height)
        if height > 10:
            density = max(.088, density + .00088 * (height - 10)**2)
        q = .5 * density * speed**2
        sound = math.sqrt(401.8 * (288.15 - .0065 * min(height * 1000, 11000)))
        im.write(0x14778, '<d', speed / sound)
        im.call(0x99bc0)
        for failed in [False, True]:
            # Isolate the surface routine with the weight-support flap demand
            # from the manual controller, neutral elevator and fresh LE state.
            flap = 0 if index == 1 or failed else max(0, min(1, ((read(0x14220) + read(0x14850)) * 9.81 / (q * read(0x147a0)) - read(0x14248)) / (read(0x141e0) * read(0x14088))))
            for alpha in [-12, 0, 10, 25, 42, 50]:
                for offset, val in [(0x14418, alpha*3.14159/180), (0x14700,speed), (0x14438,density), (0x143d8,q), (0x14728,flap), (0x146d8,0), (0x145a8,0), (0x148a0,0), (0x14788,0), (0x14410,0), (0x14510,0), (0x14508,0), (0x14720,0)]:
                    im.write(offset, '<d', val)
                im.write(0x14964, '<H', 0)
                im.write(0x7d71, '<B', 11 if failed else 2)
                im.call(0x9c7f0)
                save('lift', {'id':name,'speed':speed,'height':height,'alpha':alpha,'failed':failed}, {'flap':flap,'leading':read(0x14720),'wing':read(0x13fd0),'limit':read(0x14400),'coefficient':read(0x143c0),'lift':read(0x14428),'drag':read(0x14408),'stalled':bool(im.read(0x13474,'<H')[0])})
    for height in [0, 10, 20.3, 24]:
        for throttle, afterburner in [(0,0),(.6,0),(.8,0),(1,0),(1,1),(1,4)]:
            if index == 1 and afterburner:
                continue
            for engines in [0, 1, 2]:
                im.write(0x133f8,'<f',throttle)
                im.write(0x14060,'<d',height)
                im.write(0x14880,'<2d',float(engines>0),float(engines>1))
                im.write(0x14838,'<2d',0,0)
                im.write(0x1496d,'<B',afterburner)
                im.call(0x9cc54)
                save('thrust', {'id':name,'height':height,'throttle':throttle,'afterburner':afterburner,'engines':engines}, {'thrust':read(0x14878)})
    im.intercept(0x953b8, 'Ignore only delivery of failed-gear impact notification', lambda image: image.return_from())
    for compression in [.01, .12, .3]:
        limit = read(0x14568)
        for sink in [-1, 0, 2, limit*1.4, limit*1.4+.001, limit*1.8, limit*1.8+.001, 10]:
            for offset, fmt, value in [(0x14950,'H',1),(0xabea,'B',1),(0x8e23,'B',1),(0x8d38,'H',0),(0x8f31,'B',0),(0xe75e,'H',0),(0x146b0,'d',0),(0x7d7a,'B',2),(0x7d74,'B',2),(0xabf2,'h',0),(0x1494e,'h',32767),(0x12c04,'h',0)]:
                im.write(offset,'<'+fmt,value)
            for offset in [0x13ea0,0x145f0,0x145b0,0x144d8,0x14660,0x14648]:
                im.write(offset,'<3d',0,0,0)
            for offset in [0x13d50,0x14578,0x14678,0x13ec0,0x14580,0x146a8,0x14590,0x14598,0x14518,0x8e18]:
                im.write(offset,'<d',0)
            nose = im.read(0x13ed0,'<3d')
            im.write(0x13ee8,'<3d',*nose)
            im.write(0x14758,'<3d',0,0,-nose[2]+compression)
            im.write(0x147a8,'<3d',0,0,sink)
            im.write(0x14820,'<3d',0,0,sink)
            im.write(0x14508,'<2d',0,0)
            im.write(0x14320,'<d',read(0x14220)+read(0x14850))
            for offsets, values in [((0x148c0,0x148d8,0x14860),(1,0,0)),((0x148c8,0x148e0,0x14868),(0,1,0)),((0x148d0,0x148e8,0x14870),(0,0,1))]:
                for offset,value in zip(offsets,values):im.write(offset,'<d',value)
            im.call(0x9d734)
            gear = im.read(0x7d7a,'<B')[0]
            save('wheel', {'id':name,'compression':compression,'sink':sink}, {'reaction':-im.read(0x14660,'<3d')[2], 'condition':{2:'Within sink limit',14:'Damaged',11:'Failed'}[gear]})
output = Path(__file__).resolve().parents[1] / 'content/flight-native-checks.json'
output.write_text(json.dumps(result, separators=(',',':'))+'\n')
print(f'Captured {len(result["cases"])} original-code examples -> {output}')
