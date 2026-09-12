import { useEffect, useRef, useState } from 'react';

type ArtworkStatus = { hosting?: string; model?: string; failure?: { http_status: number; errors: { code?: string; parameter?: string; message?: string }[] } | null; ready: boolean; can_generate: boolean; configured: boolean; attempted: boolean; cost_usd: number | null };
const headers = { 'X-Relativity-Client': '1' };
export function useRunwareArtwork() {
  const [status, setStatus] = useState<ArtworkStatus | null>(null);
  const [image, setImage] = useState<Blob | null>(null), [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('Checking starting artwork…');
  const mounted = useRef(false);
  const refresh = async () => {
    const response = await fetch('/api/runware/status', { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Artwork service unavailable; local scene is ready.');
    const data = await response.json() as ArtworkStatus;
    if (!mounted.current) return;
    setStatus(data);
    if (data.ready) {
      const frame = await fetch('/api/runware/frame', { headers, signal: AbortSignal.timeout(15000) });
      if (!frame.ok) throw new Error('Cached artwork could not load; local scene is ready.');
      const blob = await frame.blob();
      if (blob.type !== 'image/png' || blob.size > 2_000_000) throw new Error('Starting frame has an unsupported format.');
      const decoded = await createImageBitmap(blob);
      const valid = decoded.width === 1024 && decoded.height === 576;
      decoded.close();
      if (!valid) throw new Error('Starting frame has unsupported dimensions.');
      if (!mounted.current) return;
      setImage(blob);
      setMessage('Runware artwork: cached real output.');
    } else setMessage(!data.configured ? 'Runware artwork: BLOCKED — server key missing.' :
      data.can_generate ? 'Runware artwork: ready — one image allowed.' :
      data.attempted ? `Runware artwork: BLOCKED — ${data.failure ? `HTTP ${data.failure.http_status}. ${data.failure.errors[0]?.message ?? data.failure.errors[0]?.code ?? 'Request rejected.'}` : 'allowance used; check generation status.'}` : 'Runware artwork: BLOCKED — generation approval needed.');
  };
  useEffect(() => {
    mounted.current = true;
    void refresh().catch(error => { if (mounted.current) setMessage(error.message); });
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!image) return;
    const next = URL.createObjectURL(image); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [image]);
  const generate = async () => {
    if (busy || !status?.can_generate) return;
    setBusy(true); setMessage('Runware is generating the starting frame…');
    try {
      const response = await fetch('/api/runware/frame', { method: 'POST', headers, signal: AbortSignal.timeout(130000) });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Artwork generation failed.');
      }
      await refresh();
    } catch (error) {
      if (mounted.current) { setMessage(error instanceof Error ? error.message : 'Artwork generation failed.'); setStatus(null); }
    } finally { if (mounted.current) setBusy(false); }
  };
  return { image, url, message, busy, status, canGenerate: !!status?.can_generate, generate };
}
