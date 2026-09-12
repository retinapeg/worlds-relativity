import { expect, it } from 'vitest';
import { BeaconRays, GATE_COUNT, GATE_SAMPLES, GATE_SPACING, GATE_RADIUS } from '../src/physics/beacons';
import { observe } from '../src/physics/relativity';
import { Simulation } from '../src/controls/simulation';

it('starts the cockpit paused, and reset returns exactly to that initial state', () => {
  const simulation = new Simulation(false), initial = simulation.snapshot();
  simulation.startDemo(); simulation.advance(20); simulation.reset();
  expect(simulation.snapshot()).toEqual(initial);
});

it('receives stationary beacon light with the same source direction and Doppler as the SR core', () => {
  const beacons = new BeaconRays();
  const centre = Math.floor(GATE_COUNT / 2) * GATE_SAMPLES * 2;
  for (const beta of [0, 0.6, 0.9, 0.999]) {
    beacons.update(0, beta);
    const expected = observe({ x: GATE_SPACING / 2, y: GATE_RADIUS, z: 0 }, beta);
    expect(beacons.dopplers[centre]).toBeCloseTo(expected.doppler, 5);
    expect(beacons.positions[centre * 3]).toBeCloseTo(expected.direction.x, 6);
    expect(beacons.positions[centre * 3 + 1]).toBeCloseTo(expected.direction.y, 6);
    for (let i = 0; i < beacons.dopplers.length; i++) {
      expect(beacons.dopplers[i]).toBeGreaterThan(0);
      expect(Math.hypot(...beacons.positions.subarray(i * 3, i * 3 + 3))).toBeCloseTo(1, 6);
    }
  }
});

it('moves continuously through a periodic stationary corridor and retains fixed buffers', () => {
  const beacons = new BeaconRays(), buffer = beacons.positions;
  const origin = buffer.slice();
  beacons.update(0.5, 0);
  expect(beacons.positions).toBe(buffer);
  expect(beacons.positions).not.toEqual(origin);
  beacons.update(GATE_SPACING, 0);
  expect(beacons.positions).toEqual(origin);
  const middle = Math.floor(GATE_COUNT / 2) * GATE_SAMPLES * 2;
  beacons.update(1, 0.6); // At a ring plane: catalogue-transverse, D = gamma.
  expect(beacons.dopplers[middle]).toBeCloseTo(1.25, 6);
  expect(beacons.positions[middle * 3]).toBeCloseTo(0.6, 6);
  beacons.update(1.99, 0.6);
  expect(beacons.dopplers[middle]).toBeLessThan(1); // The passed ring now redshifts.
  expect(() => beacons.update(Infinity, 0)).toThrow();
  expect(() => beacons.update(0, 1)).toThrow();
});
