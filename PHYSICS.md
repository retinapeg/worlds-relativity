# Current browser mathematics

This supplements, and does not modify, the preserved MATH.md reference.
The latest user brief adds prominent clock/length comparisons, an optical baseline
comparison and a validated 0–0.999 velocity UI. All use the current simulation state.

## Photon transformation

Lab S has stationary sources. Observer S′ moves at beta along +X.
Use c = 1. A photon with catalogue frequency nu arriving from sky direction
s has four-momentum proportional to (nu, −nu*s.x, −nu*s.y, −nu*s.z).

A passive Lorentz boost gives nu′ = gamma*nu*(1 + beta*s.x). With
eta = atanh(beta), mu = s.x, and unit s:

```
p = (1 + mu) * exp(eta) / 2
q = (1 - mu) * exp(-eta) / 2
D = p + q
s′ = ((p - q)/D, s.y/D, s.z/D)
```

The star vertex shader maps source → observed rays. The background fragment
shader maps each observed pixel back to the source using −eta, then samples the
equirectangular background. For that inverse mapping the forward D is the
reciprocal of the inverse ray's D. Neither layer is boosted twice. Camera rotation
is applied separately. No length-contraction scaling is applied to sky rays.

At beta=.6, gamma=1.25: the forward/backward ratios are 2 and .5; catalogue
transverse light has D=1.25 and direction (.6,.8,0). A source (−.6,.8,0)
appears transverse in S′ and has D=.8. The two transverse statements differ.
The startup GPU probe checks 483 rays against the CPU implementation, including
negative boosts, endpoints and these analytic references. Its 2e−4 relative-scaled
tolerance covers float32 shader arithmetic; numerical CPU tests use tighter tolerances.

## Clocks and the measurement rod

```
gamma = 1 / sqrt((1 - beta)*(1 + beta))
dTau = dt / gamma
dx = beta * dt
L_lab / L_rest = 1 / gamma
t′ = gamma * (t - beta*x)
x′ = gamma * (x - beta*t)
```

The 100 m rod is defined to move with the observer. Its length in S is measured
between endpoints at equal S time. The ruler is an independent, side-on, fixed-scale measurement
diagram. Its 100 m ghost/reference stays fixed; only the moving silhouette
contracts along +X, retaining transverse dimensions. Labels are outside that
transform. There is no minimum width or auto-fit. This is not a camera image.
At β=.999, γ≈22.366272 and L≈4.471018 m: 95.528982% shorter.

Both journey clocks integrate actual accumulated times; their tick animations use
those same times. The separate constant-speed comparison is calculated, not
already elapsed journey time: at β=.999, 60 lab seconds correspond to about
2.682611 ship seconds. The instantaneous rate is 1 ship second per 22.366272 lab
seconds. Returning to rest never recomputes past proper time.

Manual controls change immediately between constant-speed segments and interrupt
the tour. These are labelled illustrative changes of velocity, not a dynamical
acceleration model. The optional tour and short burst prescribe linear rapidity
over 0.8 lab seconds, with no dynamics.
Over a ramp from eta0 to eta1 lasting dt:

```
deltaTau = dt * (atan(sinh(eta1)) - atan(sinh(eta0))) / (eta1 - eta0)
deltaX = dt * (log(cosh(eta1)) - log(cosh(eta0))) / (eta1 - eta0)
```

Near equal rapidities the constant midpoint limit avoids subtractive cancellation.
The integrator splits steps at ramp and demo-cue boundaries and keeps historical
clock totals, positions and segment endpoints. The revised 54-second tour reaches
0.6c after 1 second, 0.99c at 6 seconds and 0.999c at 16 seconds, each with its
0.8-second prescribed transition. It then shows side (29 s), rear (34 s), forward
(40 s), optical baseline (44 s) and transformed optics again (48 s), finishing
paused at 0.999c at 54 seconds. Manual speed, view or baseline control interrupts
the automated sequence. A visibility boundary resets the
wall-clock timestamp. Long hidden intervals do not advance this educational timeline.

