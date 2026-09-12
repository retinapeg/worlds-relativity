import { expect, it } from 'vitest';
import { spectrum, spectrumTable } from '../src/rendering/spectrum';

it('moves monotonically from red toward blue with increasing Doppler temperature', () => {
  let previous = 0;
  for (const t of [400, 1000, 2000, 3000, 5800, 10000, 30000, 100000, 500000]) {
    const [r, g, b, power] = spectrum(t);
    expect([r, g, b, power].every(v => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
    expect(b / r).toBeGreaterThanOrEqual(previous);
    previous = b / r;
  }
});
it('dims shifted spectra in infrared and ultraviolet without erasing all broadband light', () => {
  const normal = spectrum(5800)[3];
  expect(spectrum(1000)[3]).toBeLessThan(normal);
  expect(spectrum(200000)[3]).toBeLessThan(normal);
  expect(spectrum(200000)[3]).toBeGreaterThan(0);
  expect(spectrumTable().length).toBe(512 * 4);
  for (const t of [0, -1, NaN, Infinity]) expect(() => spectrum(t)).toThrow();
});
