# RELATIVITY DRIVE — PROJECT CONTRACT

## Purpose
A two-hour hackathon physics demonstration. Correct, visible and readable beats ambitious and unfinished.

Read MATH.md and DEMO_FREEZE.md before implementation and after resuming work.

## Current user-approved extension — 12 September 2026

The user's subsequent build request supersedes the original stack and static-sky
scope below: use React/TypeScript/Vite, a separate deterministic TypeScript SR
engine, prescribed spacecraft motion, clocks, a simultaneous-measurement length
display, and a local interactive flight scene. PHYSICS.md documents these additions
without changing MATH.md's preserved sign conventions and analytic references.

The latest sponsor steer approves a small optional Reactor/HappyOyster world-visual
layer, Runware artwork, and Modal for server-side generation, secrets and caching.
The core demo must still run locally without those services. AI output supplies
illustrative visuals only, never physics. Label projection and colour limitations.
MULTIC, VEED, phone input, accounts, databases and unrelated features remain deferred.
This approval does not authorize unspecified billable calls or publication; obtain
the spending scope before live generation. Preserve the existing frozen snapshot.
All mathematical, security, review, sandbox and multi-agent safeguards still apply.

### Current bounded fly-through authorisation — 15:45 BST

The latest user brief explicitly supersedes the earlier feature freeze for this
change only: stationary lab-space polygon gates, gridded truss and tilted objects;
observer translation from the existing position accumulator; the existing photon
kernel applied once to sampled geometry; and a finite rapidity burst to 0.999c.
Use light-seconds, preserve the separate 100 m measurement, numerical engine,
commit 2f3626007fa3b01b0a839002e5ebcdf382930fe9 and immutable frozen release.
The burst adds burstPhase/burstTime to the shared snapshot; it does not add a
competing time or position source. Baseline comparison preserves the same flight.

This pass's actual ownership supersedes the older roster below:
- Coordinator: task 01a09519-d3e4-7c32-adaf-3ff727741b6d; App.tsx, style.css,
  shared integration, documentation and all Git operations.
- Reused physics_audit worker: renderer/shaders, sceneSources/course.ts and
  tests/course.test.ts only. Writes released after focused verification.
- Reused sponsor_diagnosis worker: controls/simulation.ts, controls/desktop.ts
  and their focused tests only. Writes released after focused verification.
- Reused task 01a09533-734f-7781-871e-fb1a4854fbf0: browser scripts, motion
  recording and final evidence only. No production components or Git operations.
No additional workers, provider calls or generation allowances were required.
Target integrated candidate by 16:10, regression/recording/handoff by 16:20,
presentation 16:30. Once the moving course works, stop feature work. Build the new
candidate in build/relativity-flythrough-candidate; retain the previous candidate.

## Approved MVP
- A small bundled star-direction catalogue.
- A fixed boost axis and a bounded rapidity control.
- Special-relativistic Doppler shift and aberration.
- A browser starfield, simple view controls, reset and a small numerical HUD.
- Clearly labelled educational Doppler colours.
- Focused physics tests and a separately runnable demo snapshot.

## Not approved
No spacecraft travel, acceleration integration, Andromeda mission, GR, black holes, Reissner-Nordstrom geometry, propulsion, electromagnetism simulation, radiation transport, N-body physics, cosmology, AI-generated physics, databases, accounts, backend services, telemetry, multiplayer, concurrency or speculative architecture.

No runtime internet dependency in the core demo. Sponsor integrations require separate explicit approval and must remain outside the core.

The concurrency prohibition applies to the demo's runtime architecture. Development subagents are permitted only under the MULTI-AGENT POLICY below, when they materially shorten the path to the frozen MVP.

## Mathematics
Implement MATH.md, including its frame definitions and sign conventions.
Do not change equations, constants, bounds or reference expectations to make tests pass.
If you suspect an error in the specification, explain it and stop the affected change. Do not silently follow an error or silently correct the specification.
Visual simplifications must be labelled. Never advertise false colour as a realistic human-eye rendering.

