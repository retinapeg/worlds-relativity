import { expect, it } from 'vitest';
import { advanceRamp, ZERO_CLOCK } from '../src/physics/relativity';
import { BURST_BASELINE, DEMO_DURATION, Simulation } from '../src/controls/simulation';
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
    (s: Simulation) => s.setLook(Math.PI)]) {
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

it('bursts continuously from rest, coasts, brakes and keeps flying at low speed', () => {
  const s = new Simulation(); s.advance(5);
  const before = { ...s.clocks };
  s.startBurst();
  expect(s.clocks).toEqual(before);
  expect(s.snapshot()).toMatchObject({ beta: 0, burstPhase: 'COASTING', burstTime: 0 });
  s.advance(1);
  expect(s.snapshot().burstPhase).toBe('ACCELERATING');
  expect(s.snapshot().beta).toBeCloseTo(BURST_BASELINE, 12);
  s.advance(0.5);
  expect(s.eta).toBeCloseTo((Math.atanh(BURST_BASELINE) + Math.atanh(0.999)) / 2, 12);
  s.advance(0.5);
  expect(s.snapshot()).toMatchObject({ burstPhase: 'COASTING', transitioning: false });
  expect(s.snapshot().beta).toBeCloseTo(0.999, 12);
  const position = s.clocks.position;
  s.advance(3);
  expect(s.clocks.position - position).toBeCloseTo(3 * 0.999, 12);
  expect(s.snapshot().burstPhase).toBe('BRAKING');
  s.advance(0.5);
  expect(s.eta).toBeCloseTo((Math.atanh(0.999) + Math.atanh(BURST_BASELINE)) / 2, 12);
  s.advance(0.5);
  expect(s.snapshot()).toMatchObject({ burstPhase: null, burstTime: null, transitioning: false, running: true });
  expect(s.snapshot().beta).toBeCloseTo(BURST_BASELINE, 12);
  const recovery = { ...s.clocks };
  s.advance(2);
  expect(s.clocks.position - recovery.position).toBeCloseTo(2 * BURST_BASELINE, 12);
  expect(s.clocks.proper - recovery.proper).toBeCloseTo(2 * Math.sqrt(1 - BURST_BASELINE ** 2), 12);
});

it('brakes before a new burst at .999 without resetting the journey or repeating automatically', () => {
  const s = new Simulation(); s.setVelocity(0.999); s.advance(8);
  const before = { ...s.clocks };
  s.startBurst();
  expect(s.clocks).toEqual(before);
  expect(s.snapshot().burstPhase).toBe('BRAKING');
  expect(s.snapshot().beta).toBeCloseTo(0.999, 12);
  expect(s.snapshot().burstTime).toBe(-0.6);
  s.advance(0.6);
  expect(s.snapshot().burstPhase).toBe('COASTING');
  expect(s.snapshot().burstTime).toBe(0);
  expect(s.snapshot().beta).toBeCloseTo(BURST_BASELINE, 12);
  s.advance(2);
  expect(s.snapshot().burstPhase).toBe('COASTING');
  expect(s.snapshot().beta).toBeCloseTo(0.999, 12);
  expect(s.snapshot().burstTime).toBeCloseTo(2, 12);
  s.advance(4);
  expect(s.snapshot().burstPhase).toBeNull();
  s.advance(20);
  expect(s.snapshot().beta).toBeCloseTo(BURST_BASELINE, 12);
  expect(s.clocks.lab).toBeCloseTo(before.lab + 26.6, 10);
  expect(s.clocks.position).toBeGreaterThan(before.position);
});

it('integrates each finite burst identically across frame rates and long frames', () => {
  // Independent analytic totals for the new 6 s programme: low introduction,
  // 1 s ramp, 3 s high hold, 1 s braking; high starts add .6 s pre-braking.
  for (const [initial, proper, position] of [
    [0, 5.883193402095822, 5.124187217109926],
    [0.999, 5.5140980620868145, 5.617234540219598],
  ]) {
    for (const hz of [0.1, 30, 60, 144]) {
      const s = new Simulation(); s.setVelocity(initial); s.startBurst();
      for (let i = 0; i < 10 * hz; i++) {
        s.advance(1 / hz);
        const snapshot = s.snapshot();
        expect(snapshot.beta).toBeGreaterThanOrEqual(0);
        expect(snapshot.beta).toBeLessThanOrEqual(0.999);
        expect(Number.isFinite(snapshot.position)).toBe(true);
      }
      expect(s.clocks.lab).toBeCloseTo(10, 9);
      expect(s.clocks.proper).toBeCloseTo(proper, 9);
      expect(s.clocks.position).toBeCloseTo(position, 9);
      expect(s.snapshot().burstPhase).toBeNull();
    }
  }
});

it('pauses a burst exactly, cancels on manual throttle and clears it on reset', () => {
  const s = new Simulation(); s.startDemo(); s.advance(12); s.startBurst();
  expect(s.demoTime).toBeNull();
  s.advance(0.25); s.running = false;
  const paused = s.snapshot(); s.advance(1000);
  expect(s.snapshot()).toEqual(paused);
  s.running = true; s.advance(0.25);
  expect(s.snapshot().burstTime).toBeCloseTo(-0.1, 12);
  const clocks = { ...s.clocks };
  s.setVelocity(0.6);
  expect(s.clocks).toEqual(clocks);
  expect(s.snapshot()).toMatchObject({ burstPhase: null, burstTime: null, transitioning: false });
  s.advance(1); expect(s.snapshot().beta).toBeCloseTo(0.6, 12);
  s.startBurst(); s.advance(0.2); s.reset();
  expect(s.snapshot()).toMatchObject({ beta: 0, burstPhase: null, burstTime: null, running: false });
  expect(s.clocks).toEqual(ZERO_CLOCK);
});

it('camera and optical baseline compare the same continuing burst flight', () => {
  const a = new Simulation(), b = new Simulation();
  a.startBurst(); b.startBurst(); a.advance(0.3); b.advance(0.3);
  const before = a.snapshot();
  a.setLook(Math.PI / 2, 0.2); a.setOpticalBaseline(true);
  for (const key of ['beta', 'lab', 'proper', 'position', 'burstPhase', 'burstTime', 'transitioning'] as const)
    expect(a.snapshot()[key]).toBe(before[key]);
  a.advance(2.3); b.advance(2.3);
  expect(a.clocks).toEqual(b.clocks);
  expect(a.eta).toBe(b.eta);
  expect(a.snapshot().burstPhase).toBe(b.snapshot().burstPhase);
});


it('records .999 ls per lab second at t0, +0.5, +1 and +2 seconds without resetting position', () => {
  const s=new Simulation(); s.setVelocity(.6); s.advance(5);
  const initial={...s.clocks}; s.setVelocity(.999);
  expect(s.clocks).toEqual(initial);
  const records=[{dt:0,position:s.clocks.position}];
  for (const dt of [.5,.5,1]) { s.advance(dt); records.push({dt:s.clocks.lab-initial.lab,position:s.clocks.position}); }
  for (const sample of records) expect(sample.position).toBeCloseTo(initial.position+.999*sample.dt,12);
  expect(records.map(p=>p.dt)).toEqual([0,.5,1,2]);
  const before={...s.clocks}; s.startBurst(); expect(s.clocks).toEqual(before);
  s.setVelocity(.1); expect(s.clocks).toEqual(before);
});

it('the optical-only baseline preserves the entire continuing tour, including a velocity ramp', () => {
  const a=new Simulation(), b=new Simulation(); a.startDemo(); b.startDemo(); a.advance(1.3); b.advance(1.3);
  const before=a.snapshot(); a.setOpticalBaseline(true);
  expect(a.snapshot()).toEqual({...before,opticalBaseline:true});
  a.advance(2); b.advance(2);
  expect(a.clocks).toEqual(b.clocks); expect(a.eta).toBe(b.eta);
  expect(a.demoTime).toBe(b.demoTime);
});
