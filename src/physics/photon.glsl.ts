// GPU counterpart of observe() for unit directions and boost +X.
// Checked against the double-precision CPU implementation by the startup GPU probe.
export const photonGLSL = /* glsl */ `
vec4 observeRay(vec3 s, float eta) {
  float mu = clamp(s.x, -1.0, 1.0);
  float p = 0.5 * (1.0 + mu) * exp(eta);
  float q = 0.5 * (1.0 - mu) * exp(-eta);
  float D = p + q;
  return vec4((p-q)/D, s.y/D, s.z/D, D);
}
`;
