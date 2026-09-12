// Isolated, deterministic simulated-time captures of the real application.
// Only the test browser's rAF scheduler changes; production physics/rendering do not.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.DEMO_URL || 'http://127.0.0.1:4176';
const folder = resolve(process.env.QA_OUTPUT_DIR || 'build/evidence/course-passage');
const label = process.env.QA_LABEL || 'course-passage';
assert.match(label, /^[\w-]+$/);
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
const changes = execFileSync('git', ['status', '--porcelain'], { encoding:'utf8' }).trim();
if (process.env.REQUIRE_CLEAN === '1') assert.equal(changes, '', 'final capture requires clean source');
const landmarks = JSON.parse(process.env.COURSE_LANDMARKS || '[]');
assert.ok(Array.isArray(landmarks));
for (const landmark of landmarks) assert.ok(typeof landmark.name === 'string' && Number.isFinite(landmark.x));
await mkdir(folder, { recursive:true });
const sourceFiles = ['src/sceneSources/course.ts','src/controls/simulation.ts','src/rendering/RelativityRenderer.ts','src/rendering/shaders.ts','src/ui/App.tsx','src/ui/style.css'];
const sourceHashes = {};
for (const name of sourceFiles) sourceHashes[name] = createHash('sha256').update(await readFile(name)).digest('hex');
const report = { sourceRevision:revision, sourceChanges:changes, sourceHashes, checkedAt:new Date().toISOString(), url:origin,
  kind:'Real app rendered at deterministic simulated times; not a realtime frame-rate measurement',
  scheduling:'Test-only injected rAF queue supplies exact timestamps to the existing FrameClock and render loop. No production debug hook or numerical override.',
  frames:[], checks:[], pageErrors:[], consoleErrors:[], failedRequests:[], blockedStatus:[], providerAttempts:[], externalRequests:[] };
