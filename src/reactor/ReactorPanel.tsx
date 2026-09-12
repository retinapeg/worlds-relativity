import { useEffect, useRef, useState } from 'react';
import { startTravel, type TravelSession, type TravelCredentialsMessage } from '@reactor-models/happy-oyster';
import { HappyOysterProvider, useHappyOyster } from '@reactor-models/happy-oyster/react';
import type { Snapshot } from '../controls/simulation';
import { LatestInstruction, WORLD_PROMPT, worldDirection } from './direction';
import { createTokenResolver } from './token';
import { endRemoteTravel, finishWithin, sendRemoteInstruction } from './endTravel';
import { useRunwareArtwork } from '../runware/artwork';
import { watchWorldVideo } from './media';

const WORLD_CACHE = 'relativity.reactor.directing.orbital-gate.v1';

function safeError(error: unknown) {
  const text = error instanceof Error ? error.message + (error.cause instanceof Error ? ` Cause: ${error.cause.message}` : '') : 'The provider could not complete this request.';
  return text.replace(/(?:Bearer\s+)?[\w=-]{32,}(?:\.[\w=-]+)*/g, '[redacted]').slice(0, 300);
}

function World({ snapshot }: { snapshot: Snapshot }) {
  const artwork = useRunwareArtwork();
  const [artworkVisible, setArtworkVisible] = useState(false);
  const api = useHappyOyster();
  const apiRef = useRef(api); apiRef.current = api;
  const latest = useRef(snapshot); latest.current = snapshot;
  const video = useRef<HTMLVideoElement>(null);
  const media = useRef<ReturnType<typeof watchWorldVideo> | null>(null);
  const mediaElement = useRef<HTMLVideoElement | null>(null);
  const session = useRef<TravelSession | null>(null);
  const pendingTravel = useRef<Promise<TravelSession> | null>(null);
  const credentialsRef = useRef<TravelCredentialsMessage | null>(null);
  const queue = useRef<LatestInstruction | null>(null);
  const lastFlightAction = useRef<string | null>(null);
  const generation = useRef(0), busy = useRef(false);
  const closing = useRef(false);
  const token = useRef<ReturnType<typeof createTokenResolver> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mediaTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const travelStarted = useRef(0);
  const subscriptions = useRef<(() => void)[]>([]);
  const [step, setStep] = useState('idle'), [message, setMessage] = useState('');
  const [playing, setPlaying] = useState(false), [remaining, setRemaining] = useState(180);
  const [playBlocked, setPlayBlocked] = useState(false);
  const [sent, setSent] = useState<{ key: string; text: string } | null>(null);
  const [accepted, setAccepted] = useState<{ key: string; text: string } | null>(null);
  const instructionStarted = useRef(0);
  const [ackDelay, setAckDelay] = useState<number | null>(null);
  const [instructionState, setInstructionState] = useState('Waiting for a live world');
  const [stopConfirmed, setStopConfirmed] = useState(false);
  const [blockedOrigins, setBlockedOrigins] = useState<string[]>([]);
  const [videoEpoch, setVideoEpoch] = useState(0);
  const [needsReload, setNeedsReload] = useState(false);
  const [backend, setBackend] = useState<string | null>(null);
  const [openingArtwork, setOpeningArtwork] = useState(false);
  const [mediaEvidence, setMediaEvidence] = useState('No stream requested.');

  const stop = async (reason = 'stopped') => {
    if (closing.current) return;
    const interruptedSetup = busy.current && !session.current;
    closing.current = true; generation.current++; busy.current = true;
    clearTimeout(timeout.current);
    clearTimeout(mediaTimeout.current);
    media.current?.dispose(); media.current = null;
    queue.current?.close(); queue.current = null;
    subscriptions.current.forEach(unsubscribe => unsubscribe()); subscriptions.current = [];
    const active = session.current; session.current = null;
    const pending = pendingTravel.current;
    // Late setup continuations and factories can still reach the shared SDK.
    // Require a new runtime before reconnecting after interrupted setup.
    if (interruptedSetup || pending) setNeedsReload(true);
    // React clears DOM refs before passive unmount cleanup; retain the element we bound.
    const attached = mediaElement.current ?? video.current;
    if (attached && (active || pending)) {
      const stream = attached.srcObject;
      const tracks = stream instanceof MediaStream ? stream.getVideoTracks() : [];
      setMediaEvidence(`Video ${attached.videoWidth}×${attached.videoHeight}; ready state ${attached.readyState}; ${tracks.filter(track => track.readyState === 'live').length} live video tracks; ${attached.getVideoPlaybackQuality?.().totalVideoFrames ?? 0} decoded frames.`);
    }
    mediaElement.current = null;
    const detach = () => {
      if (!attached) return;
      attached.pause();
      const stream = attached.srcObject;
      attached.srcObject = null;
      if (stream instanceof MediaStream) stream.getTracks().forEach(track => track.stop());
    };
    detach();
    setPlaying(false); setPlayBlocked(false); setStep('stopping');
    try {
      const travelId = apiRef.current.travelState?.encrypted_travel_id;
      if (credentialsRef.current && travelId) {
        await endRemoteTravel(credentialsRef.current, travelId);
        setStopConfirmed(true);
      }
    }
    catch { setMessage('Direct world stop was not confirmed; closing its Reactor session.'); }
    finally {
      if (active) void active.travel.end().catch(() => {});
      try { await finishWithin(apiRef.current.disconnect()); }
      catch { setNeedsReload(true); setMessage('Disconnect is unconfirmed. Reload before reconnecting; the server enforces a 5-minute session cap.'); }
      finally {
        // Aliyun can leave a cancelled join promise unresolved. Release its
        // documented singleton and keep late cleanup attached without waiting
        // forever for that promise. Remote end confirmation is separate.
        if (active || pending) {
          try { await finishWithin((async () => { const { AliRtcEngine } = await import('aliyun-rtc-sdk'); await AliRtcEngine.getInstance().destroy(); })()); }
          catch { setNeedsReload(true); setMessage('Media cleanup needs a page reload before reconnecting.'); }
        }
        if (pending) void pending.then(late => { detach(); return late.travel.end(); }).catch(() => {});
        pendingTravel.current = null;
        credentialsRef.current = null;
        closing.current = false; busy.current = false; setStep(reason);
      }
    }
  };
  const stopRef = useRef(stop); stopRef.current = stop;
  useEffect(() => {
    const leave = () => { void stopRef.current(); };
    const violation = (event: SecurityPolicyViolationEvent) => {
      try { const origin = new URL(event.blockedURI).origin; setBlockedOrigins(old => old.includes(origin) ? old : [...old, origin]); } catch { /* Inline violation has no host. */ }
    };
    window.addEventListener('pagehide', leave);
    document.addEventListener('securitypolicyviolation', violation);
    return () => { window.removeEventListener('pagehide', leave); document.removeEventListener('securitypolicyviolation', violation); void stopRef.current(); };
  }, []);

  const start = async () => {
    if (busy.current || session.current || needsReload) return;
    busy.current = true;
    const id = ++generation.current;
    const current = () => generation.current === id;
    setMessage(''); setSent(null); setAccepted(null); setPlaying(false); setPlayBlocked(false); setStep('authorising'); setStopConfirmed(false); setVideoEpoch(old => old + 1);
    setInstructionState('Waiting for a live world'); setRemaining(180); setAckDelay(null);
    setMediaEvidence('Waiting for stream attachment.'); setOpeningArtwork(false);
    token.current = createTokenResolver();
    timeout.current = setTimeout(() => { setMessage('World setup exceeded four minutes. Restart explicitly when ready.'); void stopRef.current('expired'); }, 240000);
    try {
      await token.current.resolve();
      if (!current()) return;
      setBackend(token.current.hosting());
      setStep('connecting');
      // SDK attempt options count readiness/SDP polls, not newly created sessions.
      // The JWT's max_sessions=1 and one explicit connect bound allocation.
      await apiRef.current.connect(token.current.resolve);
      if (!current()) { await finishWithin(apiRef.current.disconnect()).catch(() => {}); return; }
      setStep('creating world');
      let saved: { id: string; mode: number; artwork: boolean } | null = null;
      try { saved = JSON.parse(localStorage.getItem(WORLD_CACHE) ?? 'null'); } catch { /* Storage is optional. */ }
      const reusable = saved?.mode === 2 && typeof saved.id === 'string' && saved.id.trim().length > 0;
      const world = reusable ?
        await apiRef.current.attachWorld(saved!.id) :
        await apiRef.current.createWorld({ prompt: WORLD_PROMPT, resolution: '720p', layout: 'Stable', narrative: 'Calm',
          ...(artwork.image ? { firstFrameImage: artwork.image } : {}) });
      if (!current()) return;
      const usedArtwork = reusable ? saved!.artwork === true : !!artwork.image;
      setOpeningArtwork(usedArtwork);
      if (world.encrypted_world_id) {
        try { localStorage.setItem(WORLD_CACHE, JSON.stringify({ id: world.encrypted_world_id, mode: 2, artwork: usedArtwork })); } catch { /* Reuse is optional. */ }
      }
      setStep('starting travel');
      const credentials = await apiRef.current.model.requestCredentials();
      if (!current()) return;
      if (credentials.mock) throw new Error('The provider returned mock credentials; no live world is available.');
      credentialsRef.current = credentials;
      travelStarted.current = Date.now();
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => { void stopRef.current('expired'); }, 180000);
      mediaTimeout.current = setTimeout(() => {
        const element = mediaElement.current;
        const stream = element?.srcObject;
        const tracks = stream instanceof MediaStream ? stream.getVideoTracks() : [];
        setMessage(tracks.some(track => track.readyState === 'live') ?
          'Media did not start within 60 seconds: a video track arrived but no advancing playback was confirmed. The world is being stopped.' :
          'Media did not start within 60 seconds: no live video track arrived. The world is being stopped.');
        void stopRef.current('failed');
      }, 60000);
      mediaElement.current = video.current;
      media.current = watchWorldVideo(mediaElement.current!, {
        playing: value => { if (current()) { setPlaying(value); if (value) clearTimeout(mediaTimeout.current); } },
        blocked: value => { if (current()) setPlayBlocked(value); },
        failed: text => { if (current()) { setMessage(text); void stopRef.current('failed'); } },
        ended: () => { if (current()) void stopRef.current('completed'); },
      });
      // The exported SDK factory makes one attempt. The high-level hook retries
      // three times, which would exceed the autonomous integration budget.
      pendingTravel.current = startTravel({ credentials, videoElement: video.current!, logLevel: 'none', streamReadyTimeout: 60000 });
      const active = await pendingTravel.current;
      if (!current()) return; // Stop owns cleanup of this late factory result.
      pendingTravel.current = null;
      session.current = active;
      subscriptions.current = [
        active.travel.on('statusChanged', status => {
          if (!current()) return;
          setStep(status);
          if (status === 'completed' || status === 'failed') void stopRef.current(status);
        }),
        active.travel.onError(error => { if (current()) { setMessage(safeError(error)); void stopRef.current('failed'); } }),
      ];
      setStep('travel connected');
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => { void stopRef.current('expired'); }, Math.max(0, 180000 - (Date.now() - travelStarted.current)));
    } catch (error) {
      if (current()) { setMessage(safeError(error)); await stopRef.current('failed'); }
    } finally { if (current()) busy.current = false; }
  };

  useEffect(() => {
    const travel = api.travelState, credentials = credentialsRef.current;
    if (queue.current || closing.current || api.phase !== 'connected' || travel?.status !== 'running' || !credentials) return;
    queue.current = new LatestInstruction(async text => {
      setInstructionState('Sending direction…');
      await sendRemoteInstruction(credentials, travel.encrypted_travel_id, text);
    }, (key, text) => {
      setAckDelay((Date.now() - instructionStarted.current) / 1000);
      setAccepted({ key, text }); setInstructionState('Direction accepted · awaiting timeline');
    }, error => { setInstructionState('Direction failed'); setMessage(safeError(error)); },
    (key, text) => { instructionStarted.current = Date.now(); setSent({ key, text }); });
    queue.current.push(worldDirection(latest.current));
  }, [api.phase, api.travelState?.status, api.travelState?.encrypted_travel_id]);
  useEffect(() => {
    if (credentialsRef.current && ['failed', 'completed'].includes(api.travelState?.status ?? ''))
      void stopRef.current(api.travelState!.status);
  }, [api.travelState?.status]);

  // Flight events are immediate. Debounce qualitative view/optical changes;
  // continuously changing beta labels must not suppress a short braking phase.
  const direction = worldDirection(snapshot);
  useEffect(() => {
    const actionChanged = lastFlightAction.current !== direction.action;
    lastFlightAction.current = direction.action;
    if (actionChanged) { queue.current?.push(direction); return; }
    const timer = setTimeout(() => queue.current?.push(worldDirection(latest.current)), 450);
    return () => clearTimeout(timer);
  }, [direction.action, direction.text]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!session.current) return;
      setRemaining(Math.max(0, Math.ceil(180 - (Date.now() - travelStarted.current) / 1000)));
      if (token.current?.expiry() && Date.now() >= (token.current.expiry()! - 10) * 1000) void stopRef.current('expired');
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const scheduled = accepted && api.travelState?.user_instructions.find(item => item.instruction === accepted.text);
  const active = !['idle', 'stopped', 'failed', 'expired', 'completed'].includes(step);
  const building = ['creating', 'building'].includes(api.worldState?.phase ?? '') || step === 'creating world';
  const streaming = !!credentialsRef.current || api.travelState?.status === 'running';
  const reactorLabel = playing ? 'Reactor: Live' : active ? step === 'stopping' ? 'Reactor: stopping' :
    building ? 'Reactor: Building world' : streaming ? 'Reactor: Starting stream' : 'Reactor: Connecting' :
    step === 'failed' ? 'Reactor: error' : 'Reactor: stopped';
  return <section className="world-panel" aria-label="Reactor generated world">
    <div className="world-heading"><div><span className="eyebrow">{playing ? 'REACTOR · LIVE VIDEO' : 'REACTOR · VIDEO UNVERIFIED'}</span><h2>{playing ? 'AI WORLD' : active ? 'Reactor is imagining this journey…' : 'Generate AI World'}</h2></div>
      <span className={`world-status ${playing ? 'live' : ''}`} data-testid="world-status"
        data-state={playing ? 'VIDEO PLAYING' : step.toUpperCase()}
        title={playing ? 'Receiving advancing decoded video frames' : 'Video is not playing'}>{reactorLabel}</span></div>
    <div className="world-screen">
      <video key={videoEpoch} ref={video} poster={artwork.url || undefined} autoPlay muted playsInline aria-label="Live HappyOyster world video" />
      {!playing && <div className="world-placeholder"><div className="window-symbol" aria-hidden="true">✦</div>
        <h3>{active ? 'Opening a window to the world…' : 'One cockpit. An evolving sky.'}</h3>
        <p>{active ? `${api.phase} · world ${api.worldState?.phase ?? 'not created'}` : 'Start a live Reactor world, then change speed to direct its artistic impression.'}</p>
        {playBlocked && <button onClick={() => { void media.current?.play(); }}>Play video</button>}
        {!active && <span>{artwork.image ? 'RUNWARE STARTING FRAME · HAPPYOYSTER DIRECTING' : 'HAPPYOYSTER · DIRECTING MODE'}</span>}</div>}
      {playing && <span className="world-countdown">{remaining}s remaining</span>}
    </div>
    {artwork.url && !playing && <figure className="runware-frame">
      <img src={artwork.url} alt="Runware-generated cockpit approaching an illuminated orbital gate" onLoad={() => setArtworkVisible(true)} onError={() => setArtworkVisible(false)} />
      <figcaption>Runware-generated artwork · illustrative still</figcaption>
    </figure>}
    <p className="ai-label">AI-generated illustration — not an exact relativistic optical rendering.</p>
    <div className="artwork-status" role="status"><span>{artwork.message}</span>
      {artwork.canGenerate && <button disabled={active || artwork.busy} onClick={() => { void artwork.generate(); }}>
        {artwork.busy ? 'Generating…' : 'Generate starting frame'}</button>}</div>
    <div className="world-controls"><button className="start-world" onClick={() => { if (needsReload) window.location.reload(); else void start(); }} disabled={active}>✦ {needsReload ? 'Reload page' : 'Generate AI World'}</button>
      <button onClick={() => { void stop(); }} disabled={!active}>Stop world</button><span>ONE WORLD · 3 MIN MAX</span></div>
    <div className="direction-status" role="status">
      <div data-testid="world-local-direction">Local: {direction.key} · {direction.action}</div>
      <div data-testid="world-accepted-direction">Last accepted: {accepted?.key ?? 'none'}</div>
      {ackDelay !== null && <small>Last acknowledgement took {ackDelay.toFixed(1)}s. Visual response may arrive later.</small>}
      <small>{!active ? 'World stopped · local controls remain independent.' : instructionState === 'Direction failed' ? instructionState :
        accepted?.text === direction.text ? 'Current artistic direction acknowledged · imagery may differ.' :
        accepted ? 'Local view changed · awaiting latest direction.' : instructionState}</small>
    </div>
    {message && <p className="provider-error" role="alert">{message} Local science remains available.</p>}
    <div className="sponsor-provenance" data-testid="world-provenance">
      <span>PHYSICS — Local deterministic SR engine · ● ACTIVE</span>
      <span>AI WORLD — Reactor / HappyOyster · {playing ? '● ACTIVE' : step === 'failed' ? '× BLOCKED' : '○ READY / UNVERIFIED'}</span>
      <span>VISUAL ASSET — Runware · {artworkVisible && (!playing || openingArtwork) ? '● ACTIVE' : artwork.status?.attempted && !artwork.status.ready ? '× BLOCKED' : '○ READY / UNVERIFIED'}</span>
      <span>BACKEND — Modal · {backend === 'modal' || (artwork.image || artwork.status?.attempted) && artwork.status?.hosting === 'modal' ? '● ACTIVE' : '○ READY / UNVERIFIED'}</span>
    </div>
    <details className="world-diagnostics"><summary>Connection details</summary><p>Reactor: {api.phase} · Last connected world snapshot: {api.worldState?.phase ?? 'none'} · Travel: {stopConfirmed ? 'completed (end confirmed)' : api.travelState?.status ?? 'none'}</p>
      <p>{stopConfirmed ? 'Provider confirmed travel ended.' : 'No travel-end confirmation for this connection.'}</p>
      <p>{mediaEvidence}</p>
      {blockedOrigins.length > 0 && <p>Blocked network origins: {blockedOrigins.join(', ')}</p>}
      <p>Instruction acceptance describes provider scheduling, not exact imagery or instantaneous synchronisation. Display colour is illustrative.</p>
      <p data-testid="world-sent-direction">Last sent: {sent?.key ?? 'none'}</p>
      <p data-testid="world-timeline">Matching provider timeline: {scheduled?.status ?? 'no matching entry'}. Matched by instruction text; repeated directions may match an earlier entry. This does not report current local speed.</p>
      {sent && <p>{sent.text}</p>}</details>
  </section>;
}

export function ReactorPanel({ snapshot }: { snapshot: Snapshot }) {
  return <HappyOysterProvider mode="directing" autoConnect={false} logLevel="off">
    <World snapshot={snapshot} />
  </HappyOysterProvider>;
}
