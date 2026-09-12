// Test-only SDK aliases + local moving pixels. This cannot verify Reactor delivery.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const label = process.env.QA_LABEL || 'reactor-preflight';
assert.match(label, /^[\w-]+$/);
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
const sourceChanges = execFileSync('git', ['status', '--porcelain'], { encoding:'utf8' }).trim();
if (process.env.REQUIRE_CLEAN === '1') assert.equal(sourceChanges, '', 'preflight requires committed source');
const report = { kind:'LOCAL SYNTHETIC MEDIA — NOT REACTOR PLAYBACK', sourceRevision:revision,
  sourceChanges, checkedAt:new Date().toISOString(), cases:[] };
const output = resolve(process.env.QA_OUTPUT_DIR || 'build/evidence'); await mkdir(output, { recursive:true });
const replacement = resolve('tests/fixtures/reactor/sdk.tsx');
const server = await createServer({ configFile:false, root:process.cwd(), publicDir:false,
  cacheDir:resolve('build/reactor-fixture-vite'), logLevel:'error',
  resolve:{ alias:[
    { find:/^@reactor-models\/happy-oyster$/, replacement },
    { find:/^@reactor-models\/happy-oyster\/react$/, replacement },
    { find:/^aliyun-rtc-sdk$/, replacement },
  ] }, optimizeDeps:{ entries:['tests/fixtures/reactor/index.html'] },
  server:{ host:'127.0.0.1', port:0, strictPort:true },
});
let browser;
const videoState = page => page.evaluate(() => ({ ...window.__reactorFixture.getVideoState(),
  currentTime:document.querySelector('video')?.currentTime ?? 0 }));
