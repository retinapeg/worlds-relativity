import { advanceClocks, advanceRamp, finite, MAX_BETA, ratios, ZERO_CLOCK, type Event1D } from '../physics/relativity';

export const PRESETS = [0, 0.6, 0.8, 0.95, 0.99] as const;
// Provider-neutral values. Camera direction is independent of the fixed +X boost.
export interface ControlInput { targetBeta: number; lookYaw: number; lookPitch: number }
const CUES = [{ at: 0, beta: 0 }, { at: 6, beta: 0.6 }, { at: 16, beta: 0.8 },
  { at: 28, beta: 0.95 }, { at: 42, beta: 0.99 }, { at: 58, beta: 0 }];
export const DEMO_DURATION = 66;
const TRANSITION_SECONDS = 3;

export class Simulation {
  input: ControlInput = { targetBeta: 0, lookYaw: 0, lookPitch: 0 };
  clocks = { ...ZERO_CLOCK };
  history: Event1D[] = [{ t: 0, x: 0 }];
  eta = 0;
  running = true;
  demoTime: number | null = null;
  private cue = 0;
  private ramp: { from: number; to: number; elapsed: number } | null = null;

  constructor(running = true) { this.running = running; }

  setVelocity(beta: number, manual = true) {
    if (finite(beta) < 0 || beta > MAX_BETA) throw new RangeError('Control beta must be in [0, 0.99]');
    if (manual) this.demoTime = null;
    this.input.targetBeta = beta;
    const to = Math.atanh(beta);
    // User changes are idealised constant-speed segment boundaries. The existing
    // tour alone retains its prescribed, exactly integrated rapidity transitions.
    if (manual || !this.running) { this.record(); this.eta = to; this.ramp = null; return; }
    if (Math.abs(to - this.eta) < 1e-12) { this.ramp = null; return; }
    this.record();
    this.ramp = { from: this.eta, to, elapsed: 0 };
  }
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
    this.demoTime = null;
    this.running = false;
  }
  startDemo() { this.reset(); this.running = true; this.demoTime = 0; this.cue = 1; }
  advance(dt: number) {
    if (finite(dt) < 0) throw new RangeError('Elapsed time must be nonnegative');
    if (!this.running) return;
    // Split at all control/demo boundaries: one long frame has the same history
    // as many short frames. Visibility suspension is handled by the UI clock.
    while (dt > 1e-10) {
      if (this.demoTime !== null && this.cue < CUES.length && this.demoTime >= CUES[this.cue].at - 1e-9) {
        this.setVelocity(CUES[this.cue++].beta, false);
      }
      if (this.demoTime !== null && this.demoTime >= DEMO_DURATION - 1e-9) {
        this.demoTime = null; this.running = false; this.record(); break;
      }
      const untilCue = this.demoTime === null ? Infinity :
        (CUES[this.cue]?.at ?? DEMO_DURATION) - this.demoTime;
      const step = Math.min(dt, untilCue, this.ramp ? Math.min(0.1, TRANSITION_SECONDS - this.ramp.elapsed) : Infinity);
      if (step <= 1e-10) break;
      if (this.ramp) {
        this.ramp.elapsed = Math.min(TRANSITION_SECONDS, this.ramp.elapsed + step);
        const next = this.ramp.from + (this.ramp.to - this.ramp.from) * this.ramp.elapsed / TRANSITION_SECONDS;
        this.clocks = advanceRamp(this.clocks, this.eta, next, step);
        this.eta = next;
        this.record(); // Curved tour intervals are sampled; manual segments stay exact.
        if (this.ramp.elapsed >= TRANSITION_SECONDS - 1e-9) {
          this.eta = this.ramp.to; this.ramp = null; this.record();
        }
      } else this.clocks = advanceClocks(this.clocks, Math.tanh(this.eta), step);
      if (this.demoTime !== null) this.demoTime += step;
      dt -= step;
    }
    if (this.demoTime !== null && this.demoTime >= DEMO_DURATION - 1e-9) {
      this.demoTime = null; this.running = false; this.record();
    }
  }
  snapshot() {
    return { ...ratios(Math.tanh(this.eta)), ...this.clocks, eta: this.eta, running: this.running,
      target: this.input.targetBeta, transitioning: this.ramp !== null, demoTime: this.demoTime,
      historyCount: this.history.length };
  }
}
export type Snapshot = ReturnType<Simulation['snapshot']>;
