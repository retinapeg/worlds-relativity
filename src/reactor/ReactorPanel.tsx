import { useEffect, useRef, useState } from 'react';
import { startTravel, type TravelSession, type TravelCredentialsMessage } from '@reactor-models/happy-oyster';
import { HappyOysterProvider, useHappyOyster } from '@reactor-models/happy-oyster/react';
import type { Snapshot } from '../controls/simulation';
import { LatestInstruction, WORLD_PROMPT, worldDirection } from './direction';
import { createTokenResolver } from './token';
import { endRemoteTravel, finishWithin, sendRemoteInstruction } from './endTravel';
import { useRunwareArtwork } from '../runware/artwork';
import { watchWorldVideo } from './media';

function safeError(error: unknown) {
  const text = error instanceof Error ? error.message + (error.cause instanceof Error ? ` Cause: ${error.cause.message}` : '') : 'The provider could not complete this request.';
  return text.replace(/(?:Bearer\s+)?[\w=-]{32,}(?:\.[\w=-]+)*/g, '[redacted]').slice(0, 300);
}

function World({ snapshot }: { snapshot: Snapshot }) {
  const artwork = useRunwareArtwork();
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
  const [instructionState, setInstructionState] = useState('Waiting for a live world');
  const [stopConfirmed, setStopConfirmed] = useState(false);
  const [blockedOrigins, setBlockedOrigins] = useState<string[]>([]);
  const [videoEpoch, setVideoEpoch] = useState(0);
  const [needsReload, setNeedsReload] = useState(false);

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
    setMessage(''); setSent(null); setPlaying(false); setPlayBlocked(false); setStep('authorising'); setStopConfirmed(false); setVideoEpoch(old => old + 1);
    setInstructionState('Waiting for a live world'); setRemaining(180);
    token.current = createTokenResolver();
    timeout.current = setTimeout(() => { setMessage('World setup exceeded four minutes. Restart explicitly when ready.'); void stopRef.current('expired'); }, 240000);
    try {
      await token.current.resolve();
      if (!current()) return;
      setStep('connecting');
      // SDK attempt options count readiness/SDP polls, not newly created sessions.
      // The JWT's max_sessions=1 and one explicit connect bound allocation.
      await apiRef.current.connect(token.current.resolve);
      if (!current()) { await finishWithin(apiRef.current.disconnect()).catch(() => {}); return; }
      setStep('creating world');
      await apiRef.current.createWorld({ prompt: WORLD_PROMPT, resolution: '720p', layout: 'Stable', narrative: 'Calm',
        ...(artwork.image ? { firstFrameImage: artwork.image } : {}) });
      if (!current()) return;
      setStep('starting travel');
      const credentials = await apiRef.current.model.requestCredentials();
      if (!current()) return;
      if (credentials.mock) throw new Error('The provider returned mock credentials; no live world is available.');
      credentialsRef.current = credentials;
      travelStarted.current = Date.now();
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => { void stopRef.current('expired'); }, 180000);
      mediaTimeout.current = setTimeout(() => {
        setMessage('Media did not start within 60 seconds. The world is being stopped.');
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
      setSent({ key, text }); setInstructionState(`Provider accepted β ${key} · awaiting timeline`);
    }, error => { setInstructionState('Direction failed'); setMessage(safeError(error)); });
    queue.current.push(worldDirection(latest.current));
  }, [api.phase, api.travelState?.status, api.travelState?.encrypted_travel_id]);
  useEffect(() => {
    if (credentialsRef.current && ['failed', 'completed'].includes(api.travelState?.status ?? ''))
      void stopRef.current(api.travelState!.status);
  }, [api.travelState?.status]);

  // Local physics never waits. Send a settled artistic regime after 450 ms.
  const direction = worldDirection(snapshot);
  useEffect(() => {
    const timer = setTimeout(() => queue.current?.push(direction), 450);
    return () => clearTimeout(timer);
  }, [direction.key, direction.text]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!session.current) return;
      setRemaining(Math.max(0, Math.ceil(180 - (Date.now() - travelStarted.current) / 1000)));
      if (token.current?.expiry() && Date.now() >= (token.current.expiry()! - 10) * 1000) void stopRef.current('expired');
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const scheduled = sent && api.travelState?.user_instructions.find(item => item.instruction === sent.text);
  const active = !['idle', 'stopped', 'failed', 'expired', 'completed'].includes(step);
  return <section className="world-panel" aria-label="Reactor generated world">
    <div className="world-heading"><div><span className="eyebrow">02 / GENERATED WORLD</span><h2>The same journey. Imagined.</h2></div>
      <span className={`world-status ${playing ? 'live' : ''}`} data-testid="world-status">{playing ? 'VIDEO PLAYING' : step.toUpperCase()}</span></div>
    <div className="world-screen">
      <video key={videoEpoch} ref={video} poster={artwork.url || undefined} autoPlay muted playsInline aria-label="Live HappyOyster world video" />
      {!playing && <div className="world-placeholder"><div className="window-symbol" aria-hidden="true">✦</div>
        <h3>{active ? 'Opening a window to the world…' : 'One cockpit. An evolving sky.'}</h3>
        <p>{active ? `${api.phase} · world ${api.worldState?.phase ?? 'not created'}` : 'Start a live Reactor world, then change speed to direct its artistic impression.'}</p>
        {playBlocked && <button onClick={() => { void media.current?.play(); }}>Play video</button>}
        {!active && <span>{artwork.image ? 'RUNWARE STARTING FRAME · HAPPYOYSTER DIRECTING' : 'HAPPYOYSTER · DIRECTING MODE'}</span>}</div>}
      {playing && <span className="world-countdown">{remaining}s remaining</span>}
    </div>
    <p className="ai-label">AI-generated illustration — not an exact relativistic optical rendering.</p>
    <div className="artwork-status" role="status"><span>{artwork.message}</span>
      {artwork.canGenerate && <button disabled={active || artwork.busy} onClick={() => { void artwork.generate(); }}>
        {artwork.busy ? 'Generating…' : 'Generate starting frame'}</button>}</div>
    <div className="world-controls"><button className="start-world" onClick={() => { if (needsReload) window.location.reload(); else void start(); }} disabled={active}>✦ {needsReload ? 'Reload page' : step === 'idle' ? 'Start world' : 'Restart world'}</button>
      <button onClick={() => { void stop(); }} disabled={!active}>Stop world</button><span>ONE WORLD · 3 MIN MAX</span></div>
    <div className="direction-status" role="status">{scheduled ? `Provider timeline: ${scheduled.status ?? 'scheduled'} · β ${sent!.key}` : instructionState}</div>
    {message && <p className="provider-error" role="alert">{message} Local science remains available.</p>}
    <details className="world-diagnostics"><summary>Connection details</summary><p>Reactor: {api.phase} · Last connected world snapshot: {api.worldState?.phase ?? 'none'} · Travel: {stopConfirmed ? 'completed (end confirmed)' : api.travelState?.status ?? 'none'}</p>
      <p>{stopConfirmed ? 'Provider confirmed travel ended.' : 'No travel-end confirmation for this connection.'}</p>
      {blockedOrigins.length > 0 && <p>Blocked network origins: {blockedOrigins.join(', ')}</p>}
      <p>Instruction acceptance describes provider scheduling, not exact imagery or instantaneous synchronisation. Display colour is illustrative.</p>
      {sent && <p>{sent.text}</p>}</details>
  </section>;
}

export function ReactorPanel({ snapshot }: { snapshot: Snapshot }) {
  return <HappyOysterProvider mode="directing" autoConnect={false} logLevel="off">
    <World snapshot={snapshot} />
  </HappyOysterProvider>;
}
