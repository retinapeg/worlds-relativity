import type { Snapshot } from '../controls/simulation';

export const WORLD_PROMPT = 'First-person spacecraft cockpit approaching a monumental illuminated orbital gate. Nearby station trusses and illuminated structures provide clear depth and forward motion against a detailed starfield. A warm brass window rim and two quiet side consoles remain fixed in frame. Continuous forward flight, one uninterrupted shot, stable cockpit dimensions. Calm cinematic lighting, no people, no text, no numbers, no labels, no cuts. Preserve this cockpit and orbital station identity throughout.';

type DirectionState = Pick<Snapshot, 'beta' | 'gamma' | 'approach' | 'recede'> &
  Partial<{ lookYaw: number; lookPitch: number; opticalBaseline: boolean;
    burstPhase: 'BRAKING' | 'ACCELERATING' | 'COASTING' | null }>;

export function worldDirection(state: DirectionState) {
  const yaw = Math.atan2(Math.sin(state.lookYaw ?? 0), Math.cos(state.lookYaw ?? 0));
  const horizontal = Math.abs(yaw) < Math.PI / 4 ? 'forward' : Math.abs(yaw) > 3 * Math.PI / 4 ? 'rear' :
    yaw > 0 ? 'side +Z' : 'side −Z';
  const pitch = state.lookPitch ?? 0;
  const view = `${pitch > Math.PI / 6 ? 'upward ' : pitch < -Math.PI / 6 ? 'downward ' : ''}${horizontal}`;
  const action = state.burstPhase === 'BRAKING' ? 'Brake' : state.burstPhase ? 'Burst' : 'Cruise';
  const flight = action === 'Burst' ? 'Accelerate through the illuminated orbital gate; nearby station trusses and structures sweep past. Continue the same uninterrupted forward flight.' :
    action === 'Brake' ? 'Settle smoothly into slower forward movement beyond the gate; nearby structures pass more slowly.' :
    'Cruise in a slow continuous approach toward the illuminated orbital gate, with visible nearby station structures establishing depth.';
  // These ratios already come from the authoritative physics snapshot.
  const impression = state.opticalBaseline ? 'the unshifted optical baseline, with the same starfield identity and a wide natural distribution; the local journey continues unchanged' :
    state.gamma < 1.01 ? 'calm, widely distributed stars and very gentle apparent motion' :
    state.approach < 3 ? 'moderate forward concentration of stars and a restrained cool tint ahead' :
    state.approach < 7 ? 'pronounced forward concentration, a cooler starfield ahead and warmer peripheral light' :
    state.gamma >= 20 ? 'an extremely concentrated forward starfield, with a narrow bright region ahead and sparse warm stars behind' :
    'a strongly concentrated forward starfield, subtle cool light ahead and deep warm peripheral light';
  const framing = state.opticalBaseline || state.gamma < 1.01 ? 'Preserve a widely distributed sky in this viewing direction.' :
    horizontal === 'rear' ? 'Look toward the rear of the journey; the forward concentration is behind the camera.' :
    horizontal.startsWith('side') ? 'Look sideways across the journey; the forward concentration is toward the edge of this view.' : 'Look forward along the journey.';
  return { key: `β ${state.beta.toFixed(3)} · ${view}${state.opticalBaseline ? ' · baseline' : ''}${action === 'Cruise' ? '' : ` · ${action}`}`, view, action,
    text: `Keep exactly the same cockpit, window rim, consoles, orbital station and starfield identity. ${flight} Show an artistic impression of ${impression}. Use a steady ${view} view. ${framing} Preserve the cockpit dimensions; change only the view and artistic sky impression. No numerical overlays, diagrams, labels or camera cuts.` };
}

/** One in flight; replacing the pending item never queues obsolete slider values. */
export class LatestInstruction {
  private pending: ReturnType<typeof worldDirection> | null = null;
  private active = false;
  private closed = false;
  private last = '';
  constructor(private send: (text: string) => Promise<void>,
    private done: (key: string, text: string) => void, private failed: (error: unknown) => void,
    private started?: (key: string, text: string) => void) {}
  push(next: ReturnType<typeof worldDirection>) {
    if (this.closed) return;
    this.pending = next;
    void this.drain();
  }
  close() { this.closed = true; this.pending = null; }
  private async drain() {
    if (this.active || this.closed) return;
    this.active = true;
    try {
      while (this.pending && !this.closed) {
        const next = this.pending; this.pending = null;
        if (next.text === this.last) continue;
        this.started?.(next.key, next.text);
        await this.send(next.text);
        if (!this.closed) { this.last = next.text; this.done(next.key, next.text); }
      }
    } catch (error) { this.pending = null; if (!this.closed) this.failed(error); }
    finally { this.active = false; }
  }
}
