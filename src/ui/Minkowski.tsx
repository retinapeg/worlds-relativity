import type { Event1D } from '../physics/relativity';

export function Minkowski({ history, t, x }: { history: Event1D[]; t: number; x: number }) {
  // Square plot: one common scale for x and ct, c=1. Light remains at 45°.
  const extent = Math.max(10, Math.ceil(t / 10) * 10), scale = 130 / extent;
  const points = [...history, { t, x }].map(p => `${28 + p.x * scale},${150 - p.t * scale}`).join(' ');
  return <section className="spacetime" aria-label="Earth-frame Minkowski diagram">
    <div className="eyebrow">SPACETIME / EARTH FRAME</div>
    <svg viewBox="0 0 190 178" role="img" aria-label={`Equal x and ct scales. Earth time ${t.toFixed(1)} seconds, traveller position ${x.toFixed(1)} light-seconds.`}>
      <path d="M28 20V150H158" className="diagram-axis" />
      <path d="M28 150L158 20" className="light-ray" />
      <path d={`M28 150V${150 - t * scale}`} className="earth-line" />
      <polyline points={points} className="traveller-line" />
      <circle cx={28 + x * scale} cy={150 - t * scale} r="3" fill="var(--mint)" />
      <text x="5" y="15">ct (s)</text><text x="112" y="173">x (light-s)</text>
      <text x="12" y="162">0</text><text x="8" y="30">{extent}</text><text x="145" y="162">{extent}</text>
      <text x="110" y="43" className="light-label">light</text>
    </svg>
    <div className="diagram-key"><span>Earth</span><span>Traveller</span><span>c = 1</span></div>
  </section>;
}
