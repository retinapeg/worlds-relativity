/** Stationary, continuously emissive lab-frame structures. Coordinates are
 * light-seconds (c=1); no object follows, resets with, or recycles around the
 * observer. The separate 100 m ruler is not part of this illustrative course.
 */
export const COURSE_END = 72;
export const COURSE_SAMPLE_LENGTH = 0.006;
type Point = readonly [number, number, number];
export const COURSE_LANDMARKS = [
  { name: 'Gate A · twin uprights', x: 0.8, y: 0.008, z: -0.01 },
  { name: 'Station · side truss', x: 1.5, y: 0, z: 0.3 },
  { name: 'Gate B · offset crossbars', x: 2.2, y: -0.012, z: 0.016 },
  { name: 'Off-axis tower', x: 0.65, y: 0.2, z: -0.36 },
] as const;

export function createCourse() {
  const positions: number[] = [], intensities: number[] = [];
  const edge = (a: Point, b: Point, intensity = 0.9) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]) / COURSE_SAMPLE_LENGTH));
    for (let step = 0; step < steps; step++) for (const fraction of [step / steps, (step + 1) / steps]) {
      positions.push(a[0] + (b[0]-a[0])*fraction, a[1] + (b[1]-a[1])*fraction, a[2] + (b[2]-a[2])*fraction);
      intensities.push(intensity);
    }
  };
  const box = (a: Point, b: Point, intensity = 0.8) => {
    const corners: Point[] = [];
    for (const x of [a[0],b[0]]) for (const y of [a[1],b[1]]) for (const z of [a[2],b[2]]) corners.push([x,y,z]);
    for (let i=0;i<8;i++) for (const bit of [1,2,4]) if (!(i & bit)) edge(corners[i],corners[i|bit],intensity);
  };
  const gate = (x: number, y: number, z: number, halfY: number, halfZ: number, crossbars: boolean) => {
    // Rectangular portals with finite thickness and luminous ribs. Close inner
    // edges can leave the forward field within the 3 ls coast even at high gamma.
    for (const depth of [0,0.035]) {
      const corners: Point[] = [[x+depth,y-halfY,z-halfZ],[x+depth,y+halfY,z-halfZ],
        [x+depth,y+halfY,z+halfZ],[x+depth,y-halfY,z+halfZ]];
      for (let i=0;i<4;i++) edge(corners[i],corners[(i+1)%4],1);
    }
    for (let i=0;i<=12;i++) {
      const t=i/12;
      for (const side of [-1,1]) {
        const vertical=y-halfY+2*halfY*t, horizontal=z-halfZ+2*halfZ*t;
        edge([x,vertical,z+side*halfZ],[x+0.035,vertical,z+side*(halfZ+0.008)],1);
        edge([x,y+side*halfY,horizontal],[x+0.035,y+side*(halfY+0.008),horizontal],0.85);
      }
    }
    if (crossbars) for (const side of [-1,1])
      edge([x,y+side*(halfY+0.016),z-halfZ-0.025],[x,y+side*(halfY+0.016),z+halfZ+0.025],1);
    else for (const side of [-1,1])
      edge([x,y-halfY-0.024,z+side*(halfZ+0.013)],[x,y+halfY+0.024,z+side*(halfZ+0.013)],1);
  };

  // Fixed six-light-second districts keep later flight usable without a moving
  // origin. Each contains two distinct gates, a one-sided station and pylons;
  // there is no long, concentric vanishing-point tunnel.
  let gates=0;
  for (let origin=0;origin<COURSE_END;origin+=6) {
    gate(origin+0.8,0.008,-0.01,0.046,0.037,false);
    gate(origin+2.2,-0.012,0.016,0.038,0.044,true);
    gates+=2;
    // Enormous right-hand station: a nearby lower rail and a broad outer face.
    // The nearest rail passes quickly; the distant face remains strongly aberrated.
    for (let bay=0;bay<20;bay++) {
      const x=origin+0.5+bay*0.1, next=x+0.1;
      for (const y of [-0.065,0.24]) for (const z of [0.034,0.34]) {
        edge([x,y,z],[next,y,z],0.75);
        edge([x,y,z],[x,-0.065,z],0.6);
      }
      for (const y of [-0.065,0.24]) {
        edge([x,y,0.034],[x,y,0.34],0.65);
        edge([x,y,0.034],[next,y,0.34],0.45);
      }
      edge([x,-0.065,0.34],[next,0.24,0.34],0.7);
      edge([x,-0.065,0.034],[next,0.24,0.034],0.85);
    }
    // Initially ~32 degrees off axis from the flight origin, visibly pulled
    // forward during acceleration. Different lateral heights break symmetry.
    for (const [x,y,z,height] of [[0.65,0.2,-0.36,0.24],[1.65,-0.13,-0.09,0.18],[2.85,0.1,0.075,0.2],[3.5,-0.22,0.2,0.16]]) {
      box([origin+x-0.018,y-height/2,z-0.018],[origin+x+0.018,y+height/2,z+0.018],0.95);
      for (let mark=0;mark<=8;mark++) {
        const level=y-height/2+height*mark/8;
        edge([origin+x-0.022,level,z-0.025],[origin+x+0.022,level,z+0.025],0.9);
      }
    }
  }
  return { positions: new Float32Array(positions), intensities: new Float32Array(intensities), gates };
}