The finite burst uses the same ramp integrator and historical accumulators: from
low speed, ramp to 0.999c in 0.8 lab seconds, hold for 1.5, then ramp to 0.2c in
0.8 and continue cruising. A start above 0.2c first brakes to 0.2c over 0.8 seconds.
Position and clocks never reset during a burst. Manual speed input cancels it;
pause freezes its phase and all accumulators, reset clears it, and camera or
optical-baseline changes preserve it. The phase timer schedules transitions only;
it is advanced by the same lab timestep, not a separate animation clock.

## Colour approximation

Each star has a deterministic synthetic temperature of 2,800–14,800 K. The display
samples Planck B_lambda at 650, 550 and 450 nm. The second radiation constant is
hc/k = 1.438776877×10⁷ nm·K. A shifted blackbody has chromaticity corresponding
to T′ = D*T. Three wavelengths are only an RGB approximation, not CIE integration.

RGB is normalized to the maximum sample. A coarse visible-power estimate scales
the sampled power by T⁻⁴ (normalizing bolometric output), then is compressed by
a power of .2. This artistic exposure compresses a huge dynamic range; it is not
an exact relativistic intensity law. Point sizes are illustrative and fixed.
No D³ or D⁴ multiplier is advertised as exact photometry. Spectra become redder
and dimmer in infrared, bluer and eventually dimmer in ultraviolet; hue never wraps.
Broadband stars are not declared absent because of a single shifted spectral line.

The procedural nebula uses a qualitative spectral tint. The optional frequency
map has explicitly labelled false colours and display-only clamps. Raw D and the
numerical readouts are unaffected by either colour mode. The additive star layer
uses display-only exposure compensation `1 / (1 + 0.2 max(D − 1, 0)²)` after
colour-space conversion. This reduces a clipped white patch where aberration
crowds many stars together. It leaves D ≤ 1 stars, background, point sizes and
ray directions unchanged. It is an artistic readability adjustment, not a
relativistic intensity law; all numerical frequency/length/clock values are raw.

The optical baseline uses the same scene, camera and lab reference positions with
only the optical boost set to zero. Measurement beta, clocks and accumulated
position remain unchanged. The baseline is explicitly labelled. It does not
squash the cockpit or generated video, and does not modify the physical ratios.

## Lab worldlines and generated illustration

The lab worldline preserves accumulated position and time. Straight manual
segments retain their endpoints; tour ramps retain samples. x and ct share one
scale so a light ray is 45 degrees. Hidden-tab intervals are omitted from the
educational timeline rather than producing a jump on return.

The current fly-through replaces periodic beacons with fixed world geometry:
double polygon gates every 0.45 light-seconds, a gridded side truss/floor rails and
eight tilted box frames. All distances use light-seconds, with c = 1 light-second
per lab second. The course spans x = −1.8 to 72 light-seconds; objects are never
recycled or teleported. This finite extent eventually ends during a long flight.
The separate 100 m ruler is not a scale model of this course.

Each edge is subdivided into at most 0.025-light-second segments. The GPU subtracts
the current observer x, normalizes the source ray, applies the shared verified
photon kernel once and then camera projection. No additional 1/gamma scaling is
applied. Stationary continuously emissive objects have fixed emission positions,
so no moving-source history is needed. Homogeneous projection clips sampled line
segments at the camera plane; geometry stays off the observer axis and a
near-zero-distance guard avoids invalid normalization. Thin wires, sampled curved
edges, illustrative opacity and white-biased Doppler false colour are display
approximations, not exact photography or radiometry. The distant nebula exposure
is reduced to keep nearby geometry legible; raw D and measurements are unchanged.

Reactor remains mounted in a compact status panel until advancing decoded frames
are observed, then expands into a secondary view. Layout changes neither start
nor stop provider sessions. It is not transformed as a calibrated
full-sphere source. Its direction sentence reads the same physics snapshot, but
it never calculates gamma or supplies numerical overlays. Instruction acceptance
proves scheduling only, not optical correctness or immediate synchronisation.
Directions coalesce meaningful speed regimes, broad view changes and the optical
baseline. A 450 ms debounce and one request in flight prevent per-frame traffic.
The latest pending direction replaces older pending values. Current local state,
last actual send, last acknowledgement and frame-confirmed playback are distinct;
an old accepted beta can legitimately describe the same unchanged artistic regime.
A displayed timeline belongs to that acknowledged instruction, not current beta.
