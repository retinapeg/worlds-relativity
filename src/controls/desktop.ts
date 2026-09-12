import type { Simulation } from './simulation';

export function attachDesktop(canvas: HTMLCanvasElement, simulation: Simulation, changed: () => void) {
  let drag: { x: number; y: number } | null = null;
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    canvas.focus(); canvas.setPointerCapture(event.pointerId); drag = { x: event.clientX, y: event.clientY };
  };
  const move = (event: PointerEvent) => {
    if (!drag) return;
    simulation.input.lookYaw -= (event.clientX - drag.x) * 0.004;
    simulation.input.lookPitch = Math.max(-1.3, Math.min(1.3,
      simulation.input.lookPitch + (event.clientY - drag.y) * 0.004));
    drag = { x: event.clientX, y: event.clientY };
    changed();
  };
  const up = () => { drag = null; };
  const key = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).closest('input, button, summary')) return;
    const k = event.key.toLowerCase();
    if (k === ' ') simulation.running = !simulation.running;
    else if (k === 'r') simulation.reset();
    else if (k === 'd') simulation.startDemo();
    else if (k === 'f') { simulation.input.lookYaw = 0; simulation.input.lookPitch = 0; }
    else if (k === 'arrowleft') simulation.input.lookYaw += 0.1;
    else if (k === 'arrowright') simulation.input.lookYaw -= 0.1;
    else return;
    event.preventDefault(); changed();
  };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  window.addEventListener('keydown', key);
  return () => {
    canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
    window.removeEventListener('keydown', key);
  };
}
