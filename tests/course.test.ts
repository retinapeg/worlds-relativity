import { expect, it } from 'vitest';
import { createCourse, COURSE_END, COURSE_GATE_SPACING, COURSE_SAMPLE_LENGTH } from '../src/sceneSources/course';
import { observe } from '../src/physics/relativity';

it('builds a fixed, deterministic sixty-second lab course with densely sampled straight edges', () => {
  const course = createCourse(), again = createCourse();
  expect(course.positions).toEqual(again.positions);
  expect(course.intensities.length * 3).toBe(course.positions.length);
  expect(COURSE_END).toBeGreaterThan(60);
  expect(COURSE_GATE_SPACING).toBeGreaterThanOrEqual(0.35);
  expect(COURSE_GATE_SPACING).toBeLessThanOrEqual(0.5);
  expect(course.gates).toBeGreaterThan(130);
  for (let i = 0; i < course.positions.length; i += 6) {
    const p = course.positions;
    expect(Math.hypot(p[i+3]-p[i], p[i+4]-p[i+1], p[i+5]-p[i+2])).toBeLessThan(COURSE_SAMPLE_LENGTH + 1e-5);
    // Every object stays off the observer's axis, including at a gate crossing.
    expect(Math.hypot(p[i+1], p[i+2])).toBeGreaterThan(0.1);
  }
});

it('changes nearby rays during constant-speed translation and retains the same geometry for optical baseline', () => {
  const course = createCourse(), p = course.positions;
  let index = 0;
  while (p[index] < 0.4) index += 3;
  const source = (position: number) => ({ x: p[index]-position, y: p[index+1], z: p[index+2] });
  const early = observe(source(0), 0.6), later = observe(source(0.3), 0.6);
  expect(later.direction.x).toBeLessThan(early.direction.x);
  expect(later.direction.y / later.direction.x).toBeGreaterThan(early.direction.y / early.direction.x);
  const baseline = observe(source(0.3), 0), expected = source(0.3);
  expect(baseline.doppler).toBe(1);
  expect(baseline.direction.y / baseline.direction.x).toBeCloseTo(expected.y / expected.x, 12);
  expect(baseline.direction).not.toEqual(later.direction);
  expect(course.positions).toEqual(createCourse().positions);
});

it('keeps representative gate-crossing and off-axis rays finite through the supported speed range', () => {
  const { positions: points } = createCourse();
  for (const beta of [0, 0.6, 0.99, 0.999]) for (const position of [0, 0.45, 0.9, 2.7, 60]) {
    for (let i = 0; i < points.length; i += 183) {
      const ray = observe({ x: points[i]-position, y: points[i+1], z: points[i+2] }, beta);
      expect([ray.doppler, ...Object.values(ray.direction)].every(Number.isFinite)).toBe(true);
      expect(ray.doppler).toBeGreaterThan(0);
      expect(Math.hypot(...Object.values(ray.direction))).toBeCloseTo(1, 9);
    }
  }
});
