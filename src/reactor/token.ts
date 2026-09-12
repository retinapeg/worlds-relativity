export type BrowserToken = { jwt: string; expires_at: number };
export function createTokenResolver() {
  const connection_id = crypto.randomUUID();
  let cached: BrowserToken | null = null;
  let pending: Promise<BrowserToken> | null = null;
  return {
    expiry: () => cached?.expires_at ?? null,
    resolve: async () => {
      if (cached) {
        if (Date.now() >= (cached.expires_at - 10) * 1000) throw new Error('Session token expired. Stop and explicitly restart the world.');
        return cached.jwt;
      }
      pending ??= fetch('/api/reactor/token', {
        method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Relativity-Client': '1' },
        body: JSON.stringify({ connection_id }), signal: AbortSignal.timeout(30000),
      }).then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'The token bridge is unavailable.');
        if (typeof data.jwt !== 'string' || !Number.isFinite(data.expires_at)) throw new Error('Invalid token response.');
        return data as BrowserToken;
      });
      try { cached = await pending; return cached.jwt; }
      finally { pending = null; }
    },
  };
}
