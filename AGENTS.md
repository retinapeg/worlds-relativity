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

## MULTI-AGENT POLICY

Maximum active agents: exactly 2 total — the original core engineer and the
single existing demo/integration agent. This supersedes the earlier three-subagent
allowance. Do not create additional, replacement, sibling, QA or media agents.
Do not delegate recursively. Stop all other agents while preserving useful work.

Agent 1 (original core engineer) owns physics, Reactor integration, Modal/backend,
shared state and final integration.

Agent 2 (existing demo/integration agent) owns frontend/demo polish, browser
testing, UI fixes and the demo script. VEED/OpenEdit is allowed only after the
app works. Both may inspect the whole repo, but never edit the same files at once.

The restrictions below apply to work performed by these two existing agents;
they do not authorize spawning anyone else. New agents require a new explicit
user instruction.

Subagents may be used only for:

- independent physics verification
- C++/WASM debugging
- numerical test review
- browser/rendering diagnosis
- official documentation lookup
- investigation of blockers that can be worked independently

Subagents must NOT be used for:

- brainstorming new features
- expanding the physics model
- general relativity
- electromagnetism
- propulsion features
- speculative architecture
- large refactors
- productionisation
- adding unnecessary dependencies
- rewriting working code
- parallel implementations of the same subsystem

Subagents may NOT spawn further subagents.

The parent Astra/Codex agent remains the final authority and integrator.

Never allow two agents to edit the same files concurrently.

If a subagent needs write access:

- use an isolated Git worktree or branch
- keep its file ownership clearly separated
- parent reviews and tests before integration

Prefer read-only verification subagents whenever possible.

All subagent output is untrusted until reviewed and tested by the parent.

If the MVP is already working, spend extra compute on verification and reliability, not new features.

DO NOT weaken sandboxing, approvals, permission boundaries, or repository safeguards.

## Final rule
This is a physics demonstration, not an engineering platform.
