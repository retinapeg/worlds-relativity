import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchWorldVideo } from '../src/reactor/media';

class Video extends EventTarget {
  muted = false; paused = false; ended = false;
  readyState = 2; videoWidth = 640; videoHeight = 360;
  srcObject: object | null = {}; currentSrc = ''; currentTime = 0;
  frames = 0; nextId = 0;
  callbacks = new Map<number, VideoFrameRequestCallback>();
  play = vi.fn(async () => {});
  requestVideoFrameCallback = (callback: VideoFrameRequestCallback) => {
    this.callbacks.set(++this.nextId, callback); return this.nextId;
  };
  cancelVideoFrameCallback = (id: number) => { this.callbacks.delete(id); };
  getVideoPlaybackQuality = () => ({ totalVideoFrames: this.frames });
  emitFrame(time: number, frames: number) {
    this.currentTime = time; this.frames = frames;
    const callbacks = [...this.callbacks.values()]; this.callbacks.clear();
    callbacks.forEach(callback => callback(0, { mediaTime: time, presentedFrames: frames } as VideoFrameCallbackMetadata));
  }
  emit(name: string) { this.dispatchEvent(new Event(name)); }
}
function observe(video = new Video()) {
  vi.useFakeTimers();
  const events = { playing: vi.fn(), blocked: vi.fn(), failed: vi.fn(), ended: vi.fn() };
  return { video, events, monitor: watchWorldVideo(video as unknown as HTMLVideoElement, events) };
}
afterEach(() => { vi.useRealTimers(); });

describe('Reactor native video monitor', () => {
  it('requires two advancing decoded frames, never a playing event or a repeated frame', () => {
    const { video, events, monitor } = observe();
    video.emit('playing');
    video.emitFrame(0, 1); video.emitFrame(0, 1);
    expect(events.playing).not.toHaveBeenCalled();
    video.emitFrame(0.1, 2);
    expect(events.playing).toHaveBeenCalledExactlyOnceWith(true);
    monitor.dispose();
  });
  it('does not treat audio-only, paused or dimensionless media as video', () => {
    const { video, events, monitor } = observe();
    video.videoWidth = 0;
    video.emitFrame(1, 1); video.emitFrame(2, 2);
    video.videoWidth = 640; video.paused = true;
    video.emitFrame(3, 3); video.emitFrame(4, 4);
    expect(events.playing).not.toHaveBeenCalled();
    monitor.dispose();
  });
  it('keeps media muted and offers gesture recovery without replacing the session', async () => {
    const video = new Video();
    video.play.mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    const { events, monitor } = observe(video);
    await vi.advanceTimersByTimeAsync(0);
    expect(events.blocked).toHaveBeenLastCalledWith(true);
    video.muted = false; video.emit('volumechange'); expect(video.muted).toBe(true);
    await monitor.play();
    expect(events.blocked).toHaveBeenLastCalledWith(false);
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(events.failed).not.toHaveBeenCalled();
    monitor.dispose();
  });
  it('does not call play on an empty element', async () => {
    const video = new Video(); video.srcObject = null; video.readyState = 0;
    const { monitor } = observe(video);
    await monitor.play(); expect(video.play).not.toHaveBeenCalled();
    video.srcObject = {}; video.readyState = 2; video.emit('loadedmetadata');
    expect(video.play).toHaveBeenCalledOnce();
    monitor.dispose();
  });
  it.each(['error', 'play rejection'])('stops and reports %s once', async kind => {
    const video = new Video();
    if (kind === 'play rejection') video.play.mockRejectedValueOnce(new Error('Decode failed'));
    const { events } = observe(video);
    if (kind === 'error') { video.emit('error'); video.emit('error'); }
    await vi.advanceTimersByTimeAsync(0);
    expect(events.failed).toHaveBeenCalledOnce();
    expect(video.callbacks.size).toBe(0);
  });
  it.each(['waiting', 'stalled', 'silent freeze'])('bounds %s after confirmed playback', kind => {
    const { video, events } = observe();
    video.emitFrame(0, 1); video.emitFrame(0.1, 2);
    if (kind !== 'silent freeze') video.emit(kind);
    vi.advanceTimersByTime(9999); expect(events.failed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(events.failed).toHaveBeenCalledOnce();
    expect(events.playing).toHaveBeenLastCalledWith(false);
  });
  it('recovers from waiting and resets the stall deadline on advancing frames', () => {
    const { video, events, monitor } = observe();
    video.emitFrame(0, 1); video.emitFrame(0.1, 2); video.emit('waiting');
    expect(events.playing).toHaveBeenLastCalledWith(false);
    vi.advanceTimersByTime(9000); video.emitFrame(0.2, 3);
    expect(events.playing).toHaveBeenLastCalledWith(true);
    vi.advanceTimersByTime(9000); expect(events.failed).not.toHaveBeenCalled();
    monitor.dispose();
  });
  it('uses decoded frame counts when the frame callback API is absent', () => {
    const video = new Video();
    Object.defineProperty(video, 'requestVideoFrameCallback', { value: undefined });
    const { events, monitor } = observe(video);
    video.currentTime = 1; vi.advanceTimersByTime(200);
    video.currentTime = 2; vi.advanceTimersByTime(200);
    expect(events.playing).not.toHaveBeenCalled();
    video.frames = 2; video.currentTime = 3; vi.advanceTimersByTime(200);
    expect(events.playing).not.toHaveBeenCalled();
    video.frames = 3; video.currentTime = 4; vi.advanceTimersByTime(200);
    expect(events.playing).toHaveBeenCalledExactlyOnceWith(true);
    monitor.dispose(); expect(vi.getTimerCount()).toBe(0);
  });
  it('suppresses late frames, events and play rejection after disposal', async () => {
    let reject!: (reason: Error) => void;
    const video = new Video(); video.play.mockImplementationOnce(() => new Promise<void>((_, no) => { reject = no; }));
    const { events, monitor } = observe(video);
    const late = [...video.callbacks.values()][0];
    monitor.dispose();
    late(0, { mediaTime: 2, presentedFrames: 20 } as VideoFrameCallbackMetadata);
    video.emit('error'); video.emit('loadedmetadata'); reject(new Error('Late error'));
    await vi.advanceTimersByTimeAsync(20000);
    expect(events.failed).not.toHaveBeenCalled(); expect(events.playing).not.toHaveBeenCalled();
    expect(events.blocked).not.toHaveBeenCalled(); expect(video.callbacks.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reports ended once and cancels the remaining frame and stall callbacks', () => {
    const { video, events } = observe();
    video.emitFrame(0, 1); video.emitFrame(0.1, 2);
    video.emit('ended'); video.emit('ended');
    expect(events.ended).toHaveBeenCalledOnce();
    expect(events.playing).toHaveBeenLastCalledWith(false);
    expect(video.callbacks.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
});
