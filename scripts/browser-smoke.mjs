// Real UI checks. Uses an existing Playwright installation and an isolated,
// headless browser profile; never connects to a user's desktop browser.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.DEMO_URL || 'http://127.0.0.1:5173';
const folder = resolve(process.env.QA_OUTPUT_DIR || 'build/evidence');
const label = process.env.QA_LABEL || 'qa-candidate';
assert.match(label, /^[a-zA-Z0-9_-]+$/);
const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
const sourceTree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding:'utf8' }).trim();
const sourceChanges = execFileSync('git', ['status', '--porcelain'], { encoding:'utf8' }).trim();
if (process.env.REQUIRE_CLEAN === '1') assert.equal(sourceChanges, '', 'final smoke requires committed source');
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true, chromiumSandbox: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const results = { url: origin, sourceRevision, sourceTree, sourceChanges,
  checkedAt: new Date().toISOString(), checks: [], pageErrors: [], consoleErrors: [],
  failedRequests: [], expectedBlockedRequests: [], externalRequests: [], blockedProviderPosts: [] };
const check = (name, detail) => { results.checks.push({ name, detail }); console.log(`PASS ${name}`); };
const number = async (page, id) => Number(await page.getByTestId(id).textContent());
const seconds = async (page, kind) => Number(await page.getByTestId(`${kind}-time`).getAttribute('data-seconds'));
const near = (actual, expected, tolerance, name) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${name}: expected ${expected}, got ${actual}`);
const capture = async (page, name) => page.screenshot({ path: `${folder}/${label}-${name}.png`, fullPage: true });
const painted = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const dimensions = page => page.evaluate(() => {
  const measure = id => {
    const shape = document.querySelector(`[data-testid="${id}"]`), box = shape.getBoundingClientRect();
    return { width:box.width, height:box.height, x:box.x, y:box.y };
  };
  return { rest:measure('rest-craft'), moving:measure('moving-craft') };
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => results.pageErrors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') results.consoleErrors.push(e.text()); });
  page.on('requestfailed', r => results.failedRequests.push({ url: new URL(r.url()).pathname, reason: r.failure()?.errorText }));
  // This test cannot create paid sessions: all external network requests and all
  // provider POSTs are blocked, even if a UI regression accidentally starts one.
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(origin).origin) {
      results.externalRequests.push(url.origin + url.pathname); return route.abort();
    }
    if (url.pathname.startsWith('/api/')) {
      if (request.method() !== 'GET') { results.blockedProviderPosts.push(url.pathname); return route.abort(); }
      if (process.env.BLOCK_PROVIDERS === '1') {
        results.expectedBlockedRequests.push(url.pathname); return route.abort();
      }
    }
    return route.continue();
  });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.connection')?.textContent?.includes('Physics: local / offline ready'), null, { timeout: 25000 });
  await page.waitForFunction(() => !document.querySelector('.artwork-status')?.textContent?.includes('Checking starting artwork'), null, { timeout:20000 });
  await page.waitForFunction(() => !document.querySelector('[data-testid="modal-health"]')?.textContent?.includes('checking'), null, { timeout:20000 });
  const modalLabel = await page.getByTestId('modal-health').textContent();
  assert.match(modalLabel, process.env.BLOCK_PROVIDERS === '1' ? /unavailable/ : /reachable/);
  check('Separate local physics and actual Modal health status', { modalLabel });
  await page.getByRole('button', { name: /Reset/ }).click();
  near(await number(page, 'beta'), 0, 0, 'rest beta');
  near(await number(page, 'gamma'), 1, 0, 'rest gamma');
  near(await number(page, 'length'), 100, 0, 'rest length');
  await painted(page);
  const fixed = await dimensions(page);
  assert.ok(fixed.rest.width > 400, 'reference must occupy a large readable fixed scale');
  near(fixed.moving.width, fixed.rest.width, .1, 'rest equal widths');
  await capture(page, 'rest');
  check('Rest baseline and visible WebGL scene');

  for (const beta of [0.6, 0.95, 0.99, 0.999]) {
    const started = performance.now();
    await page.getByRole('button', { name: `${beta}c`, exact: true }).click();
    const gamma = 1 / Math.sqrt((1 - beta) * (1 + beta));
    near(await number(page, 'beta'), beta, 1e-9, 'preset beta');
    near(await number(page, 'gamma'), gamma, .00051, 'gamma');
    near(await number(page, 'length'), 100 / gamma, .0051, 'length');
    assert.equal(await page.locator('.presets button[aria-pressed="true"]').count(), 1);
    assert.equal(await page.locator('.presets button[aria-pressed="true"]').textContent(), `${beta}c`);
    assert.equal(await page.getByTestId('target-beta').textContent(), `${beta.toFixed(3)}c`);
    assert.ok(performance.now() - started < 1000, 'manual preset responds within one second');
    near(await number(page, 'lab-per-ship-second'), gamma, .0051, 'instantaneous clock ratio');
    near(await number(page, 'ship-over-60'), 60 / gamma, .0051, 'calculated 60-second comparison');
    await painted(page);
    const geometry = await dimensions(page);
    near(geometry.rest.width, fixed.rest.width, .1, 'fixed reference width');
    near(geometry.rest.x, fixed.rest.x, .1, 'fixed ruler origin');
    near(geometry.moving.width / geometry.rest.width, 1 / gamma, 1e-6, 'rendered length ratio');
    near(geometry.moving.height, fixed.rest.height, .1, 'transverse size unchanged');
    assert.equal(await seconds(page, 'lab'), 0, 'paused lab clock');
    assert.equal(await seconds(page, 'proper'), 0, 'paused proper clock');
    check(`Preset ${beta}c and actual fixed-scale geometry`, { gamma, length: 100 / gamma, geometry });
    if (beta >= .99) await capture(page, beta === .99 ? '099' : '0999');
  }
  near(await number(page, 'length-reduction'), 95.53, .00001, 'visible percentage reduction');
  await capture(page, 'near-c');
  await page.getByRole('button', { name: '0.6c', exact: true }).click();
  assert.equal((await page.getByTestId('doppler-forward').textContent()).trim(), '2.00×');
  assert.equal((await page.getByTestId('doppler-rear').textContent()).trim(), '0.500×');
  check('Approaching and receding Doppler references');
  await page.getByRole('button', { name: 'Rear', exact: true }).click();
  near(await number(page, 'beta'), .6, 1e-9, 'camera preserves boost');
  await capture(page, 'rear');
  await page.getByRole('button', { name: 'Forward', exact: true }).click();

  await page.locator('#run-pause').click();
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="lab-time"]').dataset.seconds) > 2);
  await page.locator('#run-pause').click();
  const lab = await seconds(page, 'lab'), proper = await seconds(page, 'proper');
  near(proper, lab / 1.25, .000003, 'proper time increment');
  await page.waitForTimeout(250);
  near(await seconds(page, 'lab'), lab, 0, 'pause');
  check('Real animation clock rate dt/gamma and pause', { lab, proper });
  await page.getByRole('button', { name: /0c ·/ }).click();
  await page.locator('#run-pause').click();
  await page.waitForFunction(previous => Number(document.querySelector('[data-testid="lab-time"]').dataset.seconds) > previous + 1, lab);
  await page.locator('#run-pause').click();
  near((await seconds(page, 'proper')) - proper, (await seconds(page, 'lab')) - lab, .000003, 'rest preserves prior history');
  check('Return to rest preserves clock history');

  const throttle = page.getByRole('slider');
  await throttle.focus(); await throttle.press('End');
  near(await number(page, 'beta'), .999, 1e-9, 'slider upper limit');
  await throttle.press('ArrowLeft');
  near(await number(page, 'beta'), .998, 1e-9, 'slider change');
  await throttle.press('Home');
  near(await number(page, 'beta'), 0, 0, 'slider baseline');
  check('Actual slider keyboard interaction and bounded near-c control');
  await page.getByRole('button', { name: /Experience 99.9%/ }).click();
  near(await number(page, 'beta'), .999, 1e-9, 'prominent experience action');
  assert.match(await page.locator('#run-pause').textContent(), /Pause/);
  const [highLabStart, highProperStart] = await page.evaluate(() => ['lab', 'proper'].map(kind =>
    Number(document.querySelector(`[data-testid="${kind}-time"]`).dataset.seconds)));
  await page.waitForFunction(start => Number(document.querySelector('[data-testid="lab-time"]').dataset.seconds) > start + 2, highLabStart);
  await page.locator('#run-pause').click();
  const highLabDelta = await seconds(page, 'lab') - highLabStart, highProperDelta = await seconds(page, 'proper') - highProperStart;
  near(highProperDelta / highLabDelta, Math.sqrt(.001 * 1.999), .00002, 'visible high-speed clock rate');
  const ticks = await page.evaluate(() => [...document.querySelectorAll('.clock')].map(clock => ({
    seconds:Number(clock.querySelector('output').dataset.seconds), angle:Number(clock.querySelector('line').getAttribute('transform').match(/rotate\(([^ ]+)/)[1])
  })));
  for (const tick of ticks) {
    const difference = ((tick.angle - tick.seconds % 1 * 360 + 540) % 360) - 180;
    near(difference, 0, .0002, 'clock indicator follows accumulated time across sweep rollover');
  }
  check('Prominent .999 action and genuinely different animated clock rates', { highLabDelta, highProperDelta, ticks });

  const physicalIds = ['beta', 'length', 'gamma', 'distance'];
  const physicalBefore = await Promise.all(physicalIds.map(id => number(page, id)));
  const timesBefore = [await seconds(page, 'lab'), await seconds(page, 'proper')];
  await page.getByRole('button', { name:'Side', exact:true }).click();
  await painted(page);
  const opticalImage = await page.locator('#universe').screenshot();
  await page.getByTestId('optical-baseline').click(); await painted(page);
  assert.equal(await page.getByRole('button', { name:'Side', exact:true }).getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await Promise.all(physicalIds.map(id => number(page, id))), physicalBefore);
  assert.deepEqual([await seconds(page, 'lab'), await seconds(page, 'proper')], timesBefore);
  assert.notDeepEqual(await page.locator('#universe').screenshot(), opticalImage, 'baseline visibly changes only the optical scene');
  await page.getByTestId('optical-baseline').click();
  check('Same-camera optical baseline changes pixels without changing clocks or exact measurements');

  for (const manual of ['preset', 'slider', 'camera', 'baseline']) {
    await page.getByRole('button', { name:/54-second/ }).click();
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="lab-time"]').dataset.seconds) > 1.1);
    if (manual === 'preset') await page.getByRole('button', { name:'0.999c', exact:true }).click();
    if (manual === 'slider') { await throttle.focus(); await throttle.press('End'); }
    if (manual === 'camera') await page.getByRole('button', { name:'Rear', exact:true }).click();
    if (manual === 'baseline') await page.getByTestId('optical-baseline').click();
    await page.getByRole('button', { name:/54-second/ }).waitFor();
    await page.locator('#run-pause').click();
    assert.equal(await page.locator('.tour-progress').count(), 0);
  }
  check('Preset, slider, camera and baseline each take control away from the automated tour');
  await page.getByRole('button', { name: 'Rear', exact: true }).click();
  await page.getByRole('button', { name: /Reset/ }).click();
  for (const id of ['beta', 'distance']) near(await number(page, id), 0, 0, `reset ${id}`);
  for (const kind of ['lab', 'proper']) near(await seconds(page, kind), 0, 0, `reset ${kind}`);
  assert.equal(await page.getByRole('button', { name: 'Forward', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#run-pause').textContent(), /Run/);
  assert.equal(await page.getByTestId('optical-baseline').getAttribute('aria-pressed'), 'false');
  check('Reset clocks, distance, speed, camera and pause state');
  await page.getByText('Display & science', { exact: false }).click();
  const graphics = await page.locator('.details-panel').textContent();
  assert.match(graphics, /483.*passed/);
  const probe = graphics.match(/(\d+) GPU rays passed · max relative-scaled error ([\d.eE+-]+)/);
  assert.ok(probe, 'complete GPU probe result');
  const rayCount = Number(probe[1]), maxRelativeScaledError = Number(probe[2]);
  assert.equal(rayCount, 483); assert.ok(Number.isFinite(maxRelativeScaledError) && maxRelativeScaledError <= 2e-4);
  check('483 real GPU photon-ray checks', { rayCount, maxRelativeScaledError });
  await page.getByText('Display & science', { exact: false }).click();

  if (process.env.RUN_TOUR === '1') {
    await page.getByRole('button', { name: /54-second/ }).click();
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="lab-time"]').dataset.seconds) >= 4);
    near(await number(page, 'beta'), .6, .000001, 'substantial change within first five seconds');
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="lab-time"]').dataset.seconds) >= 54, null, { timeout: 58000 });
    near(await seconds(page, 'lab'), 54, .000001, 'complete tour lab time');
    near(await seconds(page, 'proper'), 8.452663866881027, .000002, 'independent analytic tour proper time');
    near(await number(page, 'distance'), 50.555883989326034, .0051, 'independent analytic tour position');
    near(await number(page, 'beta'), .999, .000001, 'complete tour high-speed state');
    assert.match(await page.locator('#run-pause').textContent(), /Run/);
    check('Complete 54-second real-time tour with independent analytic clock reference', { lab: await seconds(page, 'lab'), proper: await seconds(page, 'proper') });
    await capture(page, 'tour-complete');
  }
  await page.getByRole('button', { name:/Reset/ }).click();
  await page.getByRole('button', { name:'0.999c', exact:true }).click();
  await page.setViewportSize({ width:1280, height:720 }); await painted(page);
  const layout = await page.evaluate(() => ({ width:document.documentElement.scrollWidth,
    height:document.documentElement.scrollHeight, panels:[...document.querySelectorAll('.measurement-panel,.time-panel,.world-panel,.throttle,.view-strip,.footer')].map(e => ({
      name:e.className, ...e.getBoundingClientRect().toJSON(), scrollHeight:e.scrollHeight, clientHeight:e.clientHeight
    })) }));
  results.layout = layout;
  await capture(page, 'layout-1280');
  assert.equal(layout.width, 1280, 'no horizontal overflow');
  assert.equal(layout.height, 720, 'all key controls fit at normal zoom');
  for (const panel of layout.panels) {
    assert.ok(panel.x >= 0 && panel.y >= 0 && panel.right <= 1280 && panel.bottom <= 720, `${panel.name} stays in viewport`);
    assert.ok(panel.scrollHeight <= panel.clientHeight + 1, `${panel.name} has no clipped content`);
  }
  check('1280x720 actual layout bounds and unclipped panels', layout);
  assert.deepEqual(results.pageErrors, [], 'uncaught browser errors');
  assert.deepEqual(results.externalRequests, [], 'local UI must not request external resources');
  assert.deepEqual(results.blockedProviderPosts, [], 'local UI must not try to create provider sessions');
  const unexpectedFailures = results.failedRequests.filter(r => !results.expectedBlockedRequests.includes(r.url));
  assert.deepEqual(unexpectedFailures, [], 'unexpected failed browser requests');
  const unexpectedConsole = results.consoleErrors.filter(text => !(
    results.expectedBlockedRequests.length && /^Failed to load resource: net::ERR_FAILED$/.test(text)));
  assert.deepEqual(unexpectedConsole, [], 'unexpected console errors');
  assert.ok(results.consoleErrors.length <= results.expectedBlockedRequests.length, 'no excess console resource errors');
  check('Browser request and console audit', { expectedBlockedRequests:results.expectedBlockedRequests,
    expectedConsoleErrors:results.consoleErrors.length, unexpectedFailures, unexpectedConsole });
  check('No uncaught browser errors');
} catch (error) {
  results.failure = error.message;
  throw error;
} finally {
  await writeFile(`${folder}/${label}.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
