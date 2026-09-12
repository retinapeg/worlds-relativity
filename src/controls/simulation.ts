import { advanceClocks, advanceRamp, finite, MAX_BETA, ratios, ZERO_CLOCK, type Event1D } from '../physics/relativity';

export const PRESETS = [0, 0.6, 0.95, 0.99, 0.999] as const;
// Provider-neutral values. Camera direction is independent of the fixed +X boost.
export interface ControlInput { targetBeta: number; lookYaw: number; lookPitch: number }
const CUES = [
  { at: 0, beta: 0, yaw: 0, baseline: false, stage: 'The same universe, at rest' },
  { at: 1, beta: 0.6, stage: '100 metres becomes 80 metres' },
  { at: 6, beta: 0.99, stage: 'Look at the ship on the fixed ruler' },
  { at: 16, beta: 0.999, stage: '4.47 metres. Two very different clocks.' },
  { at: 29, yaw: Math.PI / 2, stage: 'Side view — the boost still points forward' },
  { at: 34, yaw: Math.PI, stage: 'Behind you, light is redshifted' },
  { at: 40, yaw: 0, stage: 'Ahead, the sky gathers into a cone' },
  { at: 44, baseline: true, stage: 'Optical baseline — same camera and position' },
  { at: 48, baseline: false, stage: 'Relativity restored. Take the controls.' },
];
export const DEMO_DURATION = 54;
const TRANSITION_SECONDS = 0.8;
export const BURST_BASELINE = 0.1;
export type BurstPhase = 'BRAKING' | 'ACCELERATING' | 'COASTING';

export class Simulation {
  input: ControlInput = { targetBeta: 0, lookYaw: 0, lookPitch: 0 };
  clocks = { ...ZERO_CLOCK };
  history: Event1D[] = [{ t: 0, x: 0 }];
  eta = 0;
  running = true;
  demoTime: number | null = null;
  opticalBaseline = false;
  private cue = 0;
  private ramp: { from: number; to: number; elapsed: number; duration: number } | null = null;
  private burst: { phase: BurstPhase; elapsed: number; time: number; duration: number; slowHold: boolean; finalBrake: boolean } | null = null;

  constructor(running = true) { this.running = running; }

