type MediaEvents = {
  playing: (value: boolean) => void;
  blocked: (value: boolean) => void;
  failed: (message: string) => void;
  ended: () => void;
};

/** Observe decoded, advancing frames; a poster or `playing` event is insufficient. */
export function watchWorldVideo(video: HTMLVideoElement, events: MediaEvents) {
  let disposed = false, confirmed = false, firstFrame = false;
  let previousTime = -1, previousFrames = -1;
  let frameHandle: number | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  let stall: ReturnType<typeof setTimeout> | undefined;
  const listeners: [string, EventListener][] = [];
  const listen = (name: string, listener: EventListener) => {
    video.addEventListener(name, listener); listeners.push([name, listener]);
  };
  const dispose = () => {
    disposed = true;
    clearTimeout(stall); clearInterval(poll);
    if (frameHandle !== undefined) video.cancelVideoFrameCallback(frameHandle);
    listeners.forEach(([name, listener]) => video.removeEventListener(name, listener));
  };
  const fail = (message: string) => {
    if (disposed) return;
    dispose(); events.playing(false); events.failed(message);
  };
  const play = async () => {
    // An empty element has no playback to recover and may leave play() pending.
    if (disposed || video.readyState < 1 || !(video.srcObject || video.currentSrc)) return;
    video.muted = true;
    try { await video.play(); if (!disposed) events.blocked(false); }
    catch (error) {
      if (disposed) return;
      if (error instanceof Error && error.name === 'NotAllowedError') events.blocked(true);
      else fail('World video playback failed. The world is being stopped.');
    }
  };
  const frame = (time: number, count: number) => {
    if (disposed || count <= 0 || video.paused || video.ended || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    const advancing = firstFrame && time > previousTime && count > previousFrames;
    firstFrame = true; previousTime = time; previousFrames = count;
    if (!advancing) return;
    if (!confirmed) { confirmed = true; events.blocked(false); events.playing(true); }
    clearTimeout(stall);
    stall = setTimeout(() => fail('World video stopped advancing for 10 seconds. The world is being stopped.'), 10000);
  };
  if (typeof video.requestVideoFrameCallback === 'function') {
    const next: VideoFrameRequestCallback = (_now, metadata) => {
      if (disposed) return;
      frame(metadata.mediaTime, metadata.presentedFrames);
      if (!disposed) frameHandle = video.requestVideoFrameCallback(next);
    };
    frameHandle = video.requestVideoFrameCallback(next);
  } else {
    // Older browsers can still report decoded frame counts; time alone is not evidence.
    poll = setInterval(() => frame(video.currentTime, video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0), 200);
  }
  listen('loadedmetadata', () => { void play(); });
  listen('volumechange', () => { if (!video.muted) video.muted = true; });
  const waiting = () => { if (confirmed) { confirmed = false; events.playing(false); } };
  listen('waiting', waiting); listen('stalled', waiting);
  listen('error', () => fail('World video could not be decoded. The world is being stopped.'));
  listen('ended', () => { dispose(); events.playing(false); events.ended(); });
  video.muted = true;
  void play();
  return { play, dispose };
}
