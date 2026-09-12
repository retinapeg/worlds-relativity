import { BufferAttribute, BufferGeometry, DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, type Texture } from 'three';

// A rest-frame light-field boundary. A later video source must supply a declared
// projection/FOV and handle unavailable rays; a flat video is NOT a 360° sky.
export interface SceneSource {
  projection: 'equirectangular';
  background: Texture;
  stars: BufferGeometry;
  guides: BufferGeometry;
  count: number;
  dispose(): void;
}
export const STAR_COUNT = 14000;
export function randomGenerator(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
}
export function createProceduralSource(): SceneSource {
  const random = randomGenerator(170908298);
  const positions = new Float32Array(STAR_COUNT * 3), temperatures = new Float32Array(STAR_COUNT);
  const sizes = new Float32Array(STAR_COUNT), powers = new Float32Array(STAR_COUNT);
  // Deterministic mixture of an isotropic sky and a tilted galactic band.
  for (let i = 0; i < STAR_COUNT; i++) {
    const longitude = random() * Math.PI * 2;
    const y = i % 3 ? random() * 2 - 1 : (random() + random() + random() - 1.5) * 0.14;
    const radius = Math.sqrt(1 - y * y), x = radius * Math.cos(longitude), z = radius * Math.sin(longitude);
    positions.set([x, y * 0.83 - z * 0.557, y * 0.557 + z * 0.83], i * 3);
    temperatures[i] = 2800 + random() ** 1.8 * 12000;
    const bright = random();
    sizes[i] = bright > 0.996 ? 20 + random() * 14 : 1.6 + random() ** 3 * 6;
    powers[i] = bright > 0.996 ? 1.1 : 0.3 + random() * 0.5;
  }
  const stars = new BufferGeometry();
  stars.setAttribute('position', new BufferAttribute(positions, 3));
  stars.setAttribute('temperature', new BufferAttribute(temperatures, 1));
  stars.setAttribute('size', new BufferAttribute(sizes, 1));
  stars.setAttribute('power', new BufferAttribute(powers, 1));

  const width = 1024, height = 512, pixels = new Uint8Array(width * height * 4);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const lon = (i / width - 0.5) * Math.PI * 2, lat = (j / (height - 1) - 0.5) * Math.PI;
    const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon);
    const band = Math.exp(-(Math.abs(y * 0.83 + z * 0.557) ** 1.4) * 33);
    let cloud = 0, weight = 0.5;
    for (let f = 3; f <= 48; f *= 2) {
      cloud += weight * (0.5 + 0.5 * Math.sin(x * f + Math.sin(z * f * 1.3)) * Math.cos(y * f * 1.7 + z * f));
      weight *= 0.5;
    }
    const dust = band * (0.18 + cloud ** 2 * 2.3);
    const warm = (Math.sin(lon * 2 + cloud * 4) + 1) * 0.5;
    const index = (j * width + i) * 4;
    pixels[index] = Math.min(255, 1 + dust * (16 + 34 * warm));
    pixels[index + 1] = Math.min(255, 2 + dust * (18 + 12 * warm));
    pixels[index + 2] = Math.min(255, 4 + dust * (40 + 15 * (1 - warm)));
    pixels[index + 3] = 255;
  }
  const background = new DataTexture(pixels, width, height, RGBAFormat);
  background.wrapS = RepeatWrapping; background.magFilter = LinearFilter;
  background.minFilter = LinearMipmapLinearFilter; background.generateMipmaps = true; background.needsUpdate = true;

  const lines: number[] = [];
  const append = (a: number[], b: number[]) => { lines.push(...a, ...b); };
  // Angular reference rings, NOT objects being physically squeezed.
  for (const angle of [35, 65, 90, 125, 155]) {
    const x = Math.cos(angle * Math.PI / 180), radius = Math.sin(angle * Math.PI / 180);
    for (let i = 0; i < 360; i++) {
      const a = i * Math.PI / 180, b = (i + 1) * Math.PI / 180;
      append([x, radius * Math.cos(a), radius * Math.sin(a)], [x, radius * Math.cos(b), radius * Math.sin(b)]);
    }
  }
  const guides = new BufferGeometry();
  guides.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));
  return { projection: 'equirectangular', background, stars, guides, count: STAR_COUNT,
    dispose() { background.dispose(); stars.dispose(); guides.dispose(); } };
}
