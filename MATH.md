# RELATIVITY DRIVE — FROZEN MVP MATHEMATICS

## Active Worlds candidate, 12 September 2026
The 14:32 BST visual-priority brief extends the **current TypeScript UI** to 0 ≤ β ≤ 0.999
and authorises accumulated 1D clock/position history plus optional generated
illustration. c=1; lab time is seconds and x is light-seconds. Manual changes
join constant-speed segments: Δτ=Δt/γ and Δx=βΔt. Past proper time is never
recomputed. The lab-frame worldline plot uses equal x and ct scales.
The original C++ snapshot bounds and analytic references below remain unchanged.
The approved existing approximate spectrum option remains labelled illustrative;
the Reactor video is never the authoritative optical or numerical result.

## Model and frames
Flat spacetime. Distant stationary sources define catalogue frame S.
The observer frame S' moves relative to S. We display snapshots of observer velocity, not a simulated accelerated journey.

s is a UNIT vector pointing from observer toward source in S.
Incoming photon propagation is in direction -s.
u is the UNIT boost-axis vector in S, initially (1,0,0).
Camera look direction is independent of u. Turning the camera does not change velocity.
mu = dot(u,s).
Use radians for angles and nanometres for displayed wavelengths.

## Rapidity
eta is signed rapidity along u.
beta = tanh(eta)
gamma = cosh(eta)

UI range: 0 <= eta <= atanh(0.9999).
Core tests may use negative eta within the corresponding symmetric bound.
Reject nonfinite inputs and rapidities outside this declared domain.
Do not reconstruct gamma from a rounded displayed beta.

## Doppler factor
D = frequency_in_observer_frame / frequency_in_catalogue_frame
D = cosh(eta) + mu*sinh(eta)
wavelength_observer = wavelength_catalogue / D

Use this equivalent positive-term expression for numerical evaluation:
p = 0.5*(1+mu)*exp(eta)
q = 0.5*(1-mu)*exp(-eta)
D = p+q
A = p-q

For finite eta and -1 <= mu <= 1:
exp(-abs(eta)) <= D <= exp(abs(eta)).
D is strictly positive. No division by cos(theta) is involved.

## Aberration
s_perp = s - mu*u
s_prime = (s_perp + A*u) / D

Equivalent analytic check:
mu_prime = (mu+beta)/(1+beta*mu)

Do not apply a separate length-contraction squeeze to these sky directions.
Do not apply the boost a second time in a shader.

## The two different 90-degree statements
Source at 90 degrees in CATALOGUE frame: mu=0, D=gamma.
Source observed at 90 degrees in OBSERVER frame: mu_prime=0, D=1/gamma.
These are different source directions. Do not confuse them or change a test to hide the distinction.

## Fixed analytic reference cases
eta=0: D=1 and s_prime=s.

For u=(1,0,0), beta=0.6 and eta=ln(2):
gamma=1.25.
s=(1,0,0): D=2, s_prime=(1,0,0).
s=(-1,0,0): D=0.5, s_prime=(-1,0,0).
s=(0,1,0): D=1.25, s_prime=(0.6,0.8,0).
s=(-0.6,0.8,0): D=0.8, s_prime=(0,1,0).

For a hypothetical 550 nm calibration line at beta=0.6:
forward -> 275 nm;
backward -> 1100 nm;
catalogue-frame transverse -> 440 nm.

Forward D=exp(eta); backward D=exp(-eta).
Their product is 1.
Applying the inverse boost (-eta, same axis) to s_prime recovers s.
Forward and inverse Doppler factors for that same ray multiply to 1.

## Numerical handling
Validate before normalising. Reject zero-length and nonfinite direction vectors.
Normalise valid input directions once. Clamp mu to [-1,1] only to remove floating-point roundoff, not to disguise invalid vectors.
Check output finiteness and unit norm before any final numerical renormalisation. A substantial norm error is a bug, not something to hide.
Keep raw D and wavelength unchanged by artistic display clamps.
Projection clipping belongs to the renderer, not to Doppler physics.

## Colour and brightness scope
The MVP uses an EDUCATIONAL FALSE-COLOUR map of log(D):
D>1 -> blue side of the legend;
D=1 -> neutral;
D<1 -> red side of the legend.

Visible label: "Doppler false colour — not literal eye appearance".
This visualisation encodes a frequency ratio, not a spectrum-to-RGB calculation.

Show a numerical readout for the hypothetical 550 nm calibration line.
A shifted calibration line may lie outside the visible band. Do not claim that an entire broadband star disappears merely because this one line does.

Keep point brightness illustrative and fixed for this MVP. No arbitrary D^3 brightness multiplier presented as exact photometry. No blackbody or spectral renderer yet.

## Reference
Yasini and Pierpaoli, arXiv:1709.08298, equations 2-6, give the Doppler/aberration relations with these sky-direction conventions.
https://arxiv.org/html/1709.08298v2
The positive-term rapidity form above follows by expanding cosh and sinh.
