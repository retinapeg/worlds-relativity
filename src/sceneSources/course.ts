/** Stationary, continuously emissive lab-frame geometry. All coordinates are
 * light-seconds (c=1). Its fixed extent covers a sixty-second flight; nothing is
 * recycled or moved to manufacture motion. The 100 m ruler is a separate model.
 */
export const COURSE_GATE_SPACING = 0.45;
export const COURSE_START = -1.8;
export const COURSE_END = 72;
export const COURSE_RADIUS = 0.18;
export const COURSE_SAMPLE_LENGTH = 0.025;
type Point = readonly [number, number, number];

export function createCourse() {
  const positions: number[] = [], intensities: number[] = [];
  const edge = (a: Point, b: Point, intensity = 0.9) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]) / COURSE_SAMPLE_LENGTH));
    for (let step = 0; step < steps; step++) for (const fraction of [step / steps, (step + 1) / steps]) {
      positions.push(a[0] + (b[0]-a[0])*fraction, a[1] + (b[1]-a[1])*fraction, a[2] + (b[2]-a[2])*fraction);
      intensities.push(intensity);
    }
  };
  const ringPoint = (x: number, radius: number, corner: number): Point => {
    const angle = corner * Math.PI / 4 + Math.PI / 8;
    return [x, radius * Math.cos(angle), radius * Math.sin(angle)];
  };
  const gates = Math.floor((COURSE_END - COURSE_START) / COURSE_GATE_SPACING) + 1;
  for (let gate = 0; gate < gates; gate++) {
    const x = COURSE_START + gate * COURSE_GATE_SPACING;
    for (let corner = 0; corner < 8; corner++) {
      edge(ringPoint(x, COURSE_RADIUS, corner), ringPoint(x, COURSE_RADIUS, corner + 1));
      edge(ringPoint(x, COURSE_RADIUS + 0.009, corner), ringPoint(x, COURSE_RADIUS + 0.009, corner + 1), 0.5);
      edge(ringPoint(x, COURSE_RADIUS, corner), ringPoint(x, COURSE_RADIUS + 0.009, corner), 0.7);
    }
  }

  // A gridded side truss and floor rails provide straight lines, depth and a
  // recognisable asymmetry. Densely sampled edges curve under the photon map.
  for (let x = COURSE_START; x < COURSE_END - 1e-8; x += COURSE_GATE_SPACING) {
    const next = Math.min(COURSE_END, x + COURSE_GATE_SPACING);
    for (const y of [-0.24, 0, 0.24]) edge([x,y,0.27], [next,y,0.27], 0.45);
    edge([x,-0.24,0.27], [x,0.24,0.27], 0.5);
    edge([x,-0.24,0.27], [next,0.24,0.27], 0.28);
    for (const z of [-0.14,0.14]) edge([x,-0.22,z], [next,-0.22,z], 0.6);
    edge([x,-0.22,-0.14], [x,-0.22,0.14], 0.45);
  }

  // Tilted rectangular frames beside the path retain their lab-frame shape.
  // Their off-axis straight edges visibly bend; this is not a length squeeze.
  for (const centreX of [1.4, 4.1, 8.6, 14, 23, 36, 52, 66]) {
    const corners: Point[] = [];
    for (const x of [-0.18,0.18]) for (const y of [-0.22,0.22]) for (const z of [-0.06,0.06]) {
      const yaw = 0.62, roll = 0.35;
      const rx = x*Math.cos(yaw)-y*Math.sin(yaw), ry = x*Math.sin(yaw)+y*Math.cos(yaw);
      corners.push([centreX+rx, 0.18+ry*Math.cos(roll)-z*Math.sin(roll), -0.4+ry*Math.sin(roll)+z*Math.cos(roll)]);
    }
    for (let i = 0; i < 8; i++) for (const bit of [1,2,4]) if (!(i & bit)) edge(corners[i], corners[i|bit], 1);
  }
  return { positions: new Float32Array(positions), intensities: new Float32Array(intensities), gates };
}
