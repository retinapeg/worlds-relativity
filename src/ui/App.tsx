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

const SHIP = 'M0 -4H85L120 -12L143 -4H191L220 0L191 4H143L120 12L85 4H0L14 0Z';
function viewName(yaw: number, pitch: number) {
  const angle = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  return Math.abs(pitch) > 1e-5 ? 'FREE LOOK' : Math.abs(angle) < 1e-5 ? 'FORWARD / +X' :
    Math.abs(angle - Math.PI / 2) < 1e-5 ? 'SIDE / +Z' : Math.abs(Math.abs(angle) - Math.PI) < 1e-5 ? 'REAR / −X' : 'FREE LOOK';
}
function Clock({ seconds, label, kind }: { seconds: number; label: string; kind: string }) {
  return <div className={`clock ${kind}`}>
    <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" className="clock-track" />
      <circle cx="24" cy="24" r="20" className="clock-progress" strokeDasharray={`${(seconds % 1) * 125.664} 125.664`} />
      <line x1="24" y1="24" x2="24" y2="10" transform={`rotate(${seconds % 1 * 360} 24 24)`} /><circle cx="24" cy="24" r="2" /></svg>
    <div><span className="eyebrow">{label}</span><output data-testid={`${kind}-time`} data-seconds={seconds.toFixed(6)}>{formatTime(seconds)}</output></div>
  </div>;
}
export function App() {
  const [simulation] = useState(() => { const flight = new Simulation(true); flight.setVelocity(0.1); return flight; });
  const canvas = useRef<HTMLCanvasElement>(null);
  const settings = useRef({ spectral: false, guides: false, beacons: true });
  const [snapshot, setSnapshot] = useState(simulation.snapshot());
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const [gpu, setGpu] = useState('Pending'), [fps, setFps] = useState(0);
  const [spectral, setSpectral] = useState(false), [guides, setGuides] = useState(false);
  const [beacons, setBeacons] = useState(true);
  const [hidden, setHidden] = useState(document.hidden);
  const [modal, setModal] = useState('checking');
  const [explain, setExplain] = useState(false);
  const view = viewName(snapshot.lookYaw, snapshot.lookPitch);
  const refresh = () => setSnapshot(simulation.snapshot());

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetch('/api/health', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const health = response.ok ? await response.json() : null;
        setModal(health?.hosting === 'modal' ? 'reachable' : 'unavailable');
      }).catch(() => setModal('unavailable')).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  useEffect(() => {
    const surface = canvas.current!;
    let renderer: RelativityRenderer | undefined, request = 0;
    const frameClock = new FrameClock();
    let frames = 0, frameTime = 0;
    let disposeInput = () => {};
    const fail = (message: string) => { simulation.running = false; setError(message); refresh(); };
    const visibility = () => { frameClock.suspend(); setHidden(document.hidden); };
    const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(request); fail('The graphics context was lost. Reload to recover the local scene.'); };
    const resize = () => renderer?.resize();
    const resizeObserver = new ResizeObserver(resize);
    try {
      renderer = new RelativityRenderer(surface, createProceduralSource());
      resizeObserver.observe(surface);
      setGpu(renderer.gpuCheck); setReady(true);
      disposeInput = attachDesktop(surface, simulation, refresh);
      const frame = (now: number) => {
        try {
          if (!document.hidden) {
            const dt = frameClock.elapsed(now, true);
            simulation.advance(dt);
            const current = simulation.snapshot();
            // Baseline changes only the optical transform. Camera, source
            // positions, journey history and exact measurements stay identical.
            renderer!.render(current.opticalBaseline ? 0 : current.eta, simulation.input, settings.current.spectral, settings.current.guides,
              current.position, settings.current.beacons);
            setSnapshot(current);
            frames++; frameTime += dt;
            if (frameTime >= 1) { setFps(Math.round(frames / frameTime)); frames = 0; frameTime = 0; }
          } else frameClock.suspend();
          request = requestAnimationFrame(frame);
        } catch (reason) { fail(reason instanceof Error ? reason.message : 'Rendering failed'); }
      };
      request = requestAnimationFrame(frame);
    } catch (reason) { fail(reason instanceof Error ? reason.message : 'WebGL2 could not start'); }
    window.addEventListener('resize', resize); document.addEventListener('visibilitychange', visibility);
    surface.addEventListener('webglcontextlost', lost);
    return () => {
      cancelAnimationFrame(request); resizeObserver.disconnect(); disposeInput(); renderer?.dispose();
      window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility);
      surface.removeEventListener('webglcontextlost', lost);
    };
  }, [simulation]);

  const choose = (beta: number) => { simulation.setVelocity(beta); refresh(); };
  const look = (yaw: number) => { simulation.setLook(yaw); refresh(); };
  const reset = () => { simulation.reset(); refresh(); };
  const experience = () => { simulation.setVelocity(MAX_BETA); simulation.opticalBaseline = false; simulation.running = true; refresh(); };
  const burst = () => { simulation.opticalBaseline = false; simulation.startBurst(); refresh(); };
  const demo = () => {
    if (simulation.demoTime !== null) { simulation.stopDemo(); simulation.running = false; }
    else simulation.startDemo();
    refresh();
  };
  const stage = snapshot.beta < 0.001 ? 'The universe, at rest.' : snapshot.beta < 0.8 ? 'A different velocity.' :
    snapshot.beta < 0.98 ? 'The sky gathers ahead.' : snapshot.beta < 0.998 ? 'Approaching the limit.' : 'Almost light.';
  const fill = snapshot.target / MAX_BETA * 100;
  const tour = snapshot.demoTime !== null;
  const moment = snapshot.burstTime !== null && snapshot.burstTime >= 2 && snapshot.burstTime < 4 && snapshot.beta > 0.998;

  return <main className={`experience impact-layout flythrough-layout cinematic-layout${explain ? ' explain-open' : ''}${moment ? ' measurement-moment' : ''}`}>
    <canvas ref={canvas} id="universe" tabIndex={0} aria-label="Relativistic flight through stationary gates and a gridded station. Drag to look around. Velocity remains along lab +X." />
    <div className="shade" aria-hidden="true" />
    <svg className="cockpit" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 84L26 112V575L65 620H235L275 654M1440 84L1414 112V575L1375 620H1205L1165 654" />
      <path d="M515 24H585L602 35H838L855 24H925M490 75H530M910 75H950" />
      <path className="cockpit-hull" d="M0 900V703L44 669L168 691L215 740H1225L1272 691L1396 669L1440 703V900Z" />
    </svg>
    <header className="masthead overlay">
      <div className="brand"><svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="20" rx="18" ry="8" transform="rotate(-40 20 20)" /><circle cx="20" cy="20" r="3" /></svg>
        <div>RELATIVITY<span>DRIVE</span></div><span className="edition">AN INTERACTIVE<br />SPECIAL RELATIVITY EXPERIENCE</span></div>
      <div className="connection"><i className={error ? 'bad' : ''} />{error ? 'GRAPHICS ERROR' : ready ? 'Physics: local / offline ready' : 'BUILDING THE SKY'}<span data-testid="modal-health">Modal backend: {modal} · Live video uses the network</span></div>
    </header>

    <section className="flight-readout overlay" aria-label="Spacecraft velocity">
      <p className="eyebrow">OBSERVER VELOCITY / LAB +X</p>
      <div className="velocity"><output data-testid="beta" data-beta={snapshot.beta}>{snapshot.beta.toFixed(3)}</output><span>c</span></div>
      <div className="gamma"><span>LORENTZ FACTOR</span><b>γ <output data-testid="gamma">{snapshot.gamma.toFixed(3)}</output></b></div>
      <h1>{stage}</h1>
      <button className="experience-button burst-button" onClick={burst} disabled={!!error}>ENGAGE RELATIVITY <span>SPACE ↗</span></button>
      <p className="burst-status"><strong data-testid="burst-phase" data-phase={snapshot.burstPhase ?? ''} data-burst-time={snapshot.burstTime ?? ''}>{snapshot.burstPhase ?? (snapshot.running ? 'CRUISING' : 'READY TO FLY')}</strong><span>illustrative acceleration profile</span></p>
      <button className="instant-experience" onClick={experience} disabled={!!error}>Experience 99.9% of light speed instantly</button>
      <p className="subtitle">Lab distance <output data-testid="distance" data-position={snapshot.position}>{snapshot.position.toFixed(2)}</output> light-seconds · gates every 0.45 ls</p>
      <div className="doppler"><span>AHEAD · APPROACH <b data-testid="doppler-forward">{snapshot.approach.toFixed(2)}×</b><Wavelength doppler={snapshot.approach} /></span>
        <span>BEHIND · RECEDE <b data-testid="doppler-rear">{snapshot.recede.toFixed(3)}×</b><Wavelength doppler={snapshot.recede} /></span></div>
      <small className="frequency-note">Observed / emitted frequency · illustrative colour</small>
    </section>

    <div className="physics-view-title"><strong>PHYSICS SIMULATION</strong><span>deterministic special relativity</span></div>
    <aside className="journey-clocks" aria-label="Accumulated journey clocks"><Clock seconds={snapshot.lab} label="LAB CLOCK" kind="lab" />
      <Clock seconds={snapshot.proper} label="SHIP CLOCK" kind="proper" /></aside>
    <div className="explain-layer" aria-label="Physics explanation">
    <section className="measurement-panel" aria-label="Simultaneous lab-frame length measurement">
      <div className="instrument-title"><span className="eyebrow">01 / LENGTH CONTRACTION</span><span className="measurement-frame">SIDE ON · FIXED SCALE</span></div>
      <div className="length-headline"><span>100 m <i>→</i></span><b><output data-testid="length">{(100 * snapshot.length).toFixed(2)}</output> <small>m</small></b></div>
      <p className="shorter"><output data-testid="length-reduction">{(100 * (1 - snapshot.length)).toFixed(2)}</output>% shorter in the lab frame</p>
      <div className="rest-label">100 m at rest</div>
      <svg className="ruler" viewBox="0 0 240 106" preserveAspectRatio="none" role="img" aria-label={`100 metres at rest. Simultaneous lab length ${(100 * snapshot.length).toFixed(3)} metres. Fixed scale, transverse size unchanged.`}>
        <path d={SHIP} data-testid="rest-craft" className="rest-craft" transform="translate(10 27)" />
        <path d="M10 46H230M10 17V52M230 17V52" className="rest-ruler" />
        {Array.from({ length: 11 }, (_, i) => <g key={i}><line x1={10 + i * 22} x2={10 + i * 22} y1="43" y2="49" className="rest-ruler" />
          {i % 2 === 0 && <text x={10 + i * 22} y="58" textAnchor="middle">{i * 10}</text>}</g>)}
        <path d={SHIP} data-testid="moving-craft" className="moving-craft" transform={`translate(10 79) scale(${snapshot.length} 1)`} />
        <path d={`M10 96H${10 + 220 * snapshot.length}M10 65V100M${10 + 220 * snapshot.length} 65V100`} className="moving-ruler" />
      </svg>
      <p className="measurement-caption"><strong>Simultaneous lab-frame measurement</strong> · L = L₀/γ.<br />Only length along motion changes. This is not a camera photograph.</p>
    </section>
    <aside className="time-panel" aria-label="Time dilation and accumulated journey clocks">
      <div className="instrument-title"><span className="eyebrow">02 / TIME DILATION</span><span className="state-light">{hidden ? 'TAB HIDDEN' : snapshot.running ? 'RUNNING' : 'PAUSED'}</span></div>
      <div className="rate-statement"><span>{snapshot.transitioning ? 'At the current speed' : 'At this speed'}: 1 second onboard</span><strong>= <output data-testid="lab-per-ship-second">{snapshot.gamma.toFixed(2)}</output> <small>seconds in the lab</small></strong></div>
      <p className="tick-note">Each sweep = 1 second on that clock. No time multiplier.</p>
      <p className="constant-comparison"><span>Calculated comparison at this constant speed</span>60 lab seconds <b>→ <output data-testid="ship-over-60">{(60 * snapshot.properRate).toFixed(2)}</output> ship seconds</b></p>
    </aside>
    </div>
    <ReactorPanel key="reactor-world" snapshot={snapshot} />

    <div className="sight" aria-hidden="true"><div className="reticle">+</div><span>{view === 'FORWARD / +X' ? 'VELOCITY +X' : 'VIEW AXIS'}</span></div>
    <div className="view-strip overlay"><span className="eyebrow" data-testid="view-label">{view}</span><div role="group" aria-label="Look direction">
      <button onClick={() => look(0)} aria-pressed={view === 'FORWARD / +X'}>Forward</button>
      <button onClick={() => look(Math.PI / 2)} aria-pressed={view === 'SIDE / +Z'}>Side</button>
      <button onClick={() => look(Math.PI)} aria-pressed={view === 'REAR / −X'}>Rear</button>
    </div><button className="baseline-button" data-testid="optical-baseline" aria-pressed={snapshot.opticalBaseline}
      onClick={() => { simulation.setOpticalBaseline(!simulation.opticalBaseline); refresh(); }}>
      {snapshot.opticalBaseline ? 'Restore relativistic optics' : 'Compare without optical effects'}</button>
      <span className="baseline-note">{snapshot.opticalBaseline ? 'BASELINE VIEW · optics off; measurements stay physical' : 'RELATIVISTIC VIEW · same camera and scene for comparison'}</span></div>

    <section className="throttle overlay" aria-label="Flight controls">
      <div className="throttle-top"><label htmlFor="throttle" className="eyebrow">VELOCITY THROTTLE</label>
        <span className="target">CURRENT <b>{snapshot.beta.toFixed(3)}c</b> {snapshot.transitioning ? '→ TARGET' : '· TARGET'} <b data-testid="target-beta">{snapshot.target.toFixed(3)}c</b></span>
        <div className="transport"><button id="run-pause" onClick={() => { simulation.running = !simulation.running; refresh(); }} disabled={!!error}>
          {snapshot.running ? 'Ⅱ Pause' : '▷ Run'}</button><button onClick={reset}>↺ Reset</button></div></div>
      <input id="throttle" aria-label="Velocity throttle beta v/c" type="range" min="0" max={MAX_BETA} step="0.001"
        value={snapshot.target} onChange={e => choose(Number(e.target.value))}
        style={{ '--fill': `${fill}%` } as CSSProperties} aria-valuetext={`${snapshot.target.toFixed(3)} times the speed of light`} />
      <div className="throttle-bottom"><div className="presets" role="group" aria-label="Velocity presets">
        {PRESETS.map(beta => <button key={beta} aria-pressed={Math.abs(snapshot.target - beta) < 1e-7} onClick={() => choose(beta)}>{beta === 0 ? '0c · REST' : `${beta}c`}</button>)}</div>
        <button className={`demo-button ${tour ? 'active' : ''}`} onClick={demo} disabled={!!error}>
          {tour ? `■ Stop demo · ${Math.ceil(DEMO_DURATION - snapshot.demoTime!)}s` : `▶ Take the ${DEMO_DURATION}-second flight`}</button></div>
      <p className="tour-caption">{tour ? snapshot.tourStage : 'Presets change velocity immediately. Tour transitions are illustrative, not a realistic acceleration programme.'}</p>
      {tour && <div className="tour-progress" style={{ width: `${snapshot.demoTime! / DEMO_DURATION * 100}%` }} />}
    </section>

    <footer className="footer overlay"><button className="explain-toggle" aria-expanded={explain} onClick={() => setExplain(!explain)}>{explain ? 'Close Explain' : 'Explain'}</button><div><div className="colour-key"><span>REDSHIFT</span><i /><span>BLUESHIFT</span></div>
      <span className="colour-label">{spectral ? 'Approximate spectra · illustrative exposure, not literal eye appearance' : 'Doppler false colour — not literal eye appearance'}</span>
      <span className="source-note">{STAR_COUNT.toLocaleString()} SYNTHETIC STARS · STATIONARY LAB COURSE · 1 LIGHT-SECOND = c × 1 LAB SECOND</span></div>
      <details><summary>Display & science <span>+</span></summary><div className="details-panel">
        <h2>Light, from a moving frame.</h2>
        <label><input type="checkbox" checked={spectral} onChange={e => { setSpectral(e.target.checked); settings.current.spectral = e.target.checked; }} /> Approximate stellar spectra</label>
        <label><input type="checkbox" checked={guides} onChange={e => { setGuides(e.target.checked); settings.current.guides = e.target.checked; }} /> Angular reference rings</label>
        <label><input type="checkbox" checked={beacons} onChange={e => { setBeacons(e.target.checked); settings.current.beacons = e.target.checked; }} /> Stationary gates and gridded flight course</label>
        <p>Velocity is along lab +X. Rays point toward sources. The shader applies the photon boost once; camera rotation changes only your view.</p>
        <p>Stellar colour uses three blackbody samples with T′ = D·T. Brightness is compressed for visibility. The nebula tint is illustrative. No exact eye rendering or photometry.</p>
        <p>The fixed course contains polygonal gates 0.45 light-seconds apart, a gridded side truss and tilted boxes. Your position follows dx/dt = βc with c = 1 light-second per lab second. Each sampled edge point supplies a ray from your current position; the photon transform runs once, followed by camera projection. No extra length squeeze is applied.</p>
        <p>Course structures are stationary emitters, so their emission positions do not move during light travel. Thin sampled wires, finite course extent, illustrative exposure and false colour simplify the image. This is not exact photographic rendering of moving objects.</p>
        <p>SPACE launches a short burst: accelerate, coast at 0.999c, then brake to 0.2c. If already fast, it brakes first. This is illustrative acceleration prescribed in rapidity, not propulsion dynamics. Clocks integrate the same velocity history used for translation. Manual speed changes cancel the burst; pause freezes it. The optional tour also uses prescribed transitions. Local clocks suspend while this tab is hidden.</p>
        <p>Optional angular reference rings mark catalogue sky angles. The separate craft silhouette measures a 100 m craft at simultaneous lab times, not its optical image. We never squeeze the starfield to imitate length contraction.</p>
        <p>The optical baseline turns off the photon transform using the same camera, source positions and current lab position. It never resets or changes the journey clocks or measured ship length. False colours saturate at ¼× / 4× for readability; numerical wavelengths stay unclamped.</p>
        <Minkowski history={simulation.history} t={snapshot.lab} x={snapshot.position} />
        <dl><dt>Graphics</dt><dd>{ready ? `WebGL2 · ${fps} fps` : 'Initialising'}</dd><dt>Photon check</dt><dd>{gpu}</dd><dt>Clock history</dt><dd>{snapshot.historyCount} segment endpoints preserved</dd></dl>
        <p className="keyboard">SPACE burst · P pause / run · D tour · R reset · F forward</p>
      </div></details>
    </footer>
    {!ready && !error && <div className="loading overlay" role="status">Preparing your local universe…</div>}
    {error && <div className="error overlay" role="alert"><strong>The scene needs attention.</strong><p>{error}</p><p>Reload the page in a browser with WebGL2 enabled. No network connection is needed.</p></div>}
  </main>;
}
