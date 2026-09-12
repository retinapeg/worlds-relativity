# Worlds — implementation handoff

Checkpoint: 12 September 2026, 13:28 BST. Local physics works. Reactor authentication,
world creation, instruction acceptance/execution and explicit remote stop were verified;
playable world video was **not** verified. Both authorised travel tests are exhausted.

## Run and protect the demo

- `./scripts/start-dev.sh` starts/reuses the frontend (5173) and protected FastAPI
  bridge (8787). Both are running at this checkpoint.
- `./scripts/npm.sh run preview -- --port 4174` serves the tested production candidate.
- `./run_demo.sh --known-good` serves the preserved offline snapshot on 4173.
  Never edit `releases/20260912T110958Z`, its source, permissions or pointer.
- Read MATH.md and DEMO_FREEZE.md before changes. Feature freeze by 16:00 BST;
  presentation target 16:30, absolute handoff 17:00.

## Module boundaries

| Area | Files | Responsibility |
| --- | --- | --- |
| Physics | `src/physics/relativity.ts`, `photon.glsl.ts`, `beacons.ts` | One SR state, ray transforms and stationary lab beacons |
| Motion | `src/controls/simulation.ts`, `frameClock.ts` | Incremental clocks/position; manual constant-speed segments; prescribed tour ramps |
| Display | `src/ui/App.tsx`, `Minkowski.tsx`, `Wavelength.tsx`, `style.css` | β 0–0.99, equal-scale lab worldlines, simultaneous ruler, frequency/wavelength indicators |
| Generated world | `src/reactor/ReactorPanel.tsx`, `src/reactor/` | Separate SDK video, deterministic directions, latest-only queue and lifecycle |
| Backend | `backend/app.py`, `backend/modal_app.py` | Protected scoped JWT exchange/cache; same CPU app on Modal |
| Compatibility | `vite.config.ts`, `scripts/prepare-reactor-sdk.mjs`, `index.html` | SDK WASM assets, three version-checked RTC HTTPS/DNS fixes, narrow media CSP |

The single-attempt exported `startTravel` factory is intentional: the higher-level
SDK hook automatically retries and could exceed the paid-session budget. Its video
timeout does not cover a stalled RTC join. Direct documented `/travels/end` and
`/instruct` requests use temporary credentials independently. Only `accepted:true`
counts as instruction acceptance; the provider timeline is displayed separately.
Stop requests an explicit remote acknowledgement, then disconnects/releases local
resources. A late RTC promise remains attached for cleanup without blocking the UI
forever. Local Aliyun teardown can require a page reload; the UI says so.

## Actual provider result and remaining blocker

Two real worlds entered travel. In the final test, the direction from β=0 was
accepted and appeared as **EXECUTED** on the provider timeline. The direct end
response reported **completed**. Video never became playable. The first test
attempted SDK termination, but an explicit remote acknowledgement was not observed;
its 300-second session cap elapsed before the final test. One preliminary Reactor
allocation also failed readiness before world creation; treat it as potentially billable.

The final trace identified two blocked required media origins. The candidate now
allows exactly `https://r5-rtcpub.media-sh.alivecdn.com` and
`https://r5-rtcsub.media-sh.alivecdn.com`. This fix passed build/local browser checks
but has **not** had another live travel test. Optional SDK telemetry stays blocked.
Do not claim that live video works and do not start another paid world without a
new explicit allowance. See SETUP_REMAINING.md.

## Credentials and deployment

Ignored `.env.server` is mode 0600. Primary Reactor key works; previous key was never
used. FAL is reserved and unused. No browser/VITE secrets. Python 3.13/OpenSSL in
`.venv` replaces the system Python's incompatible LibreSSL TLS client.

Modal bridge: https://retinapeg--worlds-relativity-bridge-web.modal.run
Health 200, anonymous POST 403 and protected scoped token exchange 200/no-store
were verified. Default Vite routing now uses Modal via the server-side
`REACTOR_BACKEND_URL`; clear it and restart Vite to use local8787 instead.
Tokens allow the director model, one session and at most 300 seconds per session.
No fal generation, Claude setup, Git push or frontend publication occurred.

Final verification update13:36 BST: the rebuilt production candidate passed the
headless smoke. A full66-secondtour with provider access blocked finished at
lab66.000000 s / traveller35.755318 s and stopped at rest. No uncaught errors;
one expected blocked Runware status request. Evidence is in QA.md and build/evidence.

## Verification and repository state

Final integrated build: 25 TypeScript tests, typecheck, production build and 12 backend
tests passed, including Runware guards and a bounded SDK-cleanup regression.
Actual production browser checks passed: 0.6/0.99 presets; Run/Pause/Reset;
105.603500 s lab / 84.482800 s proper at 0.6c; 483 GPU photon rays with maximum
relative-scaled error 2.6e-7; no warning/error logs after local interactions.
All five presets and mixed-speed incremental history also passed in development.

The unchanged original core previously passed 34,739 sanitizer checks and the same
34,739 WASM checks. All 57 frozen runtime/export hashes and 49 frozen source hashes
match. Main has an unborn HEAD, no commit and no remote; all original work remains.

Vite reports large bundles. The SDK dependency audit reports 3 high / 1 moderate
issues without an available automatic upstream fix; no speculative upgrades made.
Earlier checks used in-app Chromium. Final layout/control verification also passed
in headless Chrome at1280×720 and1440×900, with no uncaught errors or overlaps among
the main panels. No native UI control or macOS permission changes are needed.

## Ownership transfer and next task

Exactly two active implementation agents are allowed. “Build Relativity Drive demo”
owns physics, shared state, src/reactor, src/runware, backend/config and final integration.
This task owns src/ui, browser verification and demo/handoff documents. No children
or replacements. Runware is wired and its12backend tests pass with generation disabled:
no key and allowance0. Headless UI confirmed the truthful missing-key status. No image
or live starting-frame integration has been verified. Coordinate changes with the
core task; do not run overlapping implementations or paid tests. The final core
patch bounds SDK disconnect and RTC destruction to five seconds each and requires
reload after uncertain teardown. Video is re-muted on metadata/volume changes.
These defensive fixes are unit/build checked but have not had another paid travel.

Best bounded Claude task, if the user chooses to launch it: after explicit approval
for one additional short travel test, verify actual video frames after the two-origin
CSP repair, change β from 0 to 0.6, confirm accepted/executed direction, then confirm
remote stop and local cleanup. Preserve the physics and frozen release. Claude was
not launched or configured by this task.
