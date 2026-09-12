# Worlds / Relativity Drive

A special-relativity cockpit with a deterministic local starfield and a separate
Reactor HappyOyster directing world. The local measurements work without provider
access. React + TypeScript + Three.js; one small FastAPI token bridge.

## Run

```sh
./scripts/start-dev.sh
```

Open http://127.0.0.1:5173. Active backend health: http://127.0.0.1:5173/api/health.
This workspace routes through the retained Modal bridge; 8787 is the optional local bridge.
The script reuses already-running local servers; otherwise it starts both.
It never installs packages or starts a paid world automatically.

First installation on another machine:

```sh
./scripts/npm.sh ci
python3.13 -m venv .venv
.venv/bin/python -m pip install -r requirements-lock.txt
cp -n .env.example .env.server
chmod 600 .env.server
```

Fill the server environment placeholders. Python 3.13 is used here because the
Mac's system Python 3.9/LibreSSL could not negotiate the Reactor TLS connection.
Node 24 is required; the wrapper can reuse the already-installed project runtime.
Provider keys never go in `VITE_*`, browser source, Git or logs.

## Use the screen

- **Run/Pause/Reset** affect only local physics. Manual speed changes join idealised
  constant-speed segments; accumulated proper time and position are preserved. Velocity changes
  are illustrative, not a propulsion or realistic acceleration programme. Adjacent
  clocks and tick indicators use actual accumulated times. The 60-lab-second
  comparison is calculated at the current constant speed, not elapsed journey time.
- Set β from 0 to 0.999, or use REST, 0.6, 0.95, 0.99 and 0.999 presets.
  The prominent 99.9% action immediately selects the strong comparison. The lab ruler measures a 100 m
  moving craft at simultaneous lab times. Its side-on ghost and ruler stay fixed;
  only longitudinal moving-ship geometry contracts. At 0.999c, 100 m becomes
  4.47 m, 95.53% shorter. This is a coordinate measurement, not a photo.
- Doppler is observed/emitted frequency. The hypothetical 550 nm line shows UV/IR
  when outside 380–750 nm. All display colour and beacon opacity are illustrative.
- The Earth-frame Minkowski diagram uses equal x and ct scales, with c=1,
  seconds and light-seconds. Returning to rest never erases the journey.
- Drag the local sky or choose Forward/Side/Rear; camera direction does not change
  the fixed +X boost. The optical baseline keeps the same camera, scene and positions
  while disabling only the optical boost, without resetting journey clocks.
  The optional 54-second tour uses prescribed 0.8-second rapidity ramps and ends
  paused at 0.999c. Manual speed, view or baseline controls interrupt the tour.
- **Start world** creates one stable cockpit/starfield world. A settled speed change
  sends a deterministic artistic direction; one request may be in flight and only
  the latest pending direction is retained. **Stop world** ends travel and disconnects.
- Video is an **AI-generated illustration — not an exact relativistic optical
  rendering.** Numerical overlays always come from our local physics. An explicit
  provider acceptance is distinguished from its scheduled instruction timeline.

## Verify / build

```sh
./scripts/npm.sh test
./scripts/npm.sh run typecheck
./scripts/npm.sh run build
.venv/bin/python -m pytest tests/test_backend.py tests/test_runware.py -q
```

Candidate output: `build/relativity-candidate`. The Vite config serves and copies
both existing Reactor SDK WASM artifacts; it does not build a new WASM toolchain.
The version-checked prepare script patches three vendor expressions to use HTTPS
media signalling and its DNS route on localhost. It runs before dev/build and
fails if the expected SDK source changes. No TLS validation is bypassed.
The preserved C++ core has its own existing native/WASM test scripts.
The final gate and evidence are in QA.md and build/evidence/final-verification.json.
HANDOFF.md is the consolidated current status.

## Protected Modal bridge

The same FastAPI app is deployed, without a GPU, at
https://retinapeg--worlds-relativity-bridge-web.modal.run.
Health, anonymous rejection and protected scoped token exchange were tested.

