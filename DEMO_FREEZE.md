# DEMO FREEZE

## Active Worlds candidate — 12 September, 13:28 BST

The status below describes the preserved snapshot, not the newer sponsor candidate.
The current 0–0.99 candidate adds lab worldlines and a separate Reactor panel;
25 frontend tests, 12 backend tests, typecheck and production build passed. Modal
auth and real Reactor instruction execution/end were verified, but playable video
was not. The final two-origin media CSP repair is not live-retested because both
authorised travel tests are used. Do not freeze this as a verified streaming demo.
The original snapshot's 57 runtime/export and 49 source hashes still match.
Final headless production smoke and a full66-secondprovider-blocked source tour
passed (lab66.000000 s / traveller35.755318 s). Optional Runware is wired but
disabled without a key and explicit generation allowance; no image generated.

## Preserved frozen release

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
