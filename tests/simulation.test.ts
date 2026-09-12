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
  expect(reference.snapshot().beta).toBe(0);
  expect(reference.running).toBe(false);
  expect(reference.clocks.proper).toBeLessThan(reference.clocks.lab);
  for (const hz of [30, 60, 144]) {
    const simulation = new Simulation(); simulation.startDemo();
    for (let i = 0; i <= DEMO_DURATION * hz; i++) simulation.advance(1 / hz);
    expect(simulation.clocks.lab).toBeCloseTo(DEMO_DURATION, 8);
    expect(simulation.clocks.proper).toBeCloseTo(reference.clocks.proper, 8);
    expect(simulation.clocks.position).toBeCloseTo(reference.clocks.position, 8);
    expect(simulation.eta).toBe(0);
    expect(simulation.demoTime).toBe(null);
    expect(simulation.running).toBe(false);
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
  expect(() => s.setVelocity(0.99001)).toThrow();
});