const browser = await chromium.launch({ headless:true, chromiumSandbox:true,
  executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const near = (a,b,tolerance,name) => assert.ok(Math.abs(a-b) <= tolerance, `${name}: ${a} vs ${b}`);
const check = (name,detail) => { report.checks.push({name,detail}); console.log('PASS '+name); };
let page;
const state = () => page.evaluate(() => {
  const get = id => document.querySelector(`[data-testid="${id}"]`);
  return { beta:Number(get('beta').dataset.beta), position:Number(get('distance').dataset.position),
    lab:Number(get('lab-time').dataset.seconds), proper:Number(get('proper-time').dataset.seconds),
    burstTime:get('burst-phase').dataset.burstTime === '' ? null : Number(get('burst-phase').dataset.burstTime),
    phase:get('burst-phase').dataset.phase, baseline:get('optical-baseline').getAttribute('aria-pressed') === 'true',
    view:get('view-label').textContent, running:document.querySelector('#run-pause').textContent.includes('Pause'),
    length:Number(get('length').textContent), gamma:Number(get('gamma').textContent),
    schedulerMs:window.__courseCapture.now() };
});
// Dispatch the real button handler without waiting for automatic rAF stability;
// this browser intentionally has no automatically advancing animation frames.
const click = locator => locator.dispatchEvent('click');
async function slowPreset() {
  await page.getByRole('slider').evaluate(element => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(element,'0.1');
    element.dispatchEvent(new Event('input',{bubbles:true})); element.dispatchEvent(new Event('change',{bubbles:true}));
  });
}
async function renderAt(milliseconds) {
  await page.evaluate(value => window.__courseCapture.frameAt(value), milliseconds);
  // React commits asynchronously after the actual app frame callback. A real
  // event-loop task lets it finish; this does not advance simulated time.
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve,0)));
}
async function advanceTo(milliseconds) {
  let now = await page.evaluate(() => window.__courseCapture.now());
  while (milliseconds-now > 1e-7) {
    now = Math.min(milliseconds,now+1000/60);
    await renderAt(now);
  }
  await renderAt(milliseconds);
}
async function capture(name,targetSeconds) {
  const snapshot = await state();
  const path = resolve(folder,`${label}-${name}.png`);
  await page.screenshot({ path, animations:'allow' });
  const scenePath = resolve(folder,`${label}-${name}-scene.png`);
  const raw=await page.evaluate(() => {
    window.__courseCapture.frameAt(window.__courseCapture.now());
    const source=document.querySelector('#universe'),copy=document.createElement('canvas');
    copy.width=source.width;copy.height=source.height;const context=copy.getContext('2d');context.drawImage(source,0,0);
    const pixels=context.getImageData(0,0,copy.width,copy.height).data;
    return {png:copy.toDataURL('image/png'),hasLight:pixels.some((value,index)=>index%4!==3&&value>40)};
  });
  assert.ok(raw.hasLight,'actual WebGL scene must not be blank');
  await writeFile(scenePath,Buffer.from(raw.png.split(',')[1],'base64'));
  const frame = { name,targetSeconds,...snapshot,path,scenePath,
    landmarks:landmarks.map(item => ({...item,labOffset:item.x-snapshot.position,passed:snapshot.position>item.x})) };
  report.frames.push(frame); return frame;
}
try {
  page = await browser.newPage({ viewport:{width:1440,height:900},deviceScaleFactor:1 });
  page.on('pageerror',e => report.pageErrors.push(e.message));
  page.on('console',e => { if(e.type()==='error') report.consoleErrors.push(e.text()); });
  page.on('requestfailed',r => report.failedRequests.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
  await page.route('**/*',route => {
    const r=route.request(),u=new URL(r.url());
    if(u.origin!==new URL(origin).origin){report.externalRequests.push(u.origin+u.pathname);return route.abort();}
    if(u.pathname.startsWith('/api/')){
      (r.method()==='GET'?report.blockedStatus:report.providerAttempts).push({path:u.pathname,method:r.method()});return route.abort();
    }
    return route.continue();
  });
  await page.addInitScript(() => {
    let now=0, next=1; const pending=new Map();
    window.requestAnimationFrame=callback => { const id=next++;pending.set(id,callback);return id; };
    window.cancelAnimationFrame=id => pending.delete(id);
    window.__courseCapture={now:()=>now, pending:()=>pending.size, frameAt:milliseconds=>{
      if(!Number.isFinite(milliseconds)||milliseconds<now)throw new Error('Capture time must advance monotonically');
      now=milliseconds;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(callback=>callback(now));
    }};
  });
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('.connection')?.textContent.includes('Physics: local / offline ready'),null,{polling:25});
  await renderAt(0);
  await click(page.getByRole('button',{name:/Reset/})); await renderAt(0);
  await slowPreset();
  await click(page.getByRole('button',{name:/ENGAGE RELATIVITY/i})); await renderAt(0);
  const initial=await state(); near(initial.lab,0,1e-6,'reset initial lab time');
  await capture('t0',0);
  for(const target of [1,1.5,2.5,3.5,4,5,7]){
    await advanceTo(target*1000);
    const frame=await capture('t'+String(target).replace('.','-'),target);
    near(frame.lab-initial.lab,target,1e-6,'exact simulated capture time');
    assert.ok(frame.proper<=frame.lab+1e-6 && frame.position>=initial.position);
    assert.ok(Number.isFinite(frame.beta)&&frame.beta>=0&&frame.beta<=.99900001);
  }
  check('Exact simulated frames at0,1,1.5,2.5,3.5,4,5and7seconds',report.frames.map(({name,lab,beta,position,phase})=>({name,lab,beta,position,phase})));
  for(let i=1;i<report.frames.length;i++)assert.ok(report.frames[i].position>report.frames[i-1].position,'observer must advance through stationary geometry');
  check('Observer position advances across the captured course');
  if(landmarks.length){
    const crossed=landmarks.filter(item=>initial.position<item.x&&report.frames.at(-1).position>item.x);
    assert.ok(crossed.length>0,'captured journey must pass a declared stationary landmark');check('Fixed lab landmarks crossed',crossed);
  }
  // Re-run to the same exact high-speed moment; no imperative physics access.
  await click(page.getByRole('button',{name:/Reset/})); await renderAt(7000);
  await slowPreset();
  await click(page.getByRole('button',{name:/ENGAGE RELATIVITY/i})); await renderAt(7000);
  await advanceTo(9500);
  await click(page.locator('#run-pause')); await renderAt(9500);
  const optical=await capture('same-time-optics',2.5);
  await click(page.getByTestId('optical-baseline')); await renderAt(9500);
  const baseline=await capture('same-time-baseline',2.5);
  const physical=({lab,proper,position,beta,gamma,length,view,running})=>({lab,proper,position,beta,gamma,length,view,running});
  assert.deepEqual(physical(optical),physical(baseline));assert.equal(baseline.baseline,true);
  assert.notDeepEqual(await readFile(optical.scenePath),await readFile(baseline.scenePath),'same-state photon comparison must change the actual rendered scene');
  check('Same-time baseline preserves position,clocks,camera and measured length',{optical:physical(optical),baseline:physical(baseline)});
  await click(page.getByRole('button',{name:'Rear',exact:true})); await renderAt(9500);await capture('same-time-rear-baseline',2.5);
  await click(page.getByTestId('optical-baseline')); await renderAt(9500);await capture('same-time-rear-optics',2.5);
  await click(page.getByRole('button',{name:/Reset/}));await renderAt(9500);
  await click(page.getByRole('button',{name:'0.999c',exact:true}));await click(page.locator('#run-pause'));await renderAt(9500);
  const constantStartMs=9500+3000/.999;await advanceTo(constantStartMs);
  const constantStart=await state();near(constantStart.position,3,1e-9,'constant-speed anchor x=3');
  const constant=[];
  for(const elapsed of [0,.5,1,2]){
    await advanceTo(constantStartMs+elapsed*1000);const sample=await state();
    near(sample.position,3+.999*elapsed,1e-9,'dx=beta*c*dt at constant.999');
    near(sample.lab-constantStart.lab,elapsed,1e-6,'constant segment lab time');
    constant.push({elapsed,...sample});
  }
  check('Constant0.999 segment atx3 gives3,3.4995,3.999,4.998',constant);
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.providerAttempts,[]);
  assert.ok(report.failedRequests.every(r=>report.blockedStatus.some(s=>s.path===r.path)));
  assert.ok(report.consoleErrors.every(e=>e==='Failed to load resource: net::ERR_FAILED'));
  for(const name of sourceFiles)assert.equal(createHash('sha256').update(await readFile(name)).digest('hex'),sourceHashes[name],'source changed during capture');
  if(process.env.REQUIRE_CLEAN==='1'){
    assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'');
    assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),revision);
  }
  report.passed=true;
}catch(error){report.failure=error.message;throw error;}
finally{await browser.close();await writeFile(resolve(folder,label+'.json'),JSON.stringify(report,null,2));}
