// Real UI checks. Uses an existing Playwright installation and an isolated,
// headless browser profile; never connects to a user's desktop browser.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.DEMO_URL || 'http://127.0.0.1:5173';
const folder = resolve('build/evidence');
const label = process.env.QA_LABEL || 'qa-candidate';
assert.match(label, /^[a-zA-Z0-9_-]+$/);
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true, chromiumSandbox: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const results = { url: origin, checkedAt: new Date().toISOString(), checks: [],
  pageErrors: [], consoleErrors: [], failedRequests: [], externalRequests: [] };
const check = (name, detail) => { results.checks.push({ name, detail }); console.log(`PASS ${name}`); };
const number = async (page, id) => Number(await page.getByTestId(id).textContent());
const seconds = async (page, kind) => Number(await page.getByTestId(`${kind}-time`).getAttribute('data-seconds'));
const near = (actual, expected, tolerance, name) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${name}: expected ${expected}, got ${actual}`);
const capture = async (page, name) => page.screenshot({ path: `${folder}/${label}-${name}.png`, fullPage: true });
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
    if (url.pathname.startsWith('/api/') && (process.env.BLOCK_PROVIDERS === '1' || request.method() !== 'GET')) return route.abort();
    return route.continue();
  });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.connection')?.textContent?.includes('LOCAL SIMULATION'), null, { timeout: 25000 });
  await page.getByRole('button', { name: /Reset/ }).click();
  near(await number(page, 'beta'), 0, 0, 'rest beta');
  near(await number(page, 'gamma'), 1, 0, 'rest gamma');
  near(await number(page, 'length'), 100, 0, 'rest length');
  await capture(page, 'rest');
  check('Rest baseline and visible WebGL scene');

  for (const beta of [0.6, 0.8, 0.95, 0.99]) {
    await page.getByRole('button', { name: `${beta}c`, exact: true }).click();
    const gamma = 1 / Math.sqrt((1 - beta) * (1 + beta));
    near(await number(page, 'beta'), beta, 1e-9, 'preset beta');
    near(await number(page, 'gamma'), gamma, .00051, 'gamma');
    near(await number(page, 'length'), 100 / gamma, .0051, 'length');
    assert.equal(await seconds(page, 'lab'), 0, 'paused lab clock');
    assert.equal(await seconds(page, 'proper'), 0, 'paused proper clock');
    check(`Preset ${beta}c`, { gamma, length: 100 / gamma });
  }
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
  near(await number(page, 'beta'), .99, 1e-9, 'slider upper limit');
  await throttle.press('ArrowLeft');
  near(await number(page, 'beta'), .989, 1e-9, 'slider change');
  await throttle.press('Home');
  near(await number(page, 'beta'), 0, 0, 'slider baseline');
  check('Actual slider keyboard interaction and bounded near-c control');
  await page.getByRole('button', { name: 'Rear', exact: true }).click();
  await page.getByRole('button', { name: /Reset/ }).click();
  for (const id of ['beta', 'distance']) near(await number(page, id), 0, 0, `reset ${id}`);
  for (const kind of ['lab', 'proper']) near(await seconds(page, kind), 0, 0, `reset ${kind}`);
  assert.equal(await page.getByRole('button', { name: 'Forward', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#run-pause').textContent(), /Run/);
  check('Reset clocks, distance, speed, camera and pause state');
  await page.getByText('Display & science', { exact: false }).click();
  const graphics = await page.locator('.details-panel').textContent();
  assert.match(graphics, /483.*passed/);
  check('483 real GPU photon-ray checks', graphics.match(/483[^\n]*?error[^\n]*?(?:e[-+]?\d+|\d\.\d+)/)?.[0]);
  await page.getByText('Display & science', { exact: false }).click();

  if (process.env.RUN_TOUR === '1') {
    await page.getByRole('button', { name: /66-second|66 second|66 seconds/ }).click();
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="lab-time"]').dataset.seconds) >= 66, null, { timeout: 80000 });
    near(await seconds(page, 'lab'), 66, .000001, 'complete tour lab time');
    near(await number(page, 'beta'), 0, .000001, 'complete tour rest');
    assert.match(await page.locator('#run-pause').textContent(), /Run/);
    check('Complete 66-second real-time tour', { lab: await seconds(page, 'lab'), proper: await seconds(page, 'proper') });
    await capture(page, 'tour-complete');
  }
  assert.deepEqual(results.pageErrors, [], 'uncaught browser errors');
  check('No uncaught browser errors');
} catch (error) {
  results.failure = error.message;
  throw error;
} finally {
  await writeFile(`${folder}/${label}.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