const playing = page => page.waitForFunction(() => document.querySelector('[data-testid="world-status"]')?.dataset.state === 'VIDEO PLAYING', null, { timeout:10000 });
const stopped = (page, timeout = 15000) => page.waitForFunction(() => /^(STOPPED|FAILED|EXPIRED|COMPLETED)$/.test(document.querySelector('[data-testid="world-status"]')?.dataset.state ?? ''), null, { timeout });
async function cleaned(page) {
  await page.waitForFunction(() => {
    const state = window.__reactorFixture.getVideoState();
    return !state.attached && state.trackStates.every(value => value === 'ended');
  }, null, { timeout:5000 });
  const state = await videoState(page);
  assert.equal(state.attached, false); assert.ok(state.trackStates.every(value => value === 'ended'));
  return state;
}
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless:true, chromiumSandbox:true,
    ...(process.env.CHROME_PATH ? { executablePath:process.env.CHROME_PATH } : {}) });
  for (const scenario of ['frames','play-rejection','poster-only','native-error','stall','connect-failure',
    'create-failure','factory-failure','pending-connect','pending-create','pending-factory','disconnect-pending','unmount']) {
    const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
    const result = { scenario, mocked:{ token:0, end:0, instructions:[] }, errors:[], consoleErrors:[], failedRequests:[], denied:[] };
    report.cases.push(result);
    page.on('pageerror', error => result.errors.push(error.message));
    page.on('console', entry => { if (entry.type() === 'error') result.consoleErrors.push(entry.text()); });
    page.on('requestfailed', request => result.failedRequests.push(new URL(request.url()).pathname));
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      const json = body => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(body) });
      if (url.origin === origin && url.pathname === '/api/reactor/token') {
        result.mocked.token++;
        return json({ jwt:'fixture-only-not-a-provider-token', expires_at:Date.now()/1000+900 });
      }
      if (url.origin === origin && url.pathname === '/api/runware/status')
        return json({ configured:false, ready:false, can_generate:false, attempted:false, cost_usd:null });
      if (url.hostname === 'fixture.invalid' && url.pathname === '/openapi/v1/travels/end') {
        result.mocked.end++; return json({ output:{ code:0, data:{ status:'completed' } } });
      }
      if (url.hostname === 'fixture.invalid' && url.pathname === '/openapi/v1/travels/instruct') {
        const body = request.postDataJSON(); result.mocked.instructions.push(body.content);
        await page.evaluate(text => window.__reactorFixture.acceptInstruction(text), body.content);
        return json({ output:{ code:0, data:{ accepted:true } } });
      }
      if (url.origin !== origin || url.pathname.startsWith('/api/')) {
        result.denied.push(url.origin + url.pathname); return route.abort();
      }
      if (url.pathname === '/favicon.ico') return route.fulfill({ status:204 });
      return route.continue();
    });
    try {
      await page.goto(`${origin}/tests/fixtures/reactor/index.html`);
      await page.waitForFunction(() => Boolean(window.__reactorFixture));
      const setup = ['native-error','stall','unmount'].includes(scenario) ? 'frames' : scenario;
      await page.evaluate(name => window.__reactorFixture.setScenario(name), setup);
      await page.getByRole('button', { name:/Generate AI World|Generate & enter Reactor world/i }).click();
      if (scenario === 'play-rejection') {
        await page.getByRole('button', { name:'Play video', exact:true }).waitFor();
        assert.notEqual(await page.getByTestId('world-status').getAttribute('data-state'), 'VIDEO PLAYING');
        await page.evaluate(() => window.__reactorFixture.allowPlay());
        await page.getByRole('button', { name:'Play video', exact:true }).click();
      }
      if (['frames','play-rejection','native-error','stall','disconnect-pending','unmount'].includes(scenario)) {
        await playing(page);
        const first = await videoState(page); await page.waitForTimeout(600);
        const second = await videoState(page);
        assert.ok(second.width > 0 && second.height > 0 && second.frames > first.frames && second.currentTime > first.currentTime);
        assert.equal(second.muted, true); assert.equal(second.paused, false);
        result.receivedSyntheticFrames = { first, second };
      }
      if (scenario === 'frames') {
        await page.evaluate(() => window.__reactorFixture.setBeta(.6));
        await page.getByText('Last accepted: β 0.600 · forward', { exact:true }).waitFor();
        assert.match(await page.getByTestId('world-timeline').textContent(), /EXECUTED/);
        assert.ok(result.mocked.instructions.some(text => text.includes('moderate forward concentration')));
        await page.evaluate(() => window.__reactorFixture.setView(Math.PI / 2));
        await page.getByText('Last accepted: β 0.600 · side +Z', { exact:true }).waitFor();
        await page.evaluate(() => window.__reactorFixture.setView(Math.PI));
        await page.getByText('Last accepted: β 0.600 · rear', { exact:true }).waitFor();
        await page.evaluate(() => window.__reactorFixture.setBaseline(true));
        await page.getByText('Last accepted: β 0.600 · rear · baseline', { exact:true }).waitFor();
        assert.ok(result.mocked.instructions.some(text => text.includes('unshifted optical baseline')));
        result.viewAndBaselineDirectionsAccepted = true;
        await page.screenshot({ path:`${output}/${label}-synthetic-frames.png`, fullPage:true });
      }
      if (scenario === 'poster-only') {
        await page.waitForFunction(() => window.__reactorFixture.calls.startTravel === 1);
        await page.waitForTimeout(1000);
        const state = await videoState(page);
        assert.equal(state.frames, 0); assert.notEqual(await page.getByTestId('world-status').getAttribute('data-state'), 'VIDEO PLAYING');
        result.posterWasNotVideo = true;
        await stopped(page, 65000); // Real media-arrival deadline, not a shortened fixture timeout.
        assert.match(await page.locator('.provider-error').innerText(), /Media did not start/);
      } else if (scenario === 'native-error') {
        await page.evaluate(() => window.__reactorFixture.nativeError()); await stopped(page);
        assert.match(await page.locator('.provider-error').innerText(), /could not be decoded/);
      } else if (scenario === 'stall') {
        await page.evaluate(() => window.__reactorFixture.freeze());
        await stopped(page); assert.match(await page.locator('.provider-error').innerText(), /stopped advancing/);
      } else if (scenario === 'unmount') {
        await page.evaluate(() => window.__reactorFixture.unmount());
        await page.waitForFunction(() => window.__reactorFixture.calls.disconnect > 0);
      } else if (scenario.endsWith('failure')) {
        await stopped(page); assert.match(await page.locator('.provider-error').innerText(), /Fixture/);
      } else {
        if (scenario === 'pending-connect') await page.waitForFunction(() => window.__reactorFixture.calls.connect === 1);
        if (scenario === 'pending-create') await page.waitForFunction(() => window.__reactorFixture.calls.createWorld === 1);
        if (scenario === 'pending-factory') await page.waitForFunction(() => window.__reactorFixture.calls.startTravel === 1);
        await page.getByRole('button', { name:'Stop world', exact:true }).click(); await stopped(page);
      }
      if (scenario.startsWith('pending-') || scenario === 'disconnect-pending')
        await page.getByRole('button', { name:'✦ Reload page', exact:true }).waitFor();
      if (scenario === 'pending-connect' || scenario === 'pending-create') {
        await page.evaluate(() => window.__reactorFixture.resolveSetup());
        if (scenario === 'pending-connect') await page.waitForFunction(() => window.__reactorFixture.calls.disconnect === 2);
        await page.waitForTimeout(250);
        const calls = await page.evaluate(() => ({ ...window.__reactorFixture.calls }));
        assert.equal(calls.credentials, 0); assert.equal(calls.startTravel, 0);
        assert.equal(calls.createWorld, scenario === 'pending-connect' ? 0 : 1);
        assert.equal(await page.getByTestId('world-status').getAttribute('data-state'), 'STOPPED');
        await page.getByRole('button', { name:'✦ Reload page', exact:true }).waitFor();
        result.lateSetupCouldNotStartTravel = true;
      }
      if (scenario === 'pending-factory') {
        await page.evaluate(() => window.__reactorFixture.resolveTravel());
        await page.waitForFunction(() => window.__reactorFixture.calls.end > 0);
      }
      result.cleanup = await cleaned(page);
      if (scenario === 'frames') {
        await page.evaluate(() => { window.__reactorFixture.emitLateStatus('running'); window.__reactorFixture.emitLateError(); });
        assert.equal(await page.getByTestId('world-status').getAttribute('data-state'), 'STOPPED');
      }
      result.calls = await page.evaluate(() => ({ ...window.__reactorFixture.calls }));
      assert.equal(result.mocked.token, 1); assert.equal(result.calls.connect, 1);
      assert.ok(result.calls.createWorld <= 1 && result.calls.startTravel <= 1, 'no automatic additional worlds or travels');
      assert.ok(result.calls.disconnect >= 1);
      if (!scenario.endsWith('failure') && !['pending-connect','pending-create'].includes(scenario)) assert.ok(result.mocked.end >= 1);
      assert.deepEqual(result.denied, []); assert.deepEqual(result.errors, []);
      assert.deepEqual(result.consoleErrors, []); assert.deepEqual(result.failedRequests, []);
      if (scenario === 'frames') {
        // A second explicit start may reuse the persisted world; UI updates above
        // must still have used exactly one allocation. This restart is deliberate.
        await page.getByRole('button', { name:/Generate AI World|Generate & enter Reactor world/i }).click();
        await playing(page);
        const reused = await page.evaluate(() => ({ ...window.__reactorFixture.calls }));
        assert.equal(reused.connect, 2); assert.equal(reused.createWorld, 1);
        assert.equal(reused.attachWorld, 1); assert.equal(reused.startTravel, 2);
        assert.equal(result.mocked.token, 2);
        await page.getByRole('button', { name:'Stop world', exact:true }).click(); await stopped(page);
        result.explicitWorldReuse = { calls:reused, cleanup:await cleaned(page) };
        assert.deepEqual(result.errors, []); assert.deepEqual(result.denied, []);
        assert.deepEqual(result.consoleErrors, []); assert.deepEqual(result.failedRequests, []);
      }
      result.passed = true; console.log(`PASS local media fixture: ${scenario}`);
    } finally { await page.close(); }
  }
} catch (error) { report.failure = error.message; throw error; }
finally {
  await browser?.close(); await server.close();
  await writeFile(`${output}/${label}.json`, JSON.stringify(report, null, 2));
}