  setVelocity(beta: number, manual = true, duration = TRANSITION_SECONDS) {
    if (finite(beta) < 0 || beta > MAX_BETA) throw new RangeError('Control beta must be in [0, 0.999]');
    if (finite(duration) <= 0) throw new RangeError('Transition duration must be positive');
    if (manual) { this.burst = null; this.stopDemo(); }
    this.input.targetBeta = beta;
    const to = Math.atanh(beta);
    // User changes are idealised constant-speed segment boundaries. The existing
    // tour and finite burst retain their exactly integrated rapidity transitions.
    if (manual || !this.running) { this.record(); this.eta = to; this.ramp = null; return; }
    if (Math.abs(to - this.eta) < 1e-12) { this.ramp = null; return; }
    this.record();
    this.ramp = { from: this.eta, to, elapsed: 0, duration };
  }
  stopDemo() {
    this.demoTime = null;
    // Looking around or bypassing the optics must preserve the same flight.
    if (!this.burst) { this.ramp = null; this.input.targetBeta = Math.tanh(this.eta); }
    this.record();
  }
  startBurst() {
    this.burst = null; this.stopDemo(); this.running = true;
    const braking = Math.tanh(this.eta) > 0.2;
    this.burst = { phase: braking ? 'BRAKING' : 'COASTING', elapsed: 0, time: braking ? -0.6 : 0,
      duration: braking ? 0.6 : 1, slowHold: !braking, finalBrake: false };
    // Preserve continuity even when the user starts from rest instead of slow flight.
    this.setVelocity(BURST_BASELINE, false, this.burst.duration);
  }
  private applyBurstBoundary() {
    const burst = this.burst;
    if (!burst || burst.elapsed < burst.duration - 1e-9) return;
    burst.elapsed = 0;
    if (burst.phase === 'BRAKING' && burst.finalBrake) { this.burst = null; this.record(); }
    else if (burst.phase === 'BRAKING') { burst.phase = 'COASTING'; burst.slowHold = true; burst.duration = 1; burst.time = 0; }
    else if (burst.slowHold) { burst.phase = 'ACCELERATING'; burst.slowHold = false; burst.duration = 1; this.setVelocity(MAX_BETA, false, 1); }
    else if (burst.phase === 'ACCELERATING') { burst.phase = 'COASTING'; burst.duration = 3; }
    else { burst.phase = 'BRAKING'; burst.finalBrake = true; burst.duration = 1.5; this.setVelocity(BURST_BASELINE, false, 1.5); }
  }
  setLook(yaw: number, pitch = 0) {
    this.stopDemo();
    this.input.lookYaw = finite(yaw); this.input.lookPitch = finite(pitch);
  }
  setOpticalBaseline(enabled: boolean) { this.stopDemo(); this.opticalBaseline = enabled; }
  private record() {
    const last = this.history[this.history.length - 1];
    if (last.t !== this.clocks.lab) this.history.push({ t: this.clocks.lab, x: this.clocks.position });
  }
  reset() {
    this.clocks = { ...ZERO_CLOCK };
    this.input = { targetBeta: 0, lookYaw: 0, lookPitch: 0 };
    this.history = [{ t: 0, x: 0 }];
    this.eta = 0;
    this.ramp = null;
    this.burst = null;
    this.demoTime = null;
    this.opticalBaseline = false;
    this.running = false;
  }
  startDemo() { this.reset(); this.running = true; this.demoTime = 0; this.cue = 1; }
  private applyCues() {
    while (this.demoTime !== null && this.cue < CUES.length && this.demoTime >= CUES[this.cue].at - 1e-9) {
      const cue = CUES[this.cue++];
      if (cue.beta !== undefined) this.setVelocity(cue.beta, false);
      if (cue.yaw !== undefined) { this.input.lookYaw = cue.yaw; this.input.lookPitch = 0; }
      if (cue.baseline !== undefined) this.opticalBaseline = cue.baseline;
    }
  }
  advance(dt: number) {
    if (finite(dt) < 0) throw new RangeError('Elapsed time must be nonnegative');
    if (!this.running) return;
    // Split at all control/demo boundaries: one long frame has the same history
    // as many short frames. Visibility suspension is handled by the UI clock.
    while (dt > 1e-10) {
      this.applyCues();
      this.applyBurstBoundary();
      if (this.demoTime !== null && this.demoTime >= DEMO_DURATION - 1e-9) {
        this.demoTime = null; this.running = false; this.record(); break;
      }
      const untilCue = this.demoTime === null ? Infinity :
        (CUES[this.cue]?.at ?? DEMO_DURATION) - this.demoTime;
      const untilBurst = this.burst === null ? Infinity :
        this.burst.duration - this.burst.elapsed;
      const step = Math.min(dt, untilCue, untilBurst, this.ramp ? Math.min(0.1, this.ramp.duration - this.ramp.elapsed) : Infinity);
      if (step <= 1e-10) break;
      if (this.ramp) {
        this.ramp.elapsed = Math.min(this.ramp.duration, this.ramp.elapsed + step);
        const next = this.ramp.from + (this.ramp.to - this.ramp.from) * this.ramp.elapsed / this.ramp.duration;
        this.clocks = advanceRamp(this.clocks, this.eta, next, step);
        this.eta = next;
        this.record(); // Curved prescribed intervals are sampled; manual segments stay exact.
        if (this.ramp.elapsed >= this.ramp.duration - 1e-9) {
          this.eta = this.ramp.to; this.ramp = null; this.record();
        }
      } else this.clocks = advanceClocks(this.clocks, Math.tanh(this.eta), step);
      if (this.demoTime !== null) this.demoTime += step;
      if (this.burst) { this.burst.elapsed += step; this.burst.time += step; }
      dt -= step;
    }
    this.applyCues();
    this.applyBurstBoundary();
    if (this.demoTime !== null && this.demoTime >= DEMO_DURATION - 1e-9) {
      this.demoTime = null; this.running = false; this.record();
    }
  }
  snapshot() {
    return { ...ratios(Math.tanh(this.eta)), ...this.clocks, eta: this.eta, running: this.running,
      target: this.input.targetBeta, transitioning: this.ramp !== null, demoTime: this.demoTime,
      burstPhase: this.burst?.phase ?? null, burstTime: this.burst?.time ?? null,
      lookYaw: this.input.lookYaw, lookPitch: this.input.lookPitch, opticalBaseline: this.opticalBaseline,
      tourStage: this.demoTime === null ? '' : CUES[Math.max(0, this.cue - 1)].stage,
      historyCount: this.history.length };
  }
}
export type Snapshot = ReturnType<Simulation['snapshot']>;
