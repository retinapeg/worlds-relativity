# Verification — 12 September 2026

Verified local MVP snapshot: `20260912T110958Z`. The source was on `main` with an
unborn HEAD and uncommitted work. Source and exported-asset hashes accompany the
snapshot; no commit, tag, push or publication was performed.

## Commands actually run

- `./scripts/npm.sh test`: **16 tests passed in 4 files**. Includes fixed analytic
  values, signed inverse Lorentz transforms, interval invariance, clock history,
  invalid inputs, finite values, 1,542 CPU ray sweep cases, source direction signs,
  spectral monotonicity, 30/60/144 fps equivalence, complete demo timing and a
  hidden-tab clock regression (including an hour with no animation frames), and
  a rounded minute-rollover display regression.
- `./scripts/npm.sh run typecheck`: **passed**.
- `./scripts/npm.sh run build`: **passed**. JS 772.87 kB, gzip 208.46 kB; CSS 11.37 kB.
  Vite reports its usual >500 kB bundle warning. Dependencies were not split or
  upgraded to silence it; the observed browser render remains interactive.
- `bash scripts/test.sh`, before implementation, on unchanged original sources:
  **34,739 native checks passed with address/undefined/float-divide sanitizers**, then
  **34,739 checks passed in WebAssembly**. The new app does not load that WASM.
- Shell syntax and Python static-launcher syntax checks passed.

## Actual browser checks

Codex in-app Chromium browser, normal desktop viewport, development and production:

- Fresh load without credentials: procedural sky visible, clocks equal at rest.
- Startup **483 GPU photon rays passed**, with maximum relative-scaled CPU/GPU
  error **2.6e−7**. This exercised the GLSL shared by both rendering paths.
- Observed performance: approximately **60 fps**; no claim about other hardware.
- All presets were clicked while paused: gamma readouts **1.000, 1.155, 2.294,
  7.089, 22.366** at **0, .5, .9, .99, .999c**. Clocks stayed exactly zero.
- Pointer dragging the throttle changed the actual beta and all numerical values.
- Forward, Side, Rear and free-look dragging changed the view without changing beta.
- Visually inspected rest, high-speed forward concentration, and redder/dimmer rear
  sky at .5c. At .999c the rear becomes nearly dark, consistent with the declared
  synthetic spectral display and sparse remaining rear angular coverage.
- Run, Pause, Reset and keyboard R worked. Reset showed both clocks at zero,
  beta zero, gamma one, full 100 m ruler and forward view, in a paused state.
- The automatic tour actually ran to completion, stopped at rest, and preserved
  **lab 66.000000 s / traveller 30.162733 s**.
- After changing to .9c, a manual run advanced from those totals to
  **lab 95.950900 s / traveller 43.218028 s**. The incremental ratio was
  **0.435889906**, matching sqrt(1−.9²) = **0.435889894** within displayed precision.
- The ruler's coordinate-measurement and non-photographic-appearance labels were
  visually checked for readability at the default desktop size.
- Production reload worked with `connect-src 'none'` and all external resources
  blocked by the static server's CSP. The machine network was not switched off.
- Spectral/false-colour and angular-ring controls were exercised; the false-colour
  label changed correctly and the numerical state was preserved.
- Browser error/warning log was empty after the completed production tour.

## Limits of this verification

The hidden-tab discontinuity was tested in the unit regression; an actual browser
tab-hide event was not separately forced. Physical presentation hardware, other
browsers and phone control were not tested. No sponsor authentication, generated
world, streaming video, beaming or exact human-vision rendering was verified or claimed.

Reactor, Runware, Modal and phone control remain outside this snapshot.

## Active Worlds candidate — 12 September, 13:28 BST

This section supersedes earlier candidate claims; the earlier evidence above stays
valid for the preserved offline snapshot. The new candidate has 0–0.99 controls,
lab worldlines and a separate Reactor panel.

- 24 tests in 6 TypeScript test files passed. Typecheck and production build passed.
- 2 FastAPI backend tests passed. One upstream Starlette/AnyIO deprecation warning.
- Development browser: all five presets gave gamma 1.000/1.250/1.667/3.203/7.089
  and simultaneous lengths 100/80/60/31.22/14.11 m at 0/.6/.8/.95/.99c.
- Mixed history: 70.2848 s at rest, then 17.4665 s at .6c yielded 84.2580 s proper
  time; error versus incremental expectation was approximately 1.4e-14 s.
- Final production browser: .6c showed gamma1.250,80m,275nmUV and1100nmIR;
  .99c showed gamma7.089,14.11m,39nmUV and7758.7nmIR. A .6c run accumulated
  105.603500 s lab and84.482800 s proper, exactly the displayed0.8 ratio.
- Run/Pause/Reset worked. Reset left both clocks0, beta0 and a paused Run button.
  Equal-scale worldline labels and the generated-illustration label were inspected.
- Production GPU startup: 483 rays passed, max relative-scaled error2.6e-7.
  Latest diagnostic sample36fps; earlier samples~60fps. No guarantee on other
  hardware. Local production interactions left no warning/error console entries.
- Preserved snapshot integrity: all57runtime/export hashes and49source hashes match.
  Source checksums resolve under the snapshot's source directory.
- Local health and Vite health proxy passed. Actual Modal health200, anonymous
  token POST403 and protected scoped token exchange200/no-store passed.
- Actual Reactor: two worlds entered travel; final β0 instruction accepted:true,
  provider timeline EXECUTED, direct end response completed. No playable video in
  either test. First SDK cleanup lacked an observed explicit remote acknowledgement;
  final direct stop was acknowledged. A preliminary allocation failed readiness.
- Final CSP repair adds only the two observed HTTPS alivecdn media origins. It has
  not had another live test: both authorised travel tests are exhausted. No claims
  of working video, high-speed live direction or successful reconnect are made.
- Native Chrome automation is blocked on macOS Computer Use helper permissions;
  browser checks used in-app Chromium. Optional SDK telemetry remains CSP-blocked.
- No fal jobs, Claude launch or frontend publication. Companion Runware changes
  after ownership handoff require their own tests and are outside this evidence.

## Integrated UI follow-up

The core task integrated Runware and routed5173throughModal; generation remains
disabled without a key/allowance. It reports24TypeScript and12backend tests passed.
Independent headless Chrome checks at1280×720 and1440×900 passed allfivepresets,
Run/Pause/Reset, incremental0.6cclock ratios and483GPU rays without uncaught errors.
Measured clock errors were0 and−1.1e−16seconds. A real overlap found at720pixels high
was repaired in src/ui/style.css: Doppler indicators sit beside the main readout;
camera controls, clocks, Minkowski and world panel clear the throttle. Final
bounding-box checks found no overlaps for those panel pairs. Evidence:
build/evidence/qa-ui-layout.json and qa-ui-1280.png / qa-ui-1440.png.
The second viewport's Runware status correctly said it awaits a server key.

Final headless smoke passed against the rebuilt production candidate on4174:
presets, analytic Doppler, realclock rate, pause, return-to-rest history, slider
keyboard bounds, full reset and483GPU rays. The source candidate also completed
the entire66-secondtour with all external requests and all provider API access
blocked: lab66.000000 s, traveller35.755318 s, stopped at rest. Both had no uncaught
errors. Each had one expected console/request error from the intentionally blocked
Runware status fetch; those are not clean-network console passes. The actual machine
network was not disabled. Results: qa-final-production.json and qa-final-offline.json.
The final integrated code checks are25TypeScript tests and12backend tests, typecheck
and production build, as reported by the core integrator.
