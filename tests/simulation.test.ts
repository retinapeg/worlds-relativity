import { expect, it } from 'vitest';
import { advanceRamp, ZERO_CLOCK } from '../src/physics/relativity';
import { DEMO_DURATION, Simulation } from '../src/controls/simulation';
import { FrameClock } from '../src/controls/frameClock';

it('integrates a changing-velocity interval independently of frame rate', () => {
  const end = Math.atanh(0.999), exact = advanceRamp(ZERO_CLOCK, 0, end, 3);
  for (const hz of [30, 60, 144]) {
    let split = ZERO_CLOCK;
    for (let i = 0; i < hz * 3; i++) split = advanceRamp(split, end * i / (hz * 3), end * (i + 1) / (hz * 3), 1 / hz);
    expect(split.proper).toBeCloseTo(exact.proper, 10);
    expect(split.position).toBeCloseTo(exact.position, 10);
  }
});
it('completes the same presentation sequence at 30, 60 and 144 fps', () => {
  const reference = new Simulation(); reference.startDemo(); reference.advance(DEMO_DURATION);
  expect(reference.snapshot().beta).toBeCloseTo(0.999, 12);
  // Independent closed-form integrals over the three 0.8 s rapidity ramps
  // and the 1, 4.2, 9.2, 37.2 s constant-speed holds.
  expect(reference.clocks.proper).toBeCloseTo(8.452663866881027, 10);
  expect(reference.clocks.position).toBeCloseTo(50.555883989326034, 10);
  expect(reference.running).toBe(false);
  expect(reference.clocks.proper).toBeLessThan(reference.clocks.lab);
  for (const hz of [30, 60, 144]) {
    const simulation = new Simulation(); simulation.startDemo();
    for (let i = 0; i <= DEMO_DURATION * hz; i++) simulation.advance(1 / hz);
    expect(simulation.clocks.lab).toBeCloseTo(DEMO_DURATION, 8);
    expect(simulation.clocks.proper).toBeCloseTo(reference.clocks.proper, 8);
    expect(simulation.clocks.position).toBeCloseTo(reference.clocks.position, 8);
    expect(simulation.eta).toBeCloseTo(Math.atanh(0.999), 12);
    expect(simulation.demoTime).toBe(null);
    expect(simulation.running).toBe(false);
  }
});
it('applies tour cues at exact boundaries without advancing the new velocity ramp', () => {
  const boundaries = [
    [1, 0, 0.6, 0, false, true],
    [6, 0.6, 0.99, 0, false, true],
    [16, 0.99, 0.999, 0, false, true],
    [29, 0.999, 0.999, Math.PI / 2, false, false],
    [34, 0.999, 0.999, Math.PI, false, false],
    [40, 0.999, 0.999, 0, false, false],
    [44, 0.999, 0.999, 0, true, false],
    [48, 0.999, 0.999, 0, false, false],
  ] as const;
  for (const [at, beta, target, lookYaw, opticalBaseline, transitioning] of boundaries) {
    const s = new Simulation(); s.startDemo(); s.advance(at);
    const snapshot = s.snapshot();
    expect(snapshot).toMatchObject({ target, lookYaw, opticalBaseline, transitioning });
    expect(snapshot.beta).toBeCloseTo(beta, 12);
    expect(snapshot.lab).toBeCloseTo(at, 12);
  }
});
it('pauses exactly, resets exactly, and cancels demo on manual throttle input', () => {
  const s = new Simulation(); s.startDemo(); s.advance(20);
  s.running = false;
  const before = s.snapshot(); s.advance(1000); expect(s.snapshot()).toEqual(before);
  s.setVelocity(0.8); expect(s.demoTime).toBe(null);
  expect(s.clocks.proper).toBe(before.proper);
  s.reset(); expect(s.clocks).toEqual(ZERO_CLOCK);
  expect(s.history).toEqual([{ t: 0, x: 0 }]);
  expect(s.running).toBe(false);
  for (const bad of [1, 0.9991, -0.1, NaN, Infinity]) expect(() => s.setVelocity(bad)).toThrow();
});
it('does not count hidden-tab time, including when no animation frame runs while hidden', () => {
  const clock = new FrameClock(), simulation = new Simulation();
  simulation.setVelocity(0.9);
  simulation.advance(clock.elapsed(1000, true));
  simulation.advance(clock.elapsed(2000, true));
  const before = simulation.snapshot();
  clock.suspend(); // visibilitychange fires even if requestAnimationFrame is suspended
  simulation.advance(clock.elapsed(3620000, true));
  expect(simulation.snapshot()).toEqual(before);
  simulation.advance(clock.elapsed(3620100, true));
  expect(simulation.clocks.lab).toBeCloseTo(1.1, 10);
  expect(clock.elapsed(4000000, false)).toBe(0);
  expect(clock.elapsed(5000000, true)).toBe(0);
});
it('preserves the actual 18-second proper-time history across manual speed changes', () => {
  const s = new Simulation(); s.advance(10); s.setVelocity(0.6); s.advance(10);
  expect(s.clocks.lab).toBe(20);
  expect(s.clocks.proper).toBeCloseTo(18, 12);
  expect(s.clocks.position).toBeCloseTo(6, 12);
  expect(s.history).toEqual([{ t: 0, x: 0 }, { t: 10, x: 0 }]);
  expect(() => s.setVelocity(0.99901)).toThrow();
});
it('shows contraction within five seconds and lets each manual control interrupt the tour', () => {
  for (const manual of [(s: Simulation) => s.setVelocity(0.999),
    (s: Simulation) => s.setLook(Math.PI), (s: Simulation) => s.setOpticalBaseline(true)]) {
    const s = new Simulation(); s.startDemo(); s.advance(5);
    expect(s.snapshot().beta).toBeCloseTo(0.6, 12);
    const history = { ...s.clocks };
    manual(s);
    expect(s.demoTime).toBeNull();
    expect(s.snapshot().transitioning).toBe(false);
    expect(s.clocks).toEqual(history);
  }
});
it('baseline and camera preserve physical state, and .999 changes future clock rate only', () => {
  const s = new Simulation(); s.advance(10); s.setVelocity(0.6); s.advance(10);
  const before = s.snapshot();
  s.setLook(Math.PI); s.setOpticalBaseline(true);
  for (const key of ['beta', 'gamma', 'lab', 'proper', 'length', 'position'] as const)
    expect(s.snapshot()[key]).toBe(before[key]);
  s.setVelocity(0.999);
  expect(s.snapshot().beta).toBeCloseTo(0.999, 12);
  expect(s.clocks.proper).toBeCloseTo(18, 12);
  s.advance(60);
  expect(s.clocks.proper - 18).toBeCloseTo(2.682610668732977, 12);
  s.reset(); expect(s.opticalBaseline).toBe(false); expect(s.input.lookYaw).toBe(0);
});
