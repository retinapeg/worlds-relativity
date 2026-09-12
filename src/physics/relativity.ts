/** c = 1. Time: seconds; distance: light-seconds; velocities: fractions of c.
 * S is the lab/catalogue frame. S′ moves at +beta along lab +X.
 * Sky s points TOWARD a source; the incoming photon four-vector is (nu, -nu*s).
 * Its passive Lorentz transform gives nu′/nu = gamma*(1 + beta*s.x).
 * MATH.md defines the same signs. UI bounds are narrower than the core domain.
 */
export const MAX_BETA = 0.99;
export const MAX_ETA = Math.atanh(MAX_BETA);
export type Vec3 = Readonly<{ x: number; y: number; z: number }>;
export type Event1D = Readonly<{ t: number; x: number }>;
export type ClockState = Readonly<{ lab: number; proper: number; position: number }>;
export const ZERO_CLOCK: ClockState = { lab: 0, proper: 0, position: 0 };

export function finite(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Expected a finite number');
  return value;
}
export function validateBeta(beta: number): number {
  if (Math.abs(finite(beta)) >= 1) throw new RangeError('Velocity must satisfy |beta| < 1');
  return beta;
}
export function gamma(beta: number): number {
  validateBeta(beta);
  return 1 / Math.sqrt((1 - beta) * (1 + beta));
}
export function ratios(beta: number) {
  const g = gamma(beta);
  const approach = Math.sqrt((1 + beta) / (1 - beta));
  return { beta, gamma: g, properRate: 1 / g, length: 1 / g, approach, recede: 1 / approach };
}
export function lorentz(event: Event1D, beta: number): Event1D {
  const g = gamma(beta);
  const t = finite(event.t), x = finite(event.x);
  return { t: finite(g * (t - beta * x)), x: finite(g * (x - beta * t)) };
}
export function advanceClocks(state: ClockState, beta: number, dt: number): ClockState {
  if (finite(dt) < 0) throw new RangeError('Elapsed time must be nonnegative');
  const properRate = 1 / gamma(beta);
  // Accumulate each segment. Changing velocity never reinterprets past proper time.
  return {
    lab: finite(finite(state.lab) + dt),
    proper: finite(finite(state.proper) + dt * properRate),
    position: finite(finite(state.position) + beta * dt),
  };
}
/** Exact integration over a prescribed linear-rapidity interval.
 * ∫sech(eta)deta = atan(sinh eta); ∫tanh(eta)deta = log(cosh eta).
 * This is kinematics of a chosen velocity history, not an acceleration model.
 */
export function advanceRamp(state: ClockState, from: number, to: number, dt: number): ClockState {
  validateBeta(Math.tanh(finite(from)));
  validateBeta(Math.tanh(finite(to)));
  if (finite(dt) < 0) throw new RangeError('Elapsed time must be nonnegative');
  if (Math.abs(to - from) < 1e-7) return advanceClocks(state, Math.tanh((from + to) / 2), dt);
  const scale = dt / (to - from);
  return {
    lab: finite(state.lab + dt),
    proper: finite(state.proper + scale * (Math.atan(Math.sinh(to)) - Math.atan(Math.sinh(from)))),
    position: finite(state.position + scale * (Math.log(Math.cosh(to)) - Math.log(Math.cosh(from)))),
  };
}
export function unit(v: Vec3): Vec3 {
  const scale = Math.max(Math.abs(finite(v.x)), Math.abs(finite(v.y)), Math.abs(finite(v.z)));
  if (!scale) throw new RangeError('Direction must be nonzero');
  const x = v.x / scale, y = v.y / scale, z = v.z / scale;
  const norm = Math.hypot(x, y, z);
  return { x: x / norm, y: y / norm, z: z / norm };
}
export function observe(source: Vec3, beta: number) {
  validateBeta(beta);
  const s = unit(source), eta = Math.atanh(beta);
  // Positive-term form avoids cancellation near the rear axis (MATH.md).
  const p = 0.5 * (1 + s.x) * Math.exp(eta);
  const q = 0.5 * (1 - s.x) * Math.exp(-eta);
  const doppler = p + q;
  const direction = { x: (p - q) / doppler, y: s.y / doppler, z: s.z / doppler };
  if (Math.abs(Math.hypot(direction.x, direction.y, direction.z) - 1) > 1e-9)
    throw new Error('Photon transform lost its unit norm');
  return { direction, doppler };
}
