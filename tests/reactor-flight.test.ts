import { expect, it } from 'vitest';
import { worldDirection } from '../src/reactor/direction';
import { Simulation } from '../src/controls/simulation';

it('maps shared burst stages to Directing instructions without changing flight state', () => {
  const simulation = new Simulation(false);
  const cruise = simulation.snapshot();
  expect(worldDirection(cruise).text).toContain('slow continuous approach');
  simulation.startBurst();
  const burst = simulation.snapshot();
  expect(worldDirection(burst).action).toBe('Burst');
  expect(worldDirection(burst).text).toContain('structures sweep past');
  expect(simulation.snapshot()).toEqual(burst);
  const braking = { ...burst, burstPhase: 'BRAKING' as const };
  expect(worldDirection(braking).action).toBe('Brake');
  expect(worldDirection(braking).text).toContain('slower forward movement');
});

it('keeps a coherent world across burst, coasting and view changes', () => {
  const simulation = new Simulation(false); simulation.startBurst();
  simulation.advance(0.8);
  const burst = simulation.snapshot();
  const acceleration = worldDirection(burst);
  expect(worldDirection({ ...burst, burstPhase: 'COASTING' }).text).toBe(acceleration.text);
  const rear = worldDirection({ ...burst, lookYaw: Math.PI });
  expect(rear.text).toContain('behind the camera');
  expect(rear.text).toContain('same cockpit');
  expect(rear.action).toBe('Burst');
});
