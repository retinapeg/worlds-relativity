import { AdditiveBlending, BufferAttribute, BufferGeometry, Camera, DataTexture, LinearFilter, LineSegments, Matrix3, Mesh, NoToneMapping,
  PerspectiveCamera, PlaneGeometry, Points, RGBAFormat, Scene, ShaderMaterial, Vector3, WebGLRenderer, type Texture } from 'three';
import type { ControlInput } from '../controls/simulation';
import type { SceneSource } from '../sceneSources/procedural';
import { spectrumTable, SPECTRUM_SIZE } from './spectrum';
import { courseFragment, courseVertex, guideFragment, guideVertex, quadVertex, skyFragment, starFragment, starVertex } from './shaders';
import { checkPhotonShader } from './gpuCheck';
import { createCourse } from '../sceneSources/course';

export class RelativityRenderer {
  private renderer: WebGLRenderer;
  private camera = new PerspectiveCamera(80, 1, 0.01, 10);
  private sky = new Scene();
  private scene = new Scene();
  private fullscreenCamera = new Camera();
  private quad = new PlaneGeometry(2, 2);
  private spectrum = new DataTexture(spectrumTable(), SPECTRUM_SIZE, 1, RGBAFormat);
  private look = new Vector3();
  private materials: ShaderMaterial[] = [];
  private guides: LineSegments;
  private beaconGeometry = new BufferGeometry();
  private beacons: LineSegments;
  private uniforms = {
    eta: { value: 0 }, pixelRatio: { value: 1 }, aspect: { value: 1 }, tanHalfFov: { value: Math.tan(40 * Math.PI / 180) },
    cameraBasis: { value: new Matrix3() }, skyMap: { value: null as Texture | null },
    spectrumMap: { value: this.spectrum }, spectral: { value: true }, observerX: { value: 0 },
  };
  readonly gpuCheck: string;
  constructor(private canvas: HTMLCanvasElement, private source: SceneSource) {
    this.uniforms.skyMap.value = source.background;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.debug.onShaderError = () => { throw new Error('A relativity shader failed to compile'); };
    this.gpuCheck = checkPhotonShader(this.renderer);
    this.renderer.autoClear = false;
    this.spectrum.minFilter = LinearFilter; this.spectrum.magFilter = LinearFilter; this.spectrum.needsUpdate = true;
    const material = (vertexShader: string, fragmentShader: string) => {
      const m = new ShaderMaterial({ uniforms: this.uniforms, vertexShader, fragmentShader,
        depthTest: false, depthWrite: false });
      this.materials.push(m); return m;
    };
    this.sky.add(new Mesh(this.quad, material(quadVertex, skyFragment)));
    const stars = material(starVertex, starFragment);
    stars.transparent = true; stars.blending = AdditiveBlending;
    const points = new Points(source.stars, stars); points.frustumCulled = false;
    this.scene.add(points);
    const guides = material(guideVertex, guideFragment); guides.transparent = true;
    this.guides = new LineSegments(source.guides, guides); this.guides.frustumCulled = false;
    this.scene.add(this.guides);
    const course = createCourse();
    this.beaconGeometry.setAttribute('position', new BufferAttribute(course.positions, 3));
    this.beaconGeometry.setAttribute('intensity', new BufferAttribute(course.intensities, 1));
    const beaconMaterial = material(courseVertex, courseFragment);
    beaconMaterial.transparent = true;
    this.beacons = new LineSegments(this.beaconGeometry, beaconMaterial);
    this.beacons.frustumCulled = false;
    this.scene.add(this.beacons);
    this.resize();
  }
  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(pixelRatio); this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix();
    this.uniforms.aspect.value = this.camera.aspect; this.uniforms.pixelRatio.value = pixelRatio;
  }
  render(eta: number, input: ControlInput, spectral: boolean, showGuides: boolean, position = 0, showBeacons = true) {
    const cp = Math.cos(input.lookPitch);
    this.look.set(cp * Math.cos(input.lookYaw), Math.sin(input.lookPitch), cp * Math.sin(input.lookYaw));
    this.camera.lookAt(this.look); this.camera.updateMatrixWorld();
    this.uniforms.cameraBasis.value.setFromMatrix4(this.camera.matrixWorld);
    this.uniforms.eta.value = eta; this.uniforms.spectral.value = spectral; this.guides.visible = showGuides;
    this.uniforms.observerX.value = position;
    this.beacons.visible = showBeacons;
    this.renderer.clear(); this.renderer.render(this.sky, this.fullscreenCamera); this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.materials.forEach(m => m.dispose()); this.quad.dispose(); this.spectrum.dispose(); this.beaconGeometry.dispose();
    this.source.dispose(); this.renderer.dispose();
  }
}
