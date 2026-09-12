import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MAX_BETA } from '../physics/relativity';
import { DEMO_DURATION, PRESETS, Simulation } from '../controls/simulation';
import { attachDesktop } from '../controls/desktop';
import { FrameClock } from '../controls/frameClock';
import { createProceduralSource, STAR_COUNT } from '../sceneSources/procedural';
import { RelativityRenderer } from '../rendering/RelativityRenderer';
import { formatTime } from './formatTime';
import { Minkowski } from './Minkowski';
import { Wavelength } from './Wavelength';
import { ReactorPanel } from '../reactor/ReactorPanel';

function Clock({ seconds, label, kind }: { seconds: number; label: string; kind: string }) {
  return <div className={`clock ${kind}`}>
    <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" className="clock-track" />
      <circle cx="24" cy="24" r="20" className="clock-progress" strokeDasharray={`${(seconds % 10) / 10 * 125.664} 125.664`} />
      <line x1="24" y1="24" x2="24" y2="10" transform={`rotate(${seconds % 10 * 36} 24 24)`} /><circle cx="24" cy="24" r="2" /></svg>
    <div><span className="eyebrow">{label}</span><output data-testid={`${kind}-time`} data-seconds={seconds.toFixed(6)}>{formatTime(seconds)}</output></div>
  </div>;
}
export function App() {
  const simulation = useRef(new Simulation(false)).current;
  const canvas = useRef<HTMLCanvasElement>(null);
  const settings = useRef({ spectral: true, guides: false, beacons: true });
  const [snapshot, setSnapshot] = useState(simulation.snapshot());
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const [gpu, setGpu] = useState('Pending'), [fps, setFps] = useState(0);
  const [spectral, setSpectral] = useState(true), [guides, setGuides] = useState(false);
  const [beacons, setBeacons] = useState(true);
  const [view, setView] = useState('FORWARD / +X'), [hidden, setHidden] = useState(document.hidden);
  const refresh = () => setSnapshot(simulation.snapshot());

  useEffect(() => {
    const surface = canvas.current!;
    let renderer: RelativityRenderer | undefined, request = 0;
    const frameClock = new FrameClock();
    let published = 0, frames = 0, frameTime = 0;
    let disposeInput = () => {};
    const fail = (message: string) => { simulation.running = false; setError(message); refresh(); };
    const visibility = () => { frameClock.suspend(); setHidden(document.hidden); };
    const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(request); fail('The graphics context was lost. Reload to recover the local scene.'); };
    const resize = () => renderer?.resize();
    try {
      renderer = new RelativityRenderer(surface, createProceduralSource());
      setGpu(renderer.gpuCheck); setReady(true);
      disposeInput = attachDesktop(surface, simulation, () => {
        const yaw = Math.atan2(Math.sin(simulation.input.lookYaw), Math.cos(simulation.input.lookYaw));
        setView(Math.abs(simulation.input.lookPitch) > 1e-5 ? 'FREE LOOK' : Math.abs(yaw) < 1e-5 ? 'FORWARD / +X' :
          Math.abs(yaw - Math.PI / 2) < 1e-5 ? 'SIDE / +Z' : Math.abs(Math.abs(yaw) - Math.PI) < 1e-5 ? 'REAR / −X' : 'FREE LOOK');
        refresh();
      });
      const frame = (now: number) => {
        try {
          if (!document.hidden) {
            const dt = frameClock.elapsed(now, true);
            simulation.advance(dt);
            renderer!.render(simulation.eta, simulation.input, settings.current.spectral, settings.current.guides,
              simulation.clocks.position, settings.current.beacons);
            frames++; frameTime += dt;
            if (frameTime >= 1) { setFps(Math.round(frames / frameTime)); frames = 0; frameTime = 0; }
            if (now - published >= 75) { refresh(); published = now; }
          } else frameClock.suspend();
          request = requestAnimationFrame(frame);
        } catch (reason) { fail(reason instanceof Error ? reason.message : 'Rendering failed'); }
      };
      request = requestAnimationFrame(frame);
    } catch (reason) { fail(reason instanceof Error ? reason.message : 'WebGL2 could not start'); }
    window.addEventListener('resize', resize); document.addEventListener('visibilitychange', visibility);
    surface.addEventListener('webglcontextlost', lost);
    return () => {
      cancelAnimationFrame(request); disposeInput(); renderer?.dispose();
      window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility);
      surface.removeEventListener('webglcontextlost', lost);
    };
  }, [simulation]);

  const choose = (beta: number) => { simulation.setVelocity(beta); refresh(); };
  const look = (yaw: number, name: string) => {
    simulation.input.lookYaw = yaw; simulation.input.lookPitch = 0; setView(name);
  };
  const reset = () => { simulation.reset(); setView('FORWARD / +X'); refresh(); };
  const demo = () => {
    if (simulation.demoTime !== null) { simulation.demoTime = null; simulation.running = false; }
    else { simulation.startDemo(); setView('FORWARD / +X'); }
    refresh();
  };
  const stage = snapshot.beta < 0.001 ? 'The universe, at rest.' : snapshot.beta < 0.8 ? 'A different velocity.' :
    snapshot.beta < 0.98 ? 'The sky gathers ahead.' : snapshot.beta < 0.998 ? 'Approaching the limit.' : 'Almost light.';
  const fill = snapshot.target / MAX_BETA * 100;
  const tour = snapshot.demoTime !== null;

  return <main className="experience worlds-layout">
    <canvas ref={canvas} id="universe" tabIndex={0} aria-label="Interactive relativistic starfield. Drag to look around. Velocity remains along lab +X." />
    <div className="shade" aria-hidden="true" />
    <svg className="cockpit" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 84L26 112V575L65 620H235L275 654M1440 84L1414 112V575L1375 620H1205L1165 654" />
      <path d="M515 24H585L602 35H838L855 24H925M490 75H530M910 75H950" />
      <path className="cockpit-hull" d="M0 900V703L44 669L168 691L215 740H1225L1272 691L1396 669L1440 703V900Z" />
    </svg>
    <header className="masthead overlay">
      <div className="brand"><svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="20" rx="18" ry="8" transform="rotate(-40 20 20)" /><circle cx="20" cy="20" r="3" /></svg>
        <div>RELATIVITY<span>DRIVE</span></div><span className="edition">AN INTERACTIVE<br />SPECIAL RELATIVITY EXPERIENCE</span></div>
      <div className="connection"><i className={error ? 'bad' : ''} />{error ? 'GRAPHICS ERROR' : ready ? 'LOCAL SIMULATION' : 'BUILDING THE SKY'}<span>NO NETWORK REQUIRED</span></div>
    </header>

    <section className="flight-readout overlay" aria-label="Spacecraft velocity">
      <p className="eyebrow">OBSERVER VELOCITY / LAB +X</p>
      <div className="velocity"><output data-testid="beta">{snapshot.beta.toFixed(3)}</output><span>c</span></div>
      <div className="gamma"><span>LORENTZ FACTOR</span><b>γ <output data-testid="gamma">{snapshot.gamma.toFixed(3)}</output></b></div>
      <h1>{stage}</h1>
      <p className="subtitle">Fly through stationary light beacons.<br />Lab distance <output data-testid="distance">{snapshot.position.toFixed(2)}</output> light-seconds</p>
      <div className="doppler"><span>AHEAD · APPROACH <b data-testid="doppler-forward">{snapshot.approach.toFixed(2)}×</b><Wavelength doppler={snapshot.approach} /></span>
        <span>BEHIND · RECEDE <b data-testid="doppler-rear">{snapshot.recede.toFixed(3)}×</b><Wavelength doppler={snapshot.recede} /></span></div>
      <small className="frequency-note">Observed / emitted frequency · illustrative colour</small>
    </section>

    <aside className="instruments overlay" aria-label="Clock and length measurements">
      <div className="instrument-title"><span className="eyebrow">TWO CLOCKS. ONE JOURNEY.</span><span className="state-light">{hidden ? 'TAB HIDDEN' : snapshot.running ? 'RUNNING' : 'PAUSED'}</span></div>
      <Clock seconds={snapshot.lab} label="LAB / EARTH TIME" kind="lab" />
      <Clock seconds={snapshot.proper} label="TRAVELLER PROPER TIME" kind="proper" />
      <div className="clock-difference"><span>Traveller clock rate</span><b>{(snapshot.properRate * 100).toFixed(1)}%</b></div>
      <div className="ruler-panel">
        <div className="instrument-title"><span className="eyebrow">LENGTH / LAB MEASUREMENT</span></div>
        <div className="ruler-copy"><span>100 m calibration craft, along +X</span><b><output data-testid="length">{(100 * snapshot.length).toFixed(2)}</output> m</b></div>
        <svg className="ruler" viewBox="0 0 240 64" role="img" aria-label={`Rest length 100 metres. Simultaneous lab length ${(100 * snapshot.length).toFixed(2)} metres.`}>
          <path d="M10 11H95L130 3L153 11H201L230 15L201 19H153L130 27L95 19H10L24 15Z" className="rest-craft" />
          <path d="M0 -4H85L120 -12L143 -4H191L220 0L191 4H143L120 12L85 4H0L14 0Z" className="moving-craft" transform={`translate(10 46) scale(${snapshot.length} 1)`} />
          <path d="M10 15H230M10 7V23M230 7V23" className="rest-ruler" />
          {Array.from({ length: 11 }, (_, i) => <line key={i} x1={10 + i * 22} x2={10 + i * 22} y1="12" y2="18" className="rest-ruler" />)}
          <path d={`M10 46H${10 + 220 * snapshot.length}M10 35V57M${10 + 220 * snapshot.length} 35V57`} className="moving-ruler" />
        </svg>
        <div className="ruler-legend"><span>REST LENGTH</span><span>SIMULTANEOUS LAB LENGTH</span></div>
        <p className="instrument-note">L/L₀ = 1/γ · Coordinate measurement.<br />Not a prediction of photographic shape.</p>
      </div>
    </aside>

    <Minkowski history={simulation.history} t={snapshot.lab} x={snapshot.position} />
    <ReactorPanel snapshot={snapshot} />

    <div className="sight" aria-hidden="true"><div className="reticle">+</div><span>{view === 'FORWARD / +X' ? 'VELOCITY +X' : 'VIEW AXIS'}</span></div>
    <div className="view-strip overlay"><span className="eyebrow">{view}</span><div role="group" aria-label="Look direction">
      <button onClick={() => look(0, 'FORWARD / +X')} aria-pressed={view === 'FORWARD / +X'}>Forward</button>
      <button onClick={() => look(Math.PI / 2, 'SIDE / +Z')} aria-pressed={view === 'SIDE / +Z'}>Side</button>
      <button onClick={() => look(Math.PI, 'REAR / −X')} aria-pressed={view === 'REAR / −X'}>Rear</button>
    </div><span className="drag-note">DRAG TO LOOK · BOOST AXIS STAYS FIXED</span></div>

    <section className="throttle overlay" aria-label="Flight controls">
      <div className="throttle-top"><label htmlFor="throttle" className="eyebrow">VELOCITY THROTTLE</label>
        <span className="target">{snapshot.transitioning ? 'TRANSITION TO' : 'SET VELOCITY'} <b>{snapshot.target.toFixed(3)}c</b></span>
        <div className="transport"><button id="run-pause" onClick={() => { simulation.running = !simulation.running; refresh(); }} disabled={!!error}>
          {snapshot.running ? 'Ⅱ Pause' : '▷ Run'}</button><button onClick={reset}>↺ Reset</button></div></div>
      <input id="throttle" aria-label="Velocity throttle beta v/c" type="range" min="0" max={MAX_BETA} step="0.001"
        value={snapshot.target} onChange={e => choose(Number(e.target.value))}
        style={{ '--fill': `${fill}%` } as CSSProperties} aria-valuetext={`${snapshot.target.toFixed(3)} times the speed of light`} />
      <div className="throttle-bottom"><div className="presets" role="group" aria-label="Velocity presets">
        {PRESETS.map(beta => <button key={beta} aria-pressed={Math.abs(snapshot.target - beta) < 1e-7} onClick={() => choose(beta)}>{beta === 0 ? '0c · REST' : `${beta}c`}</button>)}</div>
        <button className={`demo-button ${tour ? 'active' : ''}`} onClick={demo} disabled={!!error}>
          {tour ? `■ Stop demo · ${Math.ceil(DEMO_DURATION - snapshot.demoTime!)}s` : '▶ Take the 66-second flight'}</button></div>
      {tour && <div className="tour-progress" style={{ width: `${snapshot.demoTime! / DEMO_DURATION * 100}%` }} />}
    </section>

    <footer className="footer overlay"><div><div className="colour-key"><span>REDSHIFT</span><i /><span>BLUESHIFT</span></div>
      <span className="colour-label">Doppler false colour — not literal eye appearance</span>
      <span className="source-note">{STAR_COUNT.toLocaleString()} SYNTHETIC STARS{spectral ? ' · APPROXIMATE SPECTRA' : ' · FREQUENCY COLOURS'} · BEACONS FIXED IN LAB</span></div>
      <details><summary>Display & science <span>+</span></summary><div className="details-panel">
        <h2>Light, from a moving frame.</h2>
        <label><input type="checkbox" checked={spectral} onChange={e => { setSpectral(e.target.checked); settings.current.spectral = e.target.checked; }} /> Approximate stellar spectra</label>
        <label><input type="checkbox" checked={guides} onChange={e => { setGuides(e.target.checked); settings.current.guides = e.target.checked; }} /> Angular reference rings</label>
        <label><input type="checkbox" checked={beacons} onChange={e => { setBeacons(e.target.checked); settings.current.beacons = e.target.checked; }} /> Flight corridor of stationary beacons</label>
        <p>Velocity is along lab +X. Rays point toward sources. The shader applies the photon boost once; camera rotation changes only your view.</p>
        <p>Stellar colour uses three blackbody samples with T′ = D·T. Brightness is compressed for visibility. The nebula tint is illustrative. No exact eye rendering or photometry.</p>
        <p>Flight beacons are stationary in the lab, 2 light-seconds apart. Your position follows dx/dt = βc. Their emission positions stay fixed during light travel; the CPU computes their approaching and receding rays. Beacon colours map log(D), with fixed illustrative opacity and display saturation at ¼× / 4×.</p>
        <p>Manual speed changes are idealised constant-speed segments; the optional tour uses prescribed transitions. Proper time integrates the whole history. No propulsion or acceleration dynamics. Local clocks suspend while this tab is hidden.</p>
        <p>Optional angular reference rings mark catalogue sky angles. The separate craft silhouette measures a 100 m craft at simultaneous lab times, not its optical image. We never squeeze the starfield to imitate length contraction.</p>
        <dl><dt>Graphics</dt><dd>{ready ? `WebGL2 · ${fps} fps` : 'Initialising'}</dd><dt>Photon check</dt><dd>{gpu}</dd><dt>Clock history</dt><dd>{snapshot.historyCount} segment endpoints preserved</dd></dl>
        <p className="keyboard">SPACE pause / run · D demo · R reset · F forward</p>
      </div></details>
    </footer>
    {!ready && !error && <div className="loading overlay" role="status">Preparing your local universe…</div>}
    {error && <div className="error overlay" role="alert"><strong>The scene needs attention.</strong><p>{error}</p><p>Reload the page in a browser with WebGL2 enabled. No network connection is needed.</p></div>}
  </main>;
}
