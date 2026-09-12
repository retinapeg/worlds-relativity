# Worlds — active candidate

12 September. Current split: original core task owns physics/Reactor/Modal/backend;
this task owns frontend layout, browser verification and handoff documents. Exactly
two active agents, no child agents. Earlier timestamps below are historical evidence.

- Existing Three.js flight, incremental clocks, beacons and GPU checks preserved.
- Frozen offline release `releases/20260912T110958Z` remains untouched; launcher on 4173.
- Candidate on 5173. Updating UI to 0–0.99, requested presets and lab worldlines.
- Reactor 1.0.0 installed. Protected FastAPI token service and actual SDK video flow in progress.
- Credentials configured in ignored `.env.server`, permissions 0600; never copy into source or logs.
- Paid Reactor travel attempts started: **2 of 2 permitted; allowance exhausted**. Both worlds entered travel; no playable video arrived. One earlier Reactor allocation timed out before world creation and may be billable. No fal jobs.
- Primary scoped authentication succeeded after replacing system Python 3.9 / LibreSSL 2.8 with the already-installed Python 3.13 / OpenSSL in the project venv. Previous key unused.
- 12:50 BST: SDK packaging repaired (bundled WASM assets plus required CSP wasm compilation permission). Incorrect poll-count overrides removed after checking the actual bundled WASM types. Provider trace remains separate from successful local tests.
- Modal deployed at https://retinapeg--worlds-relativity-bridge-web.modal.run. Health 200, anonymous token POST 403, protected scoped exchange 200/no-store. Default frontend still uses the local backend.
- 13:07 BST: first travel ended/expired; no second travel started yet. RTC compatibility fix keeps two signed signalling paths on HTTPS. Stop now retains temporary credentials to call documented provider end independently of a stalled RTC join, and releases the Aliyun singleton. SDK late-promise cleanup stays attached.
- Chrome native UI inspection blocked by pending macOS Computer Use permissions. Do not repeat permission prompts; continue in-app browser verification.
- 13:12 BST: second/final authorised browser travel test started. No further paid starts in this autonomous run. Production build/typecheck and24Vitest tests pass; original57runtime/export hashes and49frozen source hashes remain intact.
- Browser physics history:70.2848s at rest then17.4665s at0.6c yielded84.2580s proper time, matching70.2848+0.8×17.4665 to displayed precision. All five presets passed.
- Feature freeze no later than 16:00; demo target 16:30 BST.
- 13:28 BST checkpoint: final live instruction from β=0 returned accepted:true and
  appeared EXECUTED on the provider timeline. Direct remote stop returned completed.
  No frames played. A stalled Aliyun join required local reload recovery; the UI now
  exposes it. Two specific blocked alivecdn media origins are allowed in the final
  candidate, but no further paid test was made. Optional telemetry remains denied.
- Final frontend checks: 24 tests, typecheck and production build passed. Backend:
  2 tests passed. Startup script relaunched local 5173/8787; production preview 4174
  and original fallback 4173. Production browser passed .6/.99 controls, Run/Pause/
  Reset, 483 GPU ray checks, 105.6035 s lab / 84.4828 s proper at .6c and clean logs.
- HANDOFF.md, SETUP_REMAINING.md, updated plan and a 75-second README demo sequence
  are ready. Application ownership released to the companion project task for its
  optional Runware work, which is outside this checkpoint's test scope.
- Final integrated follow-up: Runware starting-frame/cache path is wired through
  Modal but no key or allowance is configured, so no generation occurred. Vite5173
  now routes through Modal. Core task reports25TypeScript/12backend tests passed
  plus typecheck/build, including bounded SDK cleanup and re-muting safeguards.
- Headless Chrome at1280×720 and1440×900 passed allpresets, Run/Pause/Reset,
  incremental clock rates,483GPUray checks and no uncaught errors. CSS repairs
  removed the optical/clock overlap and gave instruments/world panel16px clearance
  above the throttle. Evidence is saved under build/evidence/qa-ui-*.
- 13:36 BST: final production headless smoke passed; full66-secondsource tour
  passed with all external/provider access blocked. Final lab66.000000s,
  traveller35.755318s, stoppedatrest. No uncaught errors; one expected blocked
  Runware status request. Exact evidence qa-final-production.json/qa-final-offline.json.