## Readable C++
Use structs, value semantics, const and small functions.
Use double for numerical calculations.
No owning raw pointers, new/delete, inheritance hierarchy, ECS, template metaprogramming or custom memory allocator.
A small non-owning pointer boundary for WebAssembly is permitted only with documented sizes, ownership and lifetime.
Do not allocate per star per frame. Do not enable fast-math.
Comment equations and coordinate conventions, not obvious syntax.

## Working method
Give a brief plan, then implement in small testable steps.
No unrelated cleanup, speculative refactors or generated boilerplate.
Do not add dependencies for hypothetical future features.
Aim for a few hundred lines of numerical code and roughly 1,000 or fewer authored code lines overall, excluding data/vendor/generated output. This is a complexity warning, not an invitation to minify code.
Stop expanding scope when a working demo exists.

## Verification
Test analytic cases, inverse transforms and finite outputs.
Run native numerical tests with supported sanitizers and run the same numerical tests compiled to WebAssembly.
Do not disable failing tests or change their expected values without approval.
A successful build is not a browser smoke test. Report which checks actually ran.

## Demo protection
Build into candidate output, never into a frozen release.
Do not edit, overwrite, delete or change permissions on a frozen snapshot.
Do not move an existing demo tag.
After freezing, changes produce a separate candidate; the known-good launcher must still work without rebuilding.
No dependency upgrades, refactors or features during the final 20 minutes before presenting.

## Permissions
No changes outside the approved project except explicitly approved setup steps.
No remote pushes, publication, purchases or billable cloud calls without explicit approval.
Never expose secrets. Do not disable safety controls.

## Current authorisation — five workers plus coordinator

The user's 12 September authorisation explicitly replaces the two-agent/no-spawn
restriction. Maximum SIX active agents across this project: coordinator plus FIVE
workers. Reuse existing workers; spawn only missing roles. Only the coordinator
may spawn or reassign. Workers must not spawn children. Respect actual runtime
limits; do not change global settings or restart sessions to increase concurrency.
Project .codex/config.toml enables three child slots for this roster; two existing
app tasks fill the other worker roles. No provider spending allowance is added.

- Worker 1: existing measurement/clock implementation owner, task
  01a09519-d3e4-7c32-adaf-3ff727741b6d.
- Worker 2: existing renderer/shaders and focused optical verification.
- Worker 3: controls/presets/tour and focused checks.
- Worker 4: existing Reactor/Runware/Modal owner, task
  01a094bb-83c9-7721-a055-9cb64f3d8a07. Only this worker may perform explicitly
  authorised live provider tests; currently no allowance remains.
- Worker 5: independent QA, browser checks and evidence; no production components.
- Coordinator: shared root wiring/global styles, package/lockfiles, simulation
  interfaces, Git mutations in this checkout, release documentation and integration.

Use separate file ownership. Existing isolated worktrees are preferred; when setup
would consume the build window, non-overlapping paths in this checkout are allowed.
Workers report a needed shared-root change to the coordinator, not a competing edit.
The current visual implementation is already usable. Verify it first; make only
concrete repairs in assigned paths, not parallel rewrites or optional new features.
Only QA runs the final canonical suite, after the coordinator records final HEAD.
Other workers run focused checks only. Never combine counts across revisions.

Shared Snapshot is frozen: current beta/eta/gamma/ratios, lab/proper/position
accumulators, target, transitioning, running, lookYaw/lookPitch (radians),
opticalBaseline, tourStage, demoTime and historyCount. All displays consume this
state. The latest visual brief approves 0–0.999, a fixed-scale length comparison,
accumulated clock ticks, same-scene optical baseline and 54-second prescribed tour.
MATH.md retains original signed analytic references; the frozen fallback is untouched.

Targets: worker implementations ready 15:30 BST; verified integration 15:50;
FEATURE FREEZE 16:00; final regression/evidence/handoff 16:20; presentation 16:30.
After 16:00 only demo-blocking repairs. Do not extend the deadline.

Keep credentials server-side. Count failed potentially billable allocations;
complete unpaid checks before one bounded live approval request. No automatic
paid retries, new infrastructure, purchases, provider changes, desktop Computer
Use, Mac locking, global permission changes or taking over keyboard/mouse.
Use isolated/headless browsers. Preserve working servers and the immutable release.
HANDOFF.md and existing freeze notes remain the single consolidated handoff.

## Final rule
This is a physics demonstration, not an engineering platform.
