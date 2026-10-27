#!/usr/bin/env python3
"""Check the public exhibits in Chromium; run against a local or deployed base URL.

Requires Python Playwright and system Chromium. No research tree or game install.
"""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--base',default='http://127.0.0.1:4185/tfx-traced/')
p.add_argument('--screenshots',type=Path)
a=p.parse_args();base=a.base.rstrip('/')+'/'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--mute-audio','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 errors=[]
 def open_page(name,width=1440):
  page=b.new_page(viewport={'width':width,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
  response=page.goto(base+name,wait_until='load');assert response.status==200,(name,response.status)
  return page
 def boundary(page):
  assert page.locator('a[download]').count()==0
  hrefs=page.locator('a[href]').evaluate_all('(links)=>links.map(a=>a.getAttribute("href"))')
  assert not any('extracted/'in h or h.endswith(('.obj','.mtl','.bin','.dat','.rom','.zip'))for h in hrefs),hrefs
 page=open_page('models/')
 assert 'F-22' in page.locator('#summary').inner_text()
 page.locator('#search').fill('ian1');page.wait_for_timeout(200)
 assert 'ian1' in page.locator('#summary').inner_text()
 page.locator('#parameter-value').fill('18');page.locator('#parameter-value').dispatch_event('change')
 assert page.evaluate('parameters[0]')==18
 page.locator('#parameter-play').click();page.wait_for_timeout(600)
 assert page.evaluate('parameters[0]')==19
 page.locator('#search').fill('ss1_scud');page.wait_for_timeout(150)
 assert int(page.locator('#parameter-value').get_attribute('max'))==36
 page.locator('#parameter-play').click();page.wait_for_timeout(600)
 assert page.evaluate('parameters[0]')>0
 page.locator('#search').fill('bridge5a');page.wait_for_timeout(100)
 page.locator('#parameter').select_option('7')
 assert page.locator('#parameter-toggle-control').is_visible()
 page.locator('#parameter-toggle').check();assert page.evaluate('parameters[7]')>0
 page.locator('#search').fill('');page.locator('#group').select_option('aircraft')
 assert page.locator('#model option').count()>20
 page.locator('#next').click();page.locator('#previous').click()
 page.locator('#paging').uncheck();assert page.locator('#page-controls').is_hidden()
 page.locator('#palette').select_option('libya');page.locator('#edges').check()
 boundary(page)
 page.close()
 page=open_page('maps/#yugos_n/136/114')
 assert page.locator('#night-lights').is_checked()
 assert page.evaluate('totalPoints')>1000
 assert page.evaluate('gl.getError()')==0
 page.locator('#night-lights').uncheck();assert page.evaluate('totalPoints')==0
 page.locator('#night-lights').check()
 page.locator('#radius').fill('5');page.locator('#radius').dispatch_event('change')
 assert '121 cells' in page.locator('#scene-status').inner_text()
 page.locator('#map-mode').select_option('schematic')
 page.locator('#mission-group').select_option('category:training')
 assert page.locator('#mission option').count()==11
 page.locator('#mission').select_option('904ccca3')
 assert 'Hop 1 of 10' in page.locator('#mission-info').inner_text()
 page.locator('#mission-group').select_option('all')
 page.locator('#mission').select_option('9a6eb4a1')
 page.locator('#mission-info summary').filter(has_text='Full briefing').click()
 page.locator('#mission-info select').select_option('french')
 assert len(page.locator('#mission-info pre').first.inner_text())>40
 boundary(page)
 page.close()
 page=open_page('sound/')
 players=page.locator('audio');assert players.count()==4
 for i in range(4):
  duration=players.nth(i).evaluate('(a)=>new Promise((resolve,reject)=>{a.addEventListener("loadedmetadata",()=>resolve(a.duration),{once:true});a.addEventListener("error",reject,{once:true});a.load()})')
  assert abs(duration-20)<.05,duration
 boundary(page);page.close()
 for width in [390,1440]:
  for name in ['', 'story/','maps/','models/','cockpits/','sound/']:
   page=open_page(name,width)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(name,width,'horizontal overflow')
   assert page.locator('h1').count()==1
   boundary(page)
   if width==390:
    page.locator('[data-menu]').click()
    assert page.locator('#navigation').is_visible()
   if a.screenshots:
    a.screenshots.mkdir(parents=True,exist_ok=True)
    page.screenshot(path=str(a.screenshots/(('home'if not name else name.strip('/'))+f'-{width}.png')),full_page=False)
   page.close()
 assert not errors,errors
 b.close()
 print('Browser checks passed: animation, damage toggles, mission briefings, schematic maps, city lights, four audio excerpts, mobile layout and no download controls.')
