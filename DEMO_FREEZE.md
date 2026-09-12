# DEMO FREEZE

## Active candidate — controlled finalisation, 12 September 2026

HANDOFF.md is the single current status. The later visual-priority candidate has 0–0.999 controls,
lab worldlines and a separate optional Reactor panel. Its final source commit and
measured verification are recorded in `build/evidence/final-verification.json`,
with the gate and evidence interpretation in QA.md. The completed c5669b7
0–0.99 pass is preserved under build/evidence/checkpoint-c5669b7; do not combine
its counts/tour with the subsequent visual-priority candidate. Git now has ordinary local
checkpoints; the unborn-HEAD statement below describes only the original freeze.

Live Reactor media remains **UNVERIFIED**. No new paid allowance exists. Local
synthetic media preflight is not live-provider proof. Runware is **BLOCKED**, with
no generated/cached image observed. Retain the existing Modal deployment.

Build and test candidates separately. Preserve all 57 runtime/export hashes and
49 source hashes of the original snapshot. Do not overwrite the frozen source,
assets, permissions, pointer or an existing tag. Reserve 16:00–16:30 BST for
regression and demo preparation. No new features or dependency changes.

## Preserved frozen release — historical record at 11:09 UTC

Status: FROZEN — local TypeScript/Three.js MVP
Candidate build: build/relativity-candidate
Numerical tests: 16 TypeScript tests passed; 483 browser GPU ray comparisons passed.
Preserved C++ baseline: 34,739 checks passed natively with sanitizers and in WASM.
Browser smoke test: PASSED in Codex in-app browser, including a complete 66-second tour.
Offline reload test: PASSED under CSP blocking every external request and all connections.
The machine network was not disabled; this was browser-enforced network isolation.
Known-good snapshot: releases/20260912T110958Z
Source revision: main, unborn HEAD; original work and new code remain uncommitted.
Exact source hashes: SOURCE_SHA256SUMS in the snapshot. Runtime/export hashes: SHA256SUMS.
No commit, tag, remote push or publication was made.

## Latest brief acceptance

The 12 September full-screen TypeScript/Three.js brief supersedes the earlier
product scope. The implemented local MVP has 14,000 synthetic stars, a 0–0.999
throttle, five presets, photon aberration, spectral/false-colour views, clocks, a
simultaneous lab ruler, camera look controls and the complete 66-second demo.
The GPU tests and browser evidence are recorded in QA.md. Sponsor work is deferred.

## Original acceptance checklist (preserved reference)
- Launches with one documented command.
- Starfield is visible without external requests.
- Rapidity slider and speed presets work.
- Correct forward/backward Doppler factors are displayed.
- Aberration changes apparent directions.
- Looking around does not change the boost axis.
- Reset restores exactly the initial state.
- False-colour and synthetic-data labels are visible.
- No uncaught errors or nonfinite outputs in supported controls.
- Native and WebAssembly numerical tests pass.
- Browser reload works with external internet unavailable and localhost running.

## Freezing
After successful tests and actual visual inspection, record the evidence above and export a timestamped, self-contained release containing all runtime assets.
Record the source revision and asset hashes separately; do not create a self-referential Git hash.
A local demo-mvp tag may be created if it does not already exist.
Never move or overwrite an existing tag or release.

If browser inspection is unavailable, export a CANDIDATE and mark VISUAL CHECK REQUIRED. Do not call it known-good.

## Presenting
The known-good launcher serves the frozen release, not the source or candidate output.
It performs NO installation, compilation, downloads or updates.

## Last-minute rule
No new features, dependency changes, file moves or refactors within 20 minutes of presenting.
A necessary repair is a minimal candidate patch followed by tests. Preserve the old release.

## Stop condition
Once accepted, stop building. State "MVP ready; further features deferred."
