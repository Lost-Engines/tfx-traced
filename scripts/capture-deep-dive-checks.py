#!/usr/bin/env python3
"""Capture article examples from TFX 2.05 without writing an installation.

FINISH receives declared completed/kill counts. The recording compressor writes
to memory at its file callback. Output contains only inputs and numerical results.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--cpp', type=Path, required=True)
p.add_argument('--research', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
sys.path.insert(0, str(a.cpp.resolve() / 'tools'))
from check_rules import ResultCapture, KEYS
from native_reference import NativeReference, REFERENCE_SHA256, r

install = a.research.resolve() / 'installs/cd_1994_09/TFX'
catalog = json.loads((a.research / 'analysis/resources/catalog.json').read_text())
entry = next(e for e in catalog['entries'] if e['identifier'] == '9558dca3')
source = (a.research / 'extracted/cd_1994_09/resources' / entry['path']).read_bytes()
capture = ResultCapture(install / 'TFX.DAT', source)
campaign, requests, expected = [], [], []
for completed in (0, 1):
    for kills in range(12):
        state = [0, 0, 0, kills, 0, completed, 0, 0, 0, 0, 0, 0]
        variables = [0] * len(KEYS)
        result = capture.run(state, variables)
        expected.append(result)
        requests.append(' '.join(map(str, ['miss605', *state, *variables])))
        campaign.append(dict(completed=completed, kills=kills, result=result[4],
                             bonus=result[5], missions=result[2]))
probe = subprocess.run([str((a.cpp / 'build/rules_probe').resolve()), str(install)],
    input='\n'.join(requests) + '\n', text=True, capture_output=True, check=True)
assert [json.loads(line) for line in probe.stdout.splitlines()] == expected

im = NativeReference(install / 'TFX.DAT')
im.cpu.mem_map(0x300000, 0x10000)
output = bytearray()
def write(current):
    size = current.cpu.reg_read(r.UC_X86_REG_EDX)
    output.extend(current.cpu.mem_read(current.cpu.reg_read(r.UC_X86_REG_EAX), size))
    current.cpu.reg_write(r.UC_X86_REG_EAX, size)
    current.return_from()
im.intercept(0xc8ff0, 'Capture compressed field bytes in memory at file-write callback', write)
im.write(0x20cdc, '<I', im.native(0xc8ff0))
packing = []
for name, fill, values in [
    ('Sparse parameters', 0, [0,0,0,7,8,0,0]),
    ('Default scales', 1, [1,1,1,1,1,1,1,1]),
    ('Alternating bytes', 0, [0,7,0,7,0,7,0,7]),
    ('A 256-byte run', 0, [0] * 256),
    ('Empty field', 0, []),
]:
    output.clear()
    if values: im.cpu.mem_write(0x300000, bytes(values))
    im.call(0xc5958, eax=fill, edx=0x300000, ebx=len(values))
    packing.append(dict(name=name, fill=fill, input=values, encoded=list(output)))

report = dict(reference_sha256=REFERENCE_SHA256,
              cpp_commit=subprocess.check_output(['git','-C',str(a.cpp),'rev-parse','HEAD'],text=True).strip(),
              scope=__doc__, campaign=campaign, packing=packing)
a.output.parent.mkdir(parents=True, exist_ok=True)
a.output.write_text(json.dumps(report, indent=2) + '\n')
print(f'{len(campaign)} mission results agree with original code and C++; {len(packing)} original compressed fields captured.')
