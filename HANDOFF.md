# Worlds — controlled final handoff

12 September 2026. The deterministic local demo is the presentation baseline.
**Live Reactor video remains UNVERIFIED. All previous paid allowances are exhausted.**
No new live allocation or generation is included in this finalisation.

## Ownership and local checkpoints

The latest authorisation permits five specialist workers plus the coordinator.
Actual reused/launched roster (only the coordinator assigns work and changes Git):

| Role | Task identifier | Delivered scope / current responsibility |
| --- | --- | --- |
| Coordinator — Implement relativity hackathon MVP | 01a09533-734f-7781-871e-fb1a4854fbf0 | Shared wiring, source integration, documents, checkpoints and integrity receipt |
| 1 — Configure bounded multi-agent use | 01a09519-d3e4-7c32-adaf-3ff727741b6d | Measurement/clock and initial controls implementation; writes released |
| 2 — optics | /root/worker2_optics | Renderer verification and bounded display-exposure refinement |
| 3 — controls | /root/worker3_controls | Manual controls/tour review and exact-cue regression; writes released |
| 4 — Build Relativity Drive demo | 01a094bb-83c9-7721-a055-9cb64f3d8a07 | Unpaid sponsor review complete; sole executor of any subsequently approved live test |
| 5 — independent QA | /root/worker5_qa | Canonical final-revision suite, browser checks and evidence inspection |

The runtime permits three spawned children beside this coordinator. The two reused
app tasks fill the other roles; six project agents does not mean six are always
running. Project-local settings enable those three child slots using documented
keys; no global settings, model, permissions or active session were changed.
Strict non-overlapping ownership replaces worktree setup for this short pass.
No worker spawns children. No additional provider spending is authorised.

Recoverable baseline: `7078adaad74e78ae2783c63f8bb34b3ae90b00da` on `main`.
The completed 0–0.99 consolidation checkpoint is
`c5669b70343a3f7b7099fa9800250fd44e045a78`; its passing receipt/logs/screenshots are
preserved under `build/evidence/checkpoint-c5669b7/`. The subsequent visual brief
is a separate candidate. Its final reviewed source is the ordinary commit shown by
`git rev-parse HEAD`. Its exact hash, actual results, times and artifact names are
recorded in `build/evidence/final-verification.json`. Browser runners record the
revision and require a clean worktree. A receipt is valid only if its revision
matches HEAD, the worktree is still clean and all required checks passed.
No push, amend, reset or clean.

## Run and protect

- Start: `./scripts/start-dev.sh`; open http://127.0.0.1:5173.
- The running frontend routes through the retained Modal bridge via server-side
  `REACTOR_BACKEND_URL`. The optional local 8787 bridge was not running at the
  finalisation inspection. The start script can start it and reuses the frontend.
- Existing production preview: http://127.0.0.1:4174. If needed, start with
  `./scripts/npm.sh run preview -- --port 4174`.
- Fallback: `./run_demo.sh --known-good`, normally port 4173. No rebuilding or
  downloads. Never alter `releases/20260912T110958Z`, its source, permissions or
  pointer. The fallback has its original 0–0.999 controls and 66-second tour; the new
  candidate has the newly approved 0–0.999 controls and 54-second tour.
- Build only into `build/relativity-candidate`. Read MATH.md and DEMO_FREEZE.md.
- Reserve **16:00–16:30 BST** for regression/rehearsal; present at 16:30. No features
  or dependency changes during that window.

## Visible local demonstration

The revised candidate prioritises immediate manual presets through 0.999c, a
fixed-scale 100 m reference alongside the contracted silhouette, adjacent clocks
with accumulated-time ticks, and a calculated constant-speed rate comparison.
The optical baseline keeps camera/scene/position while disabling only the optical
transform. Manual controls interrupt the 54-second tour. All measurement and
clock values use current beta. PHYSICS.md explains the explicit visual limitations.
The visual gate checks geometry ratios and screenshots, not only text values.

## Unpaid media repair

The actual component requires nonzero dimensions and advancing decoded frames;
a poster, connected session or playing event is insufficient. Playback is muted.
Autoplay rejection exposes **Play video** on the same session. Decode errors,
60 seconds without media arrival and ten seconds without advancing frames stop
the world with readable errors. Unfinished setup/factory cancellation or uncertain
teardown requires a reload before reconnecting, preventing late setup from
interfering with a new session.

