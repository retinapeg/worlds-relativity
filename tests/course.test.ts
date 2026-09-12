import { expect, it } from 'vitest';
import { createCourse, COURSE_END, COURSE_LANDMARKS, COURSE_SAMPLE_LENGTH } from '../src/sceneSources/course';
import { observe } from '../src/physics/relativity';
import { Simulation } from '../src/controls/simulation';

it('builds fixed asymmetric lab structures, with real geometric subdivisions and safe clearance', () => {
  const course = createCourse(), again = createCourse();
  expect(course.positions).toEqual(again.positions);
  expect(course.intensities.length * 3).toBe(course.positions.length);
  expect(COURSE_END).toBeGreaterThan(60);
  expect(course.gates).toBeLessThan(30); // Sparse distinct portals, not a concentric tunnel.
  const tower=COURSE_LANDMARKS.find(p=>p.name==='Off-axis tower')!;
  const angle=Math.atan2(Math.hypot(tower.y,tower.z),tower.x)*180/Math.PI;
  expect(angle).toBeGreaterThan(20); expect(angle).toBeLessThan(40);
  for (let i=0;i<course.positions.length;i+=6) {
    const p=course.positions;
    expect(Math.hypot(p[i+3]-p[i],p[i+4]-p[i+1],p[i+5]-p[i+2])).toBeLessThan(COURSE_SAMPLE_LENGTH+1e-5);
    expect(Math.hypot(p[i+1],p[i+2])).toBeGreaterThan(0.008);
  }
});

it('closes on and optically passes the identifiable first portal during the high-beta coast', () => {
  const s=new Simulation(); s.setVelocity(0.1); s.startBurst();
  const gate=COURSE_LANDMARKS[0];
  // Top of the twin upright: actual stationary gate geometry, 0.8 ls ahead.
  const corner={x:gate.x,y:gate.y+0.046+0.024,z:gate.z-0.037-0.013};
  const ray=()=>observe({...corner,x:corner.x-s.clocks.position},s.snapshot().beta);
  const initial=ray(); s.advance(1);
  expect(ray().direction.x).toBeLessThan(initial.direction.x); // Angular size grows on approach.
  s.advance(1); const compressed=ray();
  expect(s.snapshot().beta).toBeCloseTo(0.999,12);
  expect(compressed.direction.x).toBeGreaterThan(0.9);
  s.advance(0.5); const expanding=ray();
  expect(expanding.direction.x).toBeLessThan(compressed.direction.x);
  s.advance(2.5); // End of the high-beta coast, before any braking is integrated.
  expect(s.snapshot().beta).toBeCloseTo(0.999,12);
  expect(ray().direction.x).toBeLessThan(0); // Behind even in the aberrated observer sky.
  expect(s.clocks.position).toBeGreaterThan(3.8);
});

it('uses identical fixed geometry and observer position in the baseline and relativistic views', () => {
  const s=new Simulation(); s.setVelocity(.1); s.startBurst(); s.advance(2.5);
  const physical=s.snapshot(), geometry=createCourse();
  s.setOpticalBaseline(true);
  expect(s.snapshot()).toEqual({...physical,opticalBaseline:true});
  expect(createCourse().positions).toEqual(geometry.positions);
  const point=COURSE_LANDMARKS[3], relative={...point,x:point.x-physical.position};
  const optical=observe(relative,physical.beta), baseline=observe(relative,0);
  expect(baseline.doppler).toBe(1);
  expect(baseline.direction).not.toEqual(optical.direction);
  expect(baseline.direction.y/baseline.direction.x).toBeCloseTo(relative.y/relative.x,12);
});

it('keeps gate-crossing and off-axis rays finite through the supported speed range', () => {
  const {positions:points}=createCourse();
  for (const beta of [0,.6,.99,.999]) for (const position of [0,.8,1.5,2.2,3.9,60]) {
    for(let i=0;i<points.length;i+=183) {
      const ray=observe({x:points[i]-position,y:points[i+1],z:points[i+2]},beta);
      expect([ray.doppler,...Object.values(ray.direction)].every(Number.isFinite)).toBe(true);
      expect(ray.doppler).toBeGreaterThan(0);
      expect(Math.hypot(...Object.values(ray.direction))).toBeCloseTo(1,9);
    }
  }
});
