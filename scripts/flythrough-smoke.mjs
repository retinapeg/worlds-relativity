// Actual browser motion, controls and recording. No provider request can escape.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, symlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { cpus } from 'node:os';

const folder = resolve('build/evidence/flythrough');
const label = process.env.QA_LABEL || 'flythrough-dev';
assert.match(label, /^[\w-]+$/);
let origin = process.env.DEMO_URL || 'http://127.0.0.1:5173';
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
const sourceChanges = execFileSync('git', ['status', '--porcelain'], { encoding:'utf8' }).trim();
if (process.env.REQUIRE_CLEAN === '1') assert.equal(sourceChanges, '', 'final evidence requires clean source');
await mkdir(folder, { recursive:true });
const require = createRequire(import.meta.url);
const playwrightPath = process.env.PLAYWRIGHT_MODULE || 'playwright';
const ffmpeg = process.env.FFMPEG_PATH || '/opt/homebrew/bin/ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || '/opt/homebrew/bin/ffprobe';
// Use the installed encoder through a project-only cache, without a download.
if (process.env.RECORD !== '0') {
  const localRequire = createRequire(require.resolve(playwrightPath));
  const registry = JSON.parse(await readFile(resolve(dirname(localRequire.resolve('playwright-core/package.json')), 'browsers.json'), 'utf8'));
  const version = registry.browsers.find(item => item.name === 'ffmpeg').revision;
  const runtime = resolve(folder, 'recorder-runtime');
  const encoder = resolve(runtime, 'ffmpeg-' + version, 'ffmpeg-mac');
  await mkdir(dirname(encoder), { recursive:true });
  try { await symlink(ffmpeg, encoder); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  process.env.PLAYWRIGHT_BROWSERS_PATH = runtime;
}
const { chromium } = require(playwrightPath);
let isolated;
if (process.env.ISOLATED === '1') {
  const { createServer } = await import('vite');
  isolated = await createServer({ cacheDir:resolve(folder,'vite-cache'), logLevel:'error',
    server:{host:'127.0.0.1',port:0,strictPort:true,hmr:false} });
  await isolated.listen(); origin='http://127.0.0.1:'+isolated.httpServer.address().port;
}
const browser = await chromium.launch({ headless:true, chromiumSandbox:true,
  executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const report = { sourceRevision:revision, sourceChanges, checkedAt:new Date().toISOString(), url:origin,
  checks:[], pageErrors:[], consoleErrors:[], failedRequests:[], blockedStatus:[], providerAttempts:[], externalRequests:[], images:[] };
const check = (name, detail) => { report.checks.push({ name, detail }); console.log('PASS ' + name); };
const near = (a,b,tolerance,label) => assert.ok(Math.abs(a-b) <= tolerance, label + ': ' + a + ' vs ' + b);
const state = page => page.evaluate(() => {
  const get = id => document.querySelector('[data-testid="' + id + '"]');
  const phase = get('burst-phase');
  return { beta:Number(get('beta').dataset.beta ?? get('beta').textContent),
    position:Number(get('distance').dataset.position ?? get('distance').textContent),
    lab:Number(get('lab-time').dataset.seconds), proper:Number(get('proper-time').dataset.seconds),
    phase:phase?.dataset.phase ?? '', burstTime:phase?.dataset.burstTime === '' ? null : Number(phase?.dataset.burstTime),
    running:document.querySelector('#run-pause').textContent.includes('Pause'),
    baseline:get('optical-baseline').getAttribute('aria-pressed') === 'true' };
});
async function prepare(context) {
  const page = await context.newPage();
  page.on('pageerror', e => report.pageErrors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') report.consoleErrors.push(e.text()); });
  page.on('requestfailed', r => report.failedRequests.push({ path:new URL(r.url()).pathname, error:r.failure()?.errorText }));
  await page.route('**/*', route => {
    const r = route.request(), u = new URL(r.url());
    if (u.origin !== new URL(origin).origin) { report.externalRequests.push(u.origin + u.pathname); return route.abort(); }
    if (u.pathname.startsWith('/api/')) {
      (r.method() === 'GET' ? report.blockedStatus : report.providerAttempts).push({ path:u.pathname, method:r.method() });
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(origin, { waitUntil:'networkidle' });
  await page.waitForFunction(() => document.querySelector('.connection')?.textContent.includes('Physics: local / offline ready'));
  await page.getByRole('button', { name:/BURST TO 0.999c/i }).waitFor();
  await page.getByRole('button', { name:/Reset/ }).click();
  return page;
}
async function speed(page, beta) {
  const preset = page.getByRole('button', { name:beta + 'c', exact:true });
  if (await preset.count()) await preset.click();
  else await page.getByRole('slider').evaluate((element, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles:true }));
    element.dispatchEvent(new Event('change', { bubbles:true }));
  }, beta);
  near((await state(page)).beta,beta,.0011,'selected beta');
}
async function run(page, enabled) { if ((await state(page)).running !== enabled) await page.locator('#run-pause').click(); }
async function scene(page, name) {
  // Read the real WebGL colour buffer during its painted frame; HUD text cannot
  // create a motion pass. The small image is only a metric, not a substitute scene.
  const result = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
    const source = document.querySelector('#universe');
    const copy = document.createElement('canvas'); copy.width = 480; copy.height = Math.max(1,Math.round(source.height / source.width * 480));
    const context = copy.getContext('2d'); context.drawImage(source,0,0,copy.width,copy.height);
    resolve({ width:copy.width,height:copy.height,pixels:Array.from(context.getImageData(0,0,copy.width,copy.height).data),png:copy.toDataURL('image/png') });
  })));
  const filename = label + '-' + name + '.png';
  await writeFile(resolve(folder,filename), Buffer.from(result.png.split(',')[1],'base64'));
  report.images.push(filename); delete result.png;
  assert.ok(result.pixels.some((value,index) => index%4 !== 3 && value > 40), 'rendered scene is not blank');
  return result;
}
function difference(a,b) {
  assert.equal(a.pixels.length,b.pixels.length); let changed = 0, total = 0;
  for (let i=0;i<a.pixels.length;i+=4) {
    const delta = Math.abs(a.pixels[i]-b.pixels[i])+Math.abs(a.pixels[i+1]-b.pixels[i+1])+Math.abs(a.pixels[i+2]-b.pixels[i+2]);
    total += delta; if (delta > 40) changed++;
  }
  return { changedFraction:changed/(a.width*a.height), meanAbsoluteRgb:total/(a.width*a.height*3) };
}
async function burst(page, from) {
  await speed(page,from); await run(page,true); await page.waitForTimeout(300);
  const before = await state(page); await page.getByRole('button',{name:/BURST TO 0.999c/i}).click();
  const samples = []; const start = performance.now();
  do { samples.push(await state(page)); await page.waitForTimeout(70); }
  while (performance.now()-start < (from > .2 ? 4200 : 3400));
  for (const s of samples) {
    assert.ok(Number.isFinite(s.beta) && s.beta >= 0 && s.beta <= .99900001);
    assert.ok(s.lab >= before.lab && s.proper >= before.proper && s.position >= before.position);
    assert.ok(s.proper <= s.lab + 1e-6);
  }
  const phases = samples.map(s=>s.phase).filter((v,i,a)=>v && v!==a[i-1]);
  assert.deepEqual(phases,from > .2 ? ['BRAKING','ACCELERATING','COASTING','BRAKING'] : ['ACCELERATING','COASTING','BRAKING']);
  assert.ok(samples.some(s=>s.beta > .998));
  const after = await state(page); near(after.beta,.2,.0011,'finite burst recovers low speed'); assert.equal(after.phase,'');
  check('Finite burst from ' + from + 'c preserves journey and visibly changes phases', { before,after,phases,samples });
}
try {
  if (process.env.CHECKS !== '0') {
  const context = await browser.newContext({ viewport:{width:1440,height:900},deviceScaleFactor:1 });
  const page = await prepare(context);
  await speed(page,.6); await run(page,true);
  const firstState = await state(page), first = await scene(page,'motion-before');
  await page.waitForTimeout(1100);
  const second = await scene(page,'motion-after'), secondState = await state(page);
  near(secondState.position-firstState.position,.6*(secondState.lab-firstState.lab),.025,'position follows constant beta');
  const motion = difference(first,second); assert.ok(motion.changedFraction > .01,'actual nearby geometry must move across pixels');
  check('Constant-speed world translation changes actual scene pixels', { firstState,secondState,motion });
  await run(page,false); const stillA=await scene(page,'paused-a'); await page.waitForTimeout(250); const stillB=await scene(page,'paused-b');
  assert.equal(difference(stillA,stillB).changedFraction,0); check('Pause freezes the actual scene');
  await speed(page,.999); const exact = await state(page), transformed=await scene(page,'optics-on');
  await page.getByTestId('optical-baseline').click(); const baseline=await scene(page,'optics-off');
  assert.deepEqual(await state(page),{...exact,baseline:true});
  const opticalDifference=difference(transformed,baseline); assert.ok(opticalDifference.changedFraction > .01);
  await run(page,true); const baselineStart=await state(page); await page.waitForTimeout(650); const baselineEnd=await state(page);
  assert.ok(baselineEnd.position > baselineStart.position+.4); near(baselineEnd.position-baselineStart.position,.999*(baselineEnd.lab-baselineStart.lab),.025,'baseline retains flight');
  await page.getByTestId('optical-baseline').click();
  check('Same-time baseline changes rendered geometry while preserving state and subsequent translation',{exact,opticalDifference,baselineStart,baselineEnd});
  await page.getByRole('button',{name:/Reset/}).click(); await burst(page,0); await burst(page,.999);
  await page.getByRole('button',{name:/BURST TO 0.999c/i}).click(); await page.waitForTimeout(200); await run(page,false);
  const paused=await state(page); await page.waitForTimeout(350); assert.deepEqual(await state(page),paused);
  await speed(page,.6); assert.equal((await state(page)).phase,''); await run(page,true); await page.waitForTimeout(1000); near((await state(page)).beta,.6,.0011,'preset cancels burst');
  await page.getByRole('button',{name:/BURST TO 0.999c/i}).click(); await page.getByRole('slider').focus(); await page.getByRole('slider').press('Home');
  const cancelled=await state(page); assert.equal(cancelled.phase,''); near(cancelled.beta,0,.0011,'slider cancels burst');
  await page.getByRole('button',{name:/Reset/}).click(); const reset=await state(page); assert.equal(reset.position,0); assert.equal(reset.lab,0); assert.equal(reset.proper,0); assert.equal(reset.phase,''); assert.equal(reset.running,false);
  check('Pause, preset, slider and reset safely control the finite burst');
  await page.locator('#universe').focus(); await page.keyboard.down('Space'); await page.waitForTimeout(120); const held=await state(page);
  await page.keyboard.down('Space'); await page.waitForTimeout(150); await page.keyboard.up('Space'); const repeated=await state(page);
  assert.ok(repeated.burstTime > held.burstTime,'keyboard repeat must not restart burst');
  await page.getByRole('button',{name:/Reset/}).click(); await page.getByRole('slider').focus(); await page.keyboard.press('Space'); assert.equal((await state(page)).phase,'');
  check('Space triggers one burst; repeat and input focus are ignored');
  await speed(page,.999); await run(page,true); await page.waitForTimeout(300);
  const performanceSample = await page.evaluate(() => new Promise(resolve => {
    const times=[]; let start,last;
    function frame(now) { if(start===undefined)start=now; if(last!==undefined)times.push(now-last);last=now;
      if(now-start>=2500){const sorted=[...times].sort((a,b)=>a-b);resolve({elapsedMs:now-start,frames:times.length,fps:1000*times.length/(now-start),medianFrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)]});}else requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
  }));
  check('Measured actual browser animation cadence at constant 0.999c',{...performanceSample,cpu:cpus()[0]?.model,platform:process.platform,viewport:{width:1440,height:900}});
  await scene(page,'high-crossings'); assert.deepEqual(report.pageErrors,[]); await context.close();
  }

  if(process.env.RECORD !== '0') {
    const recorded = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,
      recordVideo:{dir:resolve(folder,'raw'),size:{width:1440,height:900}}});
    const view = await prepare(recorded); await speed(view,.2); await run(view,true);
    const start=performance.now(), timeline=[];
    const until=async seconds=>{const left=seconds*1000-(performance.now()-start);if(left>0)await view.waitForTimeout(left);};
    const mark=async(name)=>{const s=await state(view);timeline.push({name,elapsedSeconds:(performance.now()-start)/1000,...s});await view.screenshot({path:resolve(folder,label+'-record-'+name+'.png')});};
    await mark('slow'); await until(2); await view.getByRole('button',{name:/BURST TO 0.999c/i}).click();
    await until(2.35);await mark('accelerating');await until(3.2);await mark('coasting');await until(4.6);await mark('braking');await until(5.5);await mark('recovered');
    await until(7);await speed(view,.999);await until(8.7);await mark('passing');
    await until(9);await run(view,false);await view.getByTestId('optical-baseline').click();await until(9.5);await mark('baseline');
    await until(10.7);await view.getByTestId('optical-baseline').click();await until(11.2);await mark('restored');
    await until(12.2);await run(view,true);await until(14);await mark('continuing');
    const video=view.video();await recorded.close();const raw=await video.path();
    const metadata=JSON.parse(execFileSync(ffprobe,['-v','error','-show_entries','format=duration','-of','json',raw],{encoding:'utf8'}));
    const duration=Number(metadata.format.duration), clip=Math.min(14,duration), output=resolve(folder,label+'.mp4');
    const trimStart = Math.max(0,duration-clip-1);
    execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-ss',String(trimStart),'-i',raw,'-t',String(clip),'-an','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',output]);
    report.recording={raw,output,durationSeconds:clip,rawDurationSeconds:duration,trimStartSeconds:trimStart,timeline,kind:'Actual isolated browser recording; no generated footage; setup and final second trimmed, retaining slow approach'};
    check('Recorded actual slow flight, finite burst, braking and optical comparison',report.recording);
  }
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.providerAttempts,[]);
  assert.ok(report.failedRequests.every(r=>report.blockedStatus.some(s=>s.path===r.path)),'only intentionally blocked status GETs may fail');
  assert.ok(report.consoleErrors.every(e=>e==='Failed to load resource: net::ERR_FAILED'),'unexpected console error');
  if(process.env.REQUIRE_CLEAN==='1'){assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'');assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),revision);}
  report.passed=true;
} catch(error) { report.failure=error.message;throw error; }
finally { await browser.close();await isolated?.close();await writeFile(resolve(folder,label+'.json'),JSON.stringify(report,null,2)); }
