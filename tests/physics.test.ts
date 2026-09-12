import { describe, expect, it } from 'vitest';
import { advanceClocks, gamma, lorentz, MAX_BETA, observe, ratios, unit, ZERO_CLOCK } from '../src/physics/relativity';

describe('special relativity in the lab frame, c = 1', () => {
  it('has exact rest ratios and clock identity', () => {
    expect(ratios(0)).toEqual({ beta: 0, gamma: 1, properRate: 1, length: 1, approach: 1, recede: 1 });
    expect(advanceClocks(ZERO_CLOCK, 0, 10)).toEqual({ lab: 10, proper: 10, position: 0 });
  });
  it('matches the fixed 0.6 and 0.8 analytic references', () => {
    const r = ratios(0.6);
    expect(r.gamma).toBeCloseTo(1.25, 13);
    expect(r.properRate).toBeCloseTo(0.8, 13);
    expect(r.length).toBeCloseTo(0.8, 13);
    expect(r.approach).toBeCloseTo(2, 13);
    expect(r.recede).toBeCloseTo(0.5, 13);
    expect(gamma(0.8)).toBeCloseTo(5 / 3, 13);
  });
  it('matches the approved high-speed measurement and clock comparisons', () => {
    for (const [beta, metres] of [[0.95, 31.22498999199199], [0.99, 14.10673597966589], [0.999, 4.47101778122163]])
      expect(100 * ratios(beta).length).toBeCloseTo(metres, 10);
    const high = ratios(0.999);
    expect(high.gamma).toBeCloseTo(22.36627204212937, 10);
    expect(100 * (1 - high.length)).toBeCloseTo(95.52898221877837, 10);
    expect(60 * high.properRate).toBeCloseTo(2.682610668732978, 10);
  });
  it('recovers events with the inverse transform and preserves the interval', () => {
    for (const beta of [-0.999, -0.6, 0, 0.8, 0.999]) {
      for (const event of [{ t: 5, x: 3 }, { t: 3, x: 5 }, { t: 8, x: -8 }]) {
        const out = lorentz(event, beta), back = lorentz(out, -beta);
        expect(back.t).toBeCloseTo(event.t, 9);
        expect(back.x).toBeCloseTo(event.x, 9);
        expect(out.t ** 2 - out.x ** 2).toBeCloseTo(event.t ** 2 - event.x ** 2, 9);
      }
    }
  });
  it('accumulates historical clocks and position across velocity changes', () => {
    let state = advanceClocks(ZERO_CLOCK, 0, 10);
    state = advanceClocks(state, 0.6, 10);
    state = advanceClocks(state, 0.8, 10);
    expect(state.lab).toBe(30);
    expect(state.proper).toBeCloseTo(24, 13);
    expect(state.position).toBeCloseTo(14, 13);
    let split = ZERO_CLOCK;
    for (let i = 0; i < 1200; i++) split = advanceClocks(split, 0.6, 1 / 120);
    expect(split.proper).toBeCloseTo(8, 10);
    expect(split.lab).toBeCloseTo(10, 10);
  });
  it('contracts monotonically and stays finite at every UI preset', () => {
    let previous = 1;
    for (const beta of [0, 0.5, 0.9, 0.99, MAX_BETA, 0.999999]) {
      const r = ratios(beta);
      expect(Object.values(r).every(Number.isFinite)).toBe(true);
      expect(r.length).toBeLessThanOrEqual(previous);
      expect(r.properRate).toBe(1 / r.gamma);
      previous = r.length;
    }
    expect(previous).toBeLessThan(0.002);
  });
  it('rejects invalid inputs cleanly', () => {
    for (const beta of [1, -1, 2, NaN, Infinity, -Infinity]) {
      expect(() => gamma(beta)).toThrow();
      expect(() => observe({ x: 1, y: 0, z: 0 }, beta)).toThrow();
    }
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(() => lorentz({ t: value, x: 0 }, 0)).toThrow();
      expect(() => advanceClocks(ZERO_CLOCK, 0, value)).toThrow();
    }
    expect(() => advanceClocks(ZERO_CLOCK, 0, -1)).toThrow();
    expect(() => unit({ x: 0, y: 0, z: 0 })).toThrow();
    expect(() => unit({ x: Infinity, y: 1, z: 0 })).toThrow();
  });
});

describe('photon boost signs and aberration', () => {
  it('matches all four MATH.md reference rays, including the two transverse cases', () => {
    const rays = [
      { s: { x: 1, y: 0, z: 0 }, d: 2, out: { x: 1, y: 0, z: 0 } },
      { s: { x: -1, y: 0, z: 0 }, d: 0.5, out: { x: -1, y: 0, z: 0 } },
      { s: { x: 0, y: 1, z: 0 }, d: 1.25, out: { x: 0.6, y: 0.8, z: 0 } },
      { s: { x: -0.6, y: 0.8, z: 0 }, d: 0.8, out: { x: 0, y: 1, z: 0 } },
    ];
    for (const { s, d, out } of rays) {
      const ray = observe(s, 0.6);
      expect(ray.doppler).toBeCloseTo(d, 13);
      for (const k of ['x', 'y', 'z'] as const) expect(ray.direction[k]).toBeCloseTo(out[k], 13);
      expect(550 / ray.doppler).toBeCloseTo(550 / d, 10);
    }
  });
  it('preserves unit norm, identity, inverse rays and inverse frequency factors', () => {
    for (const beta of [0, 0.6, -0.6, 0.99, MAX_BETA, -MAX_BETA]) {
      for (let i = 0; i <= 256; i++) {
        const x = -1 + i / 128, r = Math.sqrt(Math.max(0, 1 - x * x));
        const s = { x, y: r * Math.cos(i * 2.4), z: r * Math.sin(i * 2.4) };
        const out = observe(s, beta), back = observe(out.direction, -beta);
        expect(Math.hypot(...Object.values(out.direction))).toBeCloseTo(1, 10);
        expect(out.doppler * back.doppler).toBeCloseTo(1, 9);
        for (const k of ['x', 'y', 'z'] as const) {
          expect(back.direction[k]).toBeCloseTo(s[k], 9);
          if (!beta) expect(out.direction[k]).toBeCloseTo(s[k], 13);
        }
        expect(out.direction.x).toBeCloseTo((x + beta) / (1 + x * beta), 10);
      }
    }
  });
  it('concentrates a transverse source toward forward while front/behind shift correctly', () => {
    let previous = -1;
    for (const beta of [0, 0.5, 0.9, 0.99, 0.999]) {
      const ray = observe({ x: 0, y: 1, z: 0 }, beta);
      expect(ray.direction.x).toBeGreaterThan(previous);
      expect(observe({ x: 1, y: 0, z: 0 }, beta).doppler).toBeGreaterThanOrEqual(1);
      expect(observe({ x: -1, y: 0, z: 0 }, beta).doppler).toBeLessThanOrEqual(1);
      previous = ray.direction.x;
    }
    expect(previous).toBeGreaterThan(0.998);
  });
});
