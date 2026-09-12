import { useSyncExternalStore, type ReactNode } from 'react';

// This module is reachable only through the isolated test server's exact aliases.
// The real ReactorPanel runs unchanged; no provider SDK, key or allocation is used.
type Scenario = 'frames' | 'poster-only' | 'play-rejection' | 'connect-failure' |
  'create-failure' | 'factory-failure' | 'pending-factory' | 'disconnect-pending' |
  'pending-connect' | 'pending-create';
type TravelState = { status: string; encrypted_travel_id: string; user_instructions: { instruction: string; status: string }[] };
let state: { phase: string; worldState: { phase: string } | null; travelState: TravelState | null } =
  { phase: 'idle', worldState: null, travelState: null };
const listeners = new Set<() => void>();
const update = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(callback => callback()); };
const calls = { connect: 0, createWorld: 0, attachWorld: 0, credentials: 0, startTravel: 0, disconnect: 0, end: 0, destroy: 0, play: 0 };
let scenario: Scenario = 'frames';
let boundVideo: HTMLVideoElement | null = null;
let originalPlay: (() => Promise<void>) | null = null;
let lateResolve: (() => void) | null = null;
let setupResolve: (() => void) | null = null;
let drawTimer: ReturnType<typeof setInterval> | undefined;
const streams: MediaStream[] = [];
const statusCallbacks: ((value: string) => void)[] = [];
const errorCallbacks: ((error: Error) => void)[] = [];

const freeze = () => { clearInterval(drawTimer); drawTimer = undefined; };
const cleanup = () => { freeze(); streams.forEach(stream => stream.getTracks().forEach(track => track.stop())); };
function attachFrames(video: HTMLVideoElement) {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
  const context = canvas.getContext('2d')!;
  let frame = 0;
  const draw = () => {
    frame++;
    context.fillStyle = `hsl(${frame * 3 % 360} 70% 25%)`; context.fillRect(0, 0, 640, 360);
    context.fillStyle = 'white'; context.fillRect(frame * 8 % 580, 100, 60, 60);
    context.font = '24px sans-serif'; context.fillText(`LOCAL SYNTHETIC FRAME ${frame}`, 30, 300);
  };
  draw(); drawTimer = setInterval(draw, 40);
  const stream = canvas.captureStream(25); streams.push(stream);
  video.srcObject = stream;
}
function makeSession(video: HTMLVideoElement) {
  if (scenario === 'poster-only') {
    video.poster = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="darkblue"/></svg>';
    video.dispatchEvent(new Event('playing')); // Deliberate false positive stimulus.
  } else {
    originalPlay = video.play.bind(video);
    video.play = () => { calls.play++; return scenario === 'play-rejection' ? Promise.reject(new DOMException('Fixture autoplay blocked', 'NotAllowedError')) : originalPlay!(); };
    if (scenario === 'play-rejection') video.autoplay = false;
    video.muted = false; // Mimic the SDK; the application must enforce silent playback.
    attachFrames(video);
  }
  return { travel: {
    end: async () => { calls.end++; cleanup(); },
    on: (_name: string, callback: (value: string) => void) => {
      statusCallbacks.push(callback); return () => {}; // Retain callbacks to probe stale SDK delivery.
    },
    onError: (callback: (error: Error) => void) => { errorCallbacks.push(callback); return () => {}; },
  }, engine: {}, result: {} };
}

export async function startTravel({ videoElement }: { videoElement: HTMLVideoElement }) {
  calls.startTravel++; boundVideo = videoElement;
  if (scenario === 'factory-failure') throw new Error('Fixture travel setup failed');
  update({ travelState: { status: 'running', encrypted_travel_id: 'fixture-travel', user_instructions: [] } });
  if (scenario === 'pending-factory') return new Promise<ReturnType<typeof makeSession>>(resolve => {
    lateResolve = () => { lateResolve = null; resolve(makeSession(videoElement)); };
  });
  return makeSession(videoElement);
}
const connect = async (_token: unknown) => {
  calls.connect++;
  if (scenario === 'connect-failure') throw new Error('Fixture connection failed');
  if (scenario === 'pending-connect') await new Promise<void>(resolve => { setupResolve = resolve; });
  update({ phase: 'connected' });
};
const createWorld = async (_options: unknown) => {
  calls.createWorld++;
  if (scenario === 'create-failure') throw new Error('Fixture world setup failed');
  if (scenario === 'pending-create') await new Promise<void>(resolve => { setupResolve = resolve; });
  const world = { phase: 'ready', encrypted_world_id: 'fixture-world', mode: 2 };
  update({ worldState: world });
  return world;
};
const attachWorld = async (_id: string) => {
  calls.attachWorld++;
  const world = { phase: 'ready', encrypted_world_id: 'fixture-world', mode: 2 };
  update({ worldState: world });
  return world;
};
const disconnect = async () => {
  calls.disconnect++;
  if (scenario === 'disconnect-pending') await new Promise(() => {});
  update({ phase: 'idle' });
};
const model = { requestCredentials: async () => {
  calls.credentials++;
  return { api_base_url: 'https://fixture.invalid', token: 'fixture-only-token', ticket: 'fixture-ticket', mock: false };
} };
export function useHappyOyster() {
  const snapshot = useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => state);
  return { ...snapshot, connect, createWorld, attachWorld, disconnect, model };
}
export function HappyOysterProvider({ children }: { children: ReactNode }) { return children; }
export const AliRtcEngine = { getInstance: () => ({ destroy: async () => { calls.destroy++; cleanup(); } }) };

export const fixture = {
  calls,
  setScenario: (value: Scenario) => { scenario = value; },
  setBeta: (_value: number) => {},
  setView: (_yaw: number) => {},
  setBaseline: (_value: boolean) => {},
  unmount: () => {},
  freeze,
  nativeError: () => boundVideo?.dispatchEvent(new Event('error')),
  allowPlay: () => { scenario = 'frames'; },
  resolveTravel: () => lateResolve?.(),
  resolveSetup: () => { const resolve = setupResolve; setupResolve = null; resolve?.(); },
  emitLateStatus: (value: string) => statusCallbacks.forEach(callback => callback(value)),
  emitLateError: () => errorCallbacks.forEach(callback => callback(new Error('Fixture stale error'))),
  acceptInstruction: (instruction: string) => {
    if (state.travelState) update({ travelState: { ...state.travelState, user_instructions: [{ instruction, status: 'EXECUTED' }] } });
  },
  getVideoState: () => ({
    attached: Boolean(boundVideo?.srcObject), muted: boundVideo?.muted, paused: boundVideo?.paused,
    width: boundVideo?.videoWidth, height: boundVideo?.videoHeight,
    frames: boundVideo?.getVideoPlaybackQuality().totalVideoFrames ?? 0,
    trackStates: streams.flatMap(stream => stream.getTracks().map(track => track.readyState)),
  }),
};
declare global { interface Window { __reactorFixture: typeof fixture } }
window.__reactorFixture = fixture;
