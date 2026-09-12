import { finite, observe, validateBeta } from './relativity';

// A periodic corridor of stationary luminous beacons in S. Distances are light-seconds.
// Each ring samples the SAME stationary emitters as the observer advances along +X.
// Stationary emitters have identical present and retarded positions, so their ray
// direction is sourcePosition - observerPosition at reception. No optical squeeze.
export const GATE_SPACING = 2;
export const GATE_RADIUS = 0.65;
export const GATE_COUNT = 25;
export const GATE_SAMPLES = 64;
export const BEACON_VERTICES = GATE_COUNT * GATE_SAMPLES * 2;

export class BeaconRays {
  readonly positions = new Float32Array(BEACON_VERTICES * 3);
  readonly dopplers = new Float32Array(BEACON_VERTICES);
  readonly intensities = new Float32Array(BEACON_VERTICES);
  private cos = new Float64Array(GATE_SAMPLES + 1);
  private sin = new Float64Array(GATE_SAMPLES + 1);

  constructor() {
    for (let i = 0; i <= GATE_SAMPLES; i++) {
      const angle = i * 2 * Math.PI / GATE_SAMPLES;
      this.cos[i] = Math.cos(angle); this.sin[i] = Math.sin(angle);
    }
    this.update(0, 0);
  }

  update(observerPosition: number, beta: number) {
    finite(observerPosition); validateBeta(beta);
    const phase = observerPosition - Math.floor(observerPosition / GATE_SPACING) * GATE_SPACING;
    for (let ring = 0; ring < GATE_COUNT; ring++) {
      const dx = (ring - Math.floor(GATE_COUNT / 2)) * GATE_SPACING + GATE_SPACING / 2 - phase;
      // Rotational symmetry about +X: only ONE CPU photon transform per ring.
      const ray = observe({ x: dx, y: GATE_RADIUS, z: 0 }, beta);
      const fade = Math.max(0, 1 - Math.abs(dx) / (GATE_SPACING * GATE_COUNT / 2));
      for (let segment = 0; segment < GATE_SAMPLES; segment++) {
        for (let end = 0; end < 2; end++) {
          const vertex = (ring * GATE_SAMPLES + segment) * 2 + end;
          const angle = segment + end;
          this.positions[vertex * 3] = ray.direction.x;
          this.positions[vertex * 3 + 1] = ray.direction.y * this.cos[angle];
          this.positions[vertex * 3 + 2] = ray.direction.y * this.sin[angle];
          this.dopplers[vertex] = ray.doppler;
          // Illustrative display opacity and finite render window, not photometry.
          this.intensities[vertex] = 0.8 * fade * fade;
        }
      }
    }
  }
}
