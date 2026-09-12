# Current browser mathematics

This supplements, and does not modify, the preserved MATH.md reference.
The latest user brief adds clocks, a coordinate ruler and a 0–0.99 velocity UI.

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
between endpoints at equal S time. The ruler is an independent measurement
diagram, without a claim about a camera image or the apparent shape of the stars.

Manual controls change immediately between constant-speed segments. Only the optional tour prescribes linear rapidity over three lab seconds, with no dynamics.
Over a ramp from eta0 to eta1 lasting dt:

```
deltaTau = dt * (atan(sinh(eta1)) - atan(sinh(eta0))) / (eta1 - eta0)
deltaX = dt * (log(cosh(eta1)) - log(cosh(eta0))) / (eta1 - eta0)
```

Near equal rapidities the constant midpoint limit avoids subtractive cancellation.
The integrator splits steps at ramp and demo-cue boundaries and keeps historical
clock totals, positions and segment endpoints. A visibility boundary resets the
wall-clock timestamp. Long hidden intervals do not advance this educational timeline.

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
numerical readouts are unaffected by either colour mode.

## Lab worldlines and generated illustration

The lab worldline preserves accumulated position and time. Straight manual
segments retain their endpoints; tour ramps retain samples. x and ct share one
scale so a light ray is 45 degrees. Hidden-tab intervals are omitted from the
educational timeline rather than producing a jump on return.

Stationary light beacons are 2 light-seconds apart. Their lab position is fixed
during light travel; their source directions receive one CPU aberration transform,
then projection only in the shader. Opacity is illustrative.

Reactor video occupies a separate panel. It is not transformed as a calibrated
full-sphere source. Its direction sentence reads the same physics snapshot, but
it never calculates gamma or supplies numerical overlays. Instruction acceptance
proves scheduling only, not optical correctness or immediate synchronisation.