```sh
.venv/bin/python -m modal deploy -m backend.modal_app
```

Only the primary Reactor key and bridge secret are provided to Modal. The public
token endpoint requires `X-Demo-Access`; the local Vite proxy supplies it server-side.
A custom client header prevents simple cross-origin browser POSTs. No permissive
CORS policy is enabled. JWTs are scoped to the director model, one Reactor session,
and a 300-second session cap; a JWT stays cached for its own connection.

The local frontend now routes through this Modal backend using the server-side
`REACTOR_BACKEND_URL` setting. Clear that setting and restart Vite to use the local
8787 bridge instead. It is a URL, never a provider key; keep the same bridge secret.

Runware is wired into the protected backend for a single cached 1024×576 starting
image, passed to HappyOyster as its first frame and video poster. No image has been
generated: `RUNWARE_API_KEY` is absent and `RUNWARE_GENERATION_ALLOWANCE=0`. Generation
requires a server-side key and explicit spending scope. A persistent Modal volume
retains the request reservation and image; uncertain requests never auto-retry.

## Frozen offline fallback

```sh
./run_demo.sh --known-good
```

Normally http://127.0.0.1:4173. The immutable snapshot
`releases/20260912T110958Z` requires only Python 3 and no rebuild or downloads.
It is the earlier local-only 0–0.999 version; the new candidate does not replace it.
`./run_demo.sh` serves the candidate in isolated local-only mode (provider connections
are blocked by that static server's CSP). Use the development script for live Reactor.

No fal jobs, Claude configuration, databases, telemetry service or phone controls
are part of this MVP. The provider SDK's optional telemetry destinations remain
blocked by CSP. Its transitive dependency audit currently reports 3 high / 1 moderate
issues; no automatic dependency upgrades were applied during demo preparation.

See MATH.md, PHYSICS.md, DEMO_FREEZE.md and HANDOFF.md before continuing work.

## Live verification status

Two earlier real travels entered Reactor. The final β=0 direction was accepted
and EXECUTED, and direct remote end returned completed. Neither test produced
playable video. One preliminary readiness allocation also may be billable.
All previous allowances are exhausted. The subsequent media-origin, playback and
cleanup repairs have unpaid fixture validation only. **Live video is UNVERIFIED.**
Runware is **BLOCKED** with no key, allowance or observed cached output. Keep the
local simulation as the presentation baseline. The one proposed fresh live-test
approval, duration/spending bounds and uncertainty are specified in HANDOFF.md.

## 75-second presentation sequence

1. **0–10 s:** Reset. Point to the fixed 100 m ghost, full moving ship and equal
   clocks. Explain that measurements and the starfield are computed locally.
2. **10–20 s:** Select 0.6c: show 80 m, γ=1.25 and forward frequency ×2 / 275 nm UV.
   The ghost and ruler keep their scale; only the measured longitudinal length changes.
3. **20–35 s:** Select **Experience 99.9% of light speed**: show **100 m → 4.47 m**
   and **95.53% shorter**. Identify this as a simultaneous lab-frame measurement.
4. **35–50 s:** The experience action starts the clocks. Compare their ticks and the instantaneous **22.37 lab
   seconds per ship second**. The separate **60 lab seconds → 2.68 ship seconds**
   card is a constant-speed calculation; journey totals retain their actual history.
5. **50–65 s:** Show Side/Rear, then compare the optical baseline with transformed
   optics. The camera/scene stays the same and the clocks are not reset. State that
   false colour is educational and the generated panel is an artistic illustration.
6. **65–75 s:** Return to rest and Pause; the accumulated clock difference remains.
   Show the honest Reactor/Runware/Modal status without starting an unapproved
   session. Reset to leave a clean paused screen.

For an automatic local-only alternative, run the existing revised **54-second**
tour. It starts no provider world and finishes paused at 0.999c for inspection.