Stop/unmount detaches the retained element, stops its tracks, closes the direction
queue, cancels timers/listeners and ignores stale callbacks. Direct temporary-token
`/travels/end` acknowledgement is separate from bounded SDK disconnect and RTC
destruction. Late completion retains cleanup. SDK resolution is not an independent
billing receipt. The one-attempt factory and server session limits are unchanged.

The isolated test server substitutes SDK modules around the real ReactorPanel.
Its explicitly labelled synthetic moving stream exercises actual browser playback
and cleanup without a provider allocation. It is outside the production entry.
**These fixtures do not verify Reactor media transport.** Exact executed results
belong in the final receipt described in QA.md.

## Sponsor status

| Service | Status | Evidence and boundary |
| --- | --- | --- |
| Modal | **LIVE** | Retained CPU bridge and local proxy return health 200; proxy reports Modal hosting. Prior protected token exchange worked. No redeployment this pass. |
| Reactor control/auth | **LIVE — previously verified** | Two earlier worlds entered travel. Final β=0 direction was accepted and timeline EXECUTED; direct end returned completed. Historical evidence, not a final-revision live retest. |
| Reactor video | **UNVERIFIED** | Neither earlier travel produced playable video. Media-origin and playback repairs have unpaid validation only. |
| Runware | **BLOCKED** | No key or allowance. Status ready:false / attempted:false. No generated or cached image observed. Adapter/cache code is not successful sponsor usage. |

An earlier preliminary allocation failed readiness before world creation; count it
as potentially billable in addition to the two travels. First-travel SDK cleanup
had no observed explicit remote acknowledgement; its 300-second cap elapsed before
the second. No fresh world, Runware generation, FAL job, frontend publication or
provider switch occurred in this pass.

## One decision after the unpaid gate

Request approval for **one attempted allocation total, including failure**:
observe actual received video dimensions and advancing visible frames; change β
from 0 to 0.6; record accepted/timeline direction and describe any visible response
honestly; then confirm direct remote end and local media cleanup. No second
allocation or automatic retry.

Use the existing **300-second provider-enforced session cap**. The client stops
travel within 180 seconds of receiving travel credentials, earlier on success or
media failure. Cleanup requests direct end, bounded disconnect and RTC destruction.
Record any unconfirmed stage; the server cap is a fallback, not a billing receipt.

Proposed usage budget: **US$5**. The 12 September public director rate is
US$0.0139/second (US$0.834/minute), or **US$4.17 for 300 seconds**. Recheck pricing
before an approved attempt and abort if the maximum exceeds that budget. Duration
is enforceable; **this flow has no provider-enforced dollar cap**. GPU-ready idle
time can be billed without video; failed-allocation billing, taxes and invoice
totals remain uncertain. No top-up or billing setting change is authorised.
Sources: https://www.reactor.inc/models/happy-oyster/info,
https://docs.reactor.inc/resources/billing,
https://docs.reactor.inc/resources/rate-limits.

## Verification, security and presentation

QA.md defines the single final gate and receipt: TypeScript physics/lifecycle,
Python backend, preserved native/WASM numerics, browser GPU comparisons, real UI
smoke, complete provider-blocked 54-second tour, and separate synthetic Reactor preflight. Last sent, last acknowledged direction,
current local view and advancing media remain distinct. Camera/regime/baseline
directions are debounced and coalesced, not sent per animation frame.
Expected offline Runware request errors remain visible in evidence. Do not merge
historical counts into a claim about final HEAD.

Credentials remain server-side in ignored `.env.server` (0600) and the retained
Modal secret. Primary credentials worked earlier; previous credentials and FAL
remain unused. No browser/VITE secrets. Staged source and rebuilt candidate are
scanned without printing secrets; snapshot runtime/source hashes are checked.
Headless Chrome uses an isolated profile. No desktop Computer Use or macOS changes.

The prior SDK audit reported 3 high / 1 moderate issues; no new audit or upgrades
are claimed. Record build-size/deprecation warnings in the final receipt. Other
presentation hardware and browsers remain untested.

Use the **75-second README sequence**. Until live video is verified, show the AI
limitation/status without starting a provider world. Local MVP ready; further
features deferred.
