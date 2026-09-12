export function band(nm: number) { return nm < 380 ? 'UV' : nm > 750 ? 'IR' : 'visible'; }
export function Wavelength({ doppler }: { doppler: number }) {
  const wavelength = 550 / doppler;
  // Logarithmic marker spans 30–10000 nm. Colour is a labelled display aid.
  const position = Math.max(0, Math.min(100, Math.log(wavelength / 30) / Math.log(10000 / 30) * 100));
  return <><small>550 → {wavelength.toFixed(1)} nm · <strong>{band(wavelength)}</strong></small>
    <i className="wavelength-track"><i style={{ left: `${position}%` }} /></i></>;
}
