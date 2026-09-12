import { finite } from '../physics/relativity';

/** A visibility discontinuity starts a new clock interval, never a catch-up frame. */
export class FrameClock {
  private previous: number | null = null;
  suspend() { this.previous = null; }
  elapsed(nowMs: number, visible: boolean): number {
    finite(nowMs);
    if (!visible) { this.suspend(); return 0; }
    const dt = this.previous === null ? 0 : Math.max(0, (nowMs - this.previous) / 1000);
    this.previous = nowMs;
    return dt;
  }
}
