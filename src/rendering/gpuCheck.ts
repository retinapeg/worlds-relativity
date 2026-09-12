import { Camera, FloatType, Mesh, PlaneGeometry, Scene, ShaderMaterial, Vector3, WebGLRenderTarget, type WebGLRenderer } from 'three';
import { observe, unit } from '../physics/relativity';
import { photonGLSL } from '../physics/photon.glsl';
import { quadVertex } from './shaders';

/** Exercise the exact shader chunk used in both sky and star rendering.
 * Float readback tolerance covers float32 arithmetic at beta <= .999.
 */
export function checkPhotonShader(renderer: WebGLRenderer): string {
  if (!renderer.extensions.has('EXT_color_buffer_float')) return 'Float GPU probe unavailable';
  const target = new WebGLRenderTarget(1, 1, { type: FloatType, depthBuffer: false });
  const material = new ShaderMaterial({ vertexShader: quadVertex,
    fragmentShader: `uniform vec3 source; uniform float eta; ${photonGLSL}
      void main() { gl_FragColor = observeRay(normalize(source),eta); }`,
    uniforms: { source: { value: new Vector3(1, 0, 0) }, eta: { value: 0 } },
    depthTest: false, depthWrite: false });
  const geometry = new PlaneGeometry(2, 2), scene = new Scene(), output = new Float32Array(4);
  scene.add(new Mesh(geometry, material));
  let count = 0, maxError = 0;
  try {
    renderer.setRenderTarget(target);
    for (const beta of [0, 0.6, -0.6, 0.9, 0.99, 0.999, -0.999]) {
      const rays = [{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
        { x: -0.6, y: 0.8, z: 0 }, ...Array.from({ length: 65 }, (_, i) => {
          const x = -1 + i / 32, r = Math.sqrt(1 - x * x);
          return { x, y: r * Math.cos(i), z: r * Math.sin(i) };
        })];
      for (const ray of rays) {
        const source = unit(ray), expected = observe(source, beta);
        material.uniforms.source.value.set(source.x, source.y, source.z);
        material.uniforms.eta.value = Math.atanh(beta);
        renderer.render(scene, new Camera());
        renderer.readRenderTargetPixels(target, 0, 0, 1, 1, output);
        const values = [...Object.values(expected.direction), expected.doppler];
        values.forEach((value, i) => {
          const error = Math.abs(output[i] - value) / (1 + Math.abs(value));
          maxError = Math.max(maxError, error);
          if (!Number.isFinite(output[i]) || error > 2e-4) throw new Error('GPU photon validation failed');
        });
        count++;
      }
    }
  } finally { renderer.setRenderTarget(null); target.dispose(); material.dispose(); geometry.dispose(); }
  return `${count} GPU rays passed · max relative-scaled error ${maxError.toExponential(1)}`;
}
