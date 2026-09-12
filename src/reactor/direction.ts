import type { Snapshot } from '../controls/simulation';

export const WORLD_PROMPT = 'Fixed first-person view from an elegant dark spacecraft cockpit, looking through a broad curved window into a detailed deep starfield. A warm brass window rim and two quiet side consoles remain fixed in frame. Calm cinematic lighting, crisp stars, no people, no text, no numbers, no labels, no cuts. Preserve this cockpit, framing and starfield identity throughout.';

export function worldDirection(state: Pick<Snapshot, 'beta' | 'gamma' | 'approach' | 'recede'>) {
  // These ratios already come from the authoritative physics snapshot.
  const impression = state.gamma < 1.01 ? 'calm, widely distributed stars and very gentle apparent motion' :
    state.approach < 3 ? 'moderate forward concentration of stars and a restrained cool tint ahead' :
    state.approach < 7 ? 'pronounced forward concentration, a cooler starfield ahead and warmer peripheral light' :
    'a strongly concentrated forward starfield, subtle cool light ahead and deep warm peripheral light';
  return { key: state.beta.toFixed(3), text: `Keep exactly the same cockpit, window rim, consoles and fixed forward camera. Show an artistic impression of ${impression}. Preserve scene identity and a steady shot. No numerical overlays, diagrams, labels or camera cuts.` };
}

/** One in flight; replacing the pending item never queues obsolete slider values. */
export class LatestInstruction {
  private pending: ReturnType<typeof worldDirection> | null = null;
  private active = false;
  private closed = false;
  private last = '';
  constructor(private send: (text: string) => Promise<void>,
    private done: (key: string, text: string) => void, private failed: (error: unknown) => void) {}
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
        await this.send(next.text);
        if (!this.closed) { this.last = next.text; this.done(next.key, next.text); }
      }
    } catch (error) { this.pending = null; if (!this.closed) this.failed(error); }
    finally { this.active = false; }
  }
}
