import { afterEach, expect, it, vi } from 'vitest';
import { attachDesktop } from '../src/controls/desktop';
import { Simulation } from '../src/controls/simulation';

afterEach(() => vi.unstubAllGlobals());

function desktop() {
  const window = new EventTarget(); vi.stubGlobal('window', window);
  const canvas = Object.assign(new EventTarget(), { focus: vi.fn(), setPointerCapture: vi.fn() });
  const simulation = new Simulation();
  const changed = vi.fn();
  const dispose = attachDesktop(canvas as unknown as HTMLCanvasElement, simulation, changed);
  const press = (key: string, options: { repeat?: boolean; ctrlKey?: boolean; isComposing?: boolean; typing?: boolean } = {}) => {
    const event = Object.assign(new Event('keydown', { cancelable: true }), { key, ...options });
    if (options.typing) Object.defineProperty(event, 'target', { value: { closest: () => ({}) } });
    window.dispatchEvent(event);
    return event;
  };
  return { canvas, simulation, changed, dispose, press };
}

it('Space starts one burst, P pauses, and typing/repeat/modifier events leave it untouched', () => {
  const { simulation, changed, dispose, press } = desktop();
  expect(press(' ').defaultPrevented).toBe(true);
  simulation.advance(0.2);
  const before = simulation.snapshot();
  for (const options of [{ repeat: true }, { typing: true }, { ctrlKey: true }, { isComposing: true }])
    expect(press(' ', options).defaultPrevented).toBe(false);
  expect(simulation.snapshot()).toEqual(before);
  expect(changed).toHaveBeenCalledTimes(1);
  press('p'); simulation.advance(2);
  expect(simulation.snapshot()).toEqual({ ...before, running: false });
  press('p'); expect(simulation.running).toBe(true);
  dispose();
  const removed = simulation.snapshot(); press('r'); expect(simulation.snapshot()).toEqual(removed);
});

it('pointer camera drag preserves an active velocity programme and clamps pitch', () => {
  const { canvas, simulation, dispose } = desktop();
  simulation.startBurst(); simulation.advance(0.4);
  const before = simulation.snapshot();
  canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { button: 0, pointerId: 1, clientX: 0, clientY: 0 }));
  canvas.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 50, clientY: 1000 }));
  expect(simulation.input.lookYaw).toBe(-0.2);
  expect(simulation.input.lookPitch).toBe(1.3);
  for (const key of ['beta', 'lab', 'proper', 'position', 'burstPhase', 'burstTime', 'transitioning'] as const)
    expect(simulation.snapshot()[key]).toBe(before[key]);
  dispose();
});
