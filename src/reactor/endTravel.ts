import type { TravelCredentialsMessage } from '@reactor-models/happy-oyster';

/** Bound local cleanup waits; timeout is not a remote-stop acknowledgement. */
export async function finishWithin(operation: Promise<unknown>, milliseconds = 5000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Cleanup is still pending.')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

/** Documented temporary-key runtime endpoint; independent of a hung RTC join. */
export async function endRemoteTravel(credentials: TravelCredentialsMessage, id: string) {
  const endpoint = new URL(credentials.api_base_url);
  if (endpoint.protocol !== 'https:') throw new Error('Refusing an unencrypted world endpoint.');
  const response = await fetch(`${endpoint.href.replace(/\/$/, '')}/openapi/v1/travels/end`, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${credentials.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedTravelId: id }),
  });
  if (!response.ok) throw new Error(`World stop returned HTTP ${response.status}.`);
  const result = await response.json();
  if (result.output?.code !== 0 || result.output?.data?.status !== 'completed')
    throw new Error('The provider has not confirmed a completed travel.');
}

/** The bundled SDK discards the acceptance bit; this documented call retains it. */
export async function sendRemoteInstruction(credentials: TravelCredentialsMessage, id: string, content: string) {
  const endpoint = new URL(credentials.api_base_url);
  if (endpoint.protocol !== 'https:') throw new Error('Refusing an unencrypted world endpoint.');
  const response = await fetch(`${endpoint.href.replace(/\/$/, '')}/openapi/v1/travels/instruct`, {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${credentials.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedTravelId: id, content }),
  });
  if (!response.ok) throw new Error(`World direction returned HTTP ${response.status}.`);
  const result = await response.json();
  if (result.output?.code !== 0 || result.output?.data?.accepted !== true)
    throw new Error('The provider did not accept this direction.');
}
