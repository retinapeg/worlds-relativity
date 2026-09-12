import { photonGLSL } from '../physics/photon.glsl';

export const quadVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const colourGLSL = /* glsl */ `
uniform sampler2D spectrumMap;
uniform bool spectral;
vec4 shiftedSpectrum(float temperature, float D) {
  float u = clamp(log(max(temperature*D, 400.0)/400.0)/log(5000.0), 0.0, 1.0);
  return texture2D(spectrumMap, vec2((u*511.0+0.5)/512.0, 0.5));
}
vec3 frequencyColour(float D) {
  float amount = clamp(log(D)/log(4.0), -1.0, 1.0);
  return mix(vec3(0.77,0.86,0.93), amount > 0.0 ? vec3(0.13,0.43,1.0) : vec3(1.0,0.14,0.04), abs(amount));
}
`;
export const skyFragment = /* glsl */ `
uniform sampler2D skyMap;
uniform mat3 cameraBasis;
uniform float eta, aspect, tanHalfFov;
varying vec2 vUv;
${photonGLSL}
${colourGLSL}
void main() {
  vec2 screen = (vUv*2.0-1.0)*vec2(aspect,1.0)*tanHalfFov;
  vec3 observed = cameraBasis*normalize(vec3(screen,-1.0));
  // Inverse ray mapping: for each observer pixel, find its catalogue direction.
  vec4 rest = observeRay(observed, -eta);
  vec3 source = normalize(rest.xyz);
  float D = 1.0/rest.w;
  vec2 skyUv = vec2(atan(source.z,source.x)/6.28318530718+0.5, asin(clamp(source.y,-1.0,1.0))/3.14159265359+0.5);
  vec3 base = texture2D(skyMap,skyUv).rgb;
  vec4 colour = shiftedSpectrum(5800.0,D);
  // The nebula is a procedural background with an illustrative spectral tint.
  vec3 light = spectral ? base*colour.rgb*colour.a*1.6 : base*frequencyColour(D)*1.4;
  gl_FragColor = vec4(light,1.0);
  #include <colorspace_fragment>
}
`;
export const starVertex = /* glsl */ `
uniform float eta, pixelRatio;
attribute float temperature, size, power;
varying vec3 vColour;
varying float vSize;
varying float vExposure;
${photonGLSL}
${colourGLSL}
void main() {
  vec4 ray = observeRay(normalize(position),eta);
  vec4 colour = shiftedSpectrum(temperature,ray.w);
  vColour = (spectral ? colour.rgb*colour.a : frequencyColour(ray.w))*power;
  // Illustrative exposure keeps concentrated additive stars legible, not photometry.
  float crowding = max(ray.w - 1.0, 0.0);
  vExposure = 1.0 / (1.0 + 0.2 * crowding * crowding);
  vec4 view = modelViewMatrix*vec4(ray.xyz,1.0);
  gl_Position = projectionMatrix*view;
  gl_PointSize = view.z < 0.0 ? size*pixelRatio : 0.0;
  vSize = size;
}
`;
export const starFragment = /* glsl */ `
varying vec3 vColour;
varying float vSize;
varying float vExposure;
void main() {
  vec2 p = (gl_PointCoord-0.5)*2.0;
  float r = length(p);
  if (r > 1.0) discard;
  float glow = exp(-r*r*8.0)*0.6 + exp(-r*r*70.0)*1.5;
  if (vSize > 15.0) glow += (exp(-abs(p.x)*80.0)+exp(-abs(p.y)*80.0))*exp(-r*5.0)*0.35;
  gl_FragColor = vec4(vColour*glow,1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb *= vExposure;
}
`;
export const guideVertex = /* glsl */ `
uniform float eta;
varying float vD;
${photonGLSL}
void main() {
  vec4 ray = observeRay(normalize(position),eta);
  vD = ray.w;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(ray.xyz,1.0);
}
`;
export const guideFragment = /* glsl */ `
varying float vD;
void main() {
  vec3 colour = mix(vec3(0.45,0.26,0.10),vec3(0.11,0.51,0.63),clamp(vD/2.0,0.0,1.0));
  gl_FragColor = vec4(colour,0.23);
  #include <colorspace_fragment>
}
`;

export const beaconVertex = /* glsl */ `
attribute float doppler, intensity;
varying float vD, vIntensity;
void main() {
  // These directions were already boosted by the CPU. Projection only.
  vD = doppler; vIntensity = intensity;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
export const beaconFragment = /* glsl */ `
varying float vD, vIntensity;
${colourGLSL}
void main() {
  gl_FragColor = vec4(frequencyColour(vD), vIntensity);
  #include <colorspace_fragment>
}
`;
