# Worlds — verification record

## Current fly-through gate

The latest bounded implementation has its own receipt at
`build/evidence/flythrough/final-verification.json`. Do not overwrite or combine
it with the prior 2f362600 receipt below. The current source must be clean and
match the recorded SHA. Build only into `build/relativity-flythrough-candidate`
and test production preview 4175, preserving prior preview 4174.

The gate includes all numerical/backend/native/WASM and lifecycle checks below,
plus `scripts/flythrough-smoke.mjs`: actual geometry motion at constant beta,
burst from rest and high speed, phase/clock/history continuity, manual takeover,
pause/reset, same-flight optical comparison, clipping safety and provider-blocked
offline operation. It measures actual browser frame intervals and records 10–15
seconds of the running application. Inspect the retained video and frames; a
changing HUD alone is insufficient. The encoder is already installed and is
referenced via a project-local cache without a download or global change.

## Previous candidate source gate — preserved 2f362600 reference

The authoritative final-pass receipt is `build/evidence/final-verification.json`.
It records the exact clean source revision, command outcomes, numerical counts,
browser evidence, timestamp, secret scan and frozen hash checks. Compare its
`sourceRevision` with `git rev-parse HEAD` and require `git status --porcelain`
to be empty. Do not treat an absent, failed or
revision-mismatched receipt as a completed gate. The baseline checkpoint and
sponsor history are in HANDOFF.md. The completed c5669b7 0–0.99 gate is preserved
in build/evidence/checkpoint-c5669b7; its 66-second tour and counts do not establish
the subsequent 0–0.999 visual candidate's results.

Canonical commands, executed after all integration writes stop and final review:

```sh
./scripts/npm.sh test
.venv/bin/python -m pytest tests/test_backend.py tests/test_runware.py -q
bash scripts/test.sh
./scripts/npm.sh run typecheck
./scripts/npm.sh run build
```

The TypeScript suite separates analytic SR/clock/ray tests from provider token,
direction, cleanup and media-monitor tests. The original C++ suite runs natively
with address/undefined/float-divide sanitizers and then the same cases in WASM.
Neither a build nor unit tests substitute for the following browser execution.

Use the existing project Node runtime, installed Playwright and Chrome. No install,
provider session, desktop browser connection or OS permission change is required:

```sh
export PLAYWRIGHT_MODULE=/Users/leo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
export CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
QA_LABEL=reactor-final-preflight REQUIRE_CLEAN=1   ./.tools/emsdk/node/24.19.0_64bit/bin/node scripts/reactor-preflight.mjs
DEMO_URL=http://127.0.0.1:4174 QA_LABEL=qa-final-production REQUIRE_CLEAN=1   ./.tools/emsdk/node/24.19.0_64bit/bin/node scripts/browser-smoke.mjs
DEMO_URL=http://127.0.0.1:4174 QA_LABEL=qa-final-offline REQUIRE_CLEAN=1   BLOCK_PROVIDERS=1 RUN_TOUR=1   ./.tools/emsdk/node/24.19.0_64bit/bin/node scripts/browser-smoke.mjs
```

The existing preview serves the rebuilt candidate. The smoke checks rest; every
intermediate/near-c preset; analytic Doppler; real elapsed clock rate; pause;
preserved mixed-speed history; camera independence; keyboard throttle bounds;
full reset; and the browser's actual 483 GPU comparisons. The revised presets are
0, 0.6, 0.95, 0.99 and 0.999; actual geometry and clock ticks supplement text checks. The offline pass executes
the entire 54-second tour and verifies its paused 0.999c end state. Geometry
assertions compare the contracted silhouette with the fixed ghost/ruler, including
the approximately 4.471% ratio at 0.999c and unchanged transverse dimensions.
Manual tour interruption, baseline continuity and reset are also checked. Provider access is
blocked in-browser, not by disabling the computer's network. All provider POSTs
and external resources are blocked in both smoke runs.

The normal smoke allows only local GET status requests and requires no unexpected
console/request errors. The offline run separately records the deliberately
blocked Runware status and Modal health GETs and their resource errors. Both require no uncaught page
errors and no attempted provider session creation. Inspect the saved screenshots
as well as numerical results; the gate is not just script creation.

The full-panel Reactor fixture covers synthetic advancing frames, muted playback,
manual recovery from autoplay rejection, poster-only arrival timeout, decode error,
silent stall, failed connection/world/factory setup, interrupted connection/world
setup, a late media factory, bounded disconnect, stale SDK callbacks and unmount.
It exercises the actual component with test-only SDK aliases and real browser
MediaStream/video elements. Tokens/directions/end replies are mocked. Counters
assert no extra allocations; cleanup checks detach and ended tracks. View/baseline changes exercise the same
world without additional session creation; actual sends and acceptance are separate. Synthetic
video is explicitly labelled and **does not establish live Reactor playback**.

Expected final artifact names (preserve same-scale before/after visual evidence too):
- `reactor-final-preflight.json` and its synthetic-frame screenshot.
- `qa-final-production.json` and rest/near-c/rear screenshots.
- `qa-final-offline.json` and the complete-tour screenshot.
- Canonical command logs and aggregate `final-verification.json`.

## Preserved snapshot evidence — historical, not final candidate counts

`releases/20260912T110958Z` was frozen before the first Git commit. Its accompanying
source and runtime hashes identify it. At that freeze it passed 16 TypeScript
tests, typecheck/build, 483 GPU comparisons (max relative-scaled error 2.6e-7),
34,739 native sanitizer checks and 34,739 WASM checks. The earlier 0–0.999 tour
finished at lab 66 s / traveller 30.162733 s. Those historical values belong to
that different prescribed tour, not the current 54-second visual candidate.

The immutable fallback was browser-tested with all external connections blocked.
This finalisation rechecks all 57 runtime/export and 49 source hashes; it does not
rebuild or modify the snapshot. Prior layout checks used 1280×720 and 1440×900.
Other browsers, physical presentation hardware and a real tab-hide event have not
been verified. A unit test covers the hidden-tab clock discontinuity.

## Provider evidence boundary

Modal health/proxy inspection is read-only. Earlier actual Reactor control and
remote-end observations are described in HANDOFF.md. No new live video evidence
is claimed from this unpaid gate. Runware has no observed generated/cached image.
Existing dependency audit findings are historical; no fresh audit is claimed.
