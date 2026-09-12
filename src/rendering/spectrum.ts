/** Three broad-band samples of a synthetic blackbody, not a calibrated RGB eye.
 * Lorentz-shifted blackbody chromaticity has T′ = D*T. We normalize bolometric
 * output (T^4), then compress visible brightness with power 0.2 for presentation.
 * This deliberately omits relativistic beaming and exact point-source photometry.
 * The red/green/blue samples never wrap around a hue wheel.
 */
export function spectrum(temperature: number): [number, number, number, number] {
  if (!Number.isFinite(temperature) || temperature <= 0) throw new RangeError('Invalid temperature');
  const raw = [650, 550, 450].map(lambda =>
    (550 / lambda) ** 5 / Math.expm1(Math.min(700, 1.438776877e7 / (lambda * temperature))));
  const peak = Math.max(...raw);
  const visible = Math.min(1, peak * (5800 / temperature) ** 4 / 0.016);
  return [raw[0] / peak, raw[1] / peak, raw[2] / peak, visible ** 0.2];
}
export const MIN_T = 400, MAX_T = 2_000_000, SPECTRUM_SIZE = 512;
export function spectrumTable() {
  const table = new Uint8Array(SPECTRUM_SIZE * 4);
  for (let i = 0; i < SPECTRUM_SIZE; i++) {
    const temperature = MIN_T * (MAX_T / MIN_T) ** (i / (SPECTRUM_SIZE - 1));
    spectrum(temperature).forEach((value, j) => { table[i * 4 + j] = Math.round(value * 255); });
  }
  return table;
}
