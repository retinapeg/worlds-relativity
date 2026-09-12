import { expect, it, vi } from 'vitest';
import { LatestInstruction, worldDirection } from '../src/reactor/direction';
import { ratios } from '../src/physics/relativity';
import { createTokenResolver } from '../src/reactor/token';
import { endRemoteTravel, finishWithin, sendRemoteInstruction } from '../src/reactor/endTravel';
import type { TravelCredentialsMessage } from '@reactor-models/happy-oyster';

it('releases the local stop UI even when SDK cleanup never settles', async () => {
  vi.useFakeTimers();
  try {
    const pending = finishWithin(new Promise(() => {}), 5000);
    const check = expect(pending).rejects.toThrow('pending');
    await vi.advanceTimersByTimeAsync(5000);
    await check;
    expect(vi.getTimerCount()).toBe(0);
    await expect(finishWithin(Promise.resolve())).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  } finally { vi.useRealTimers(); }
});

it('produces deterministic artistic instructions without numerical overlays', () => {
  const slow = worldDirection(ratios(0)), fast = worldDirection(ratios(.99));
  expect(slow).toEqual(worldDirection(ratios(0)));
  expect(fast.text).not.toBe(slow.text);
  expect(fast.text).toContain('same cockpit');
  expect(fast.text).toContain('No numerical overlays');
});
it('coalesces changing instructions and deduplicates an accepted artistic regime', async () => {
  let finish = () => {};
  const send = vi.fn((_text: string) => new Promise<void>(resolve => { finish = resolve; }));
  const done = vi.fn(), failed = vi.fn();
  const queue = new LatestInstruction(send, done, failed);
  queue.push(worldDirection(ratios(0)));
  queue.push(worldDirection(ratios(.6)));
  queue.push(worldDirection(ratios(.99)));
  expect(send).toHaveBeenCalledTimes(1);
  finish(); await Promise.resolve(); await Promise.resolve();
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[1][0]).toBe(worldDirection(ratios(.99)).text);
  finish(); await Promise.resolve(); await Promise.resolve();
  queue.push(worldDirection(ratios(.99)));
  expect(send).toHaveBeenCalledTimes(2);
  queue.close(); queue.push(worldDirection(ratios(0)));
  expect(send).toHaveBeenCalledTimes(2); expect(failed).not.toHaveBeenCalled();
});
it('reuses one JWT for repeated and concurrent SDK calls and refuses expiry', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ jwt: 'test-jwt', expires_at: Date.now() / 1000 + 900 })));
  vi.stubGlobal('fetch', fetcher);
  const token = createTokenResolver();
  expect(await Promise.all([token.resolve(), token.resolve()])).toEqual(['test-jwt', 'test-jwt']);
  expect(await token.resolve()).toBe('test-jwt');
  expect(fetcher).toHaveBeenCalledTimes(1);
  vi.spyOn(Date, 'now').mockReturnValue((token.expiry()! + 1) * 1000);
  await expect(token.resolve()).rejects.toThrow('expired');
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
it('requires explicit provider acceptance and terminal stop acknowledgement', async () => {
  const credentials = { api_base_url: 'https://example.maas.aliyuncs.com/api/v2/apps/happyoyster-1.0', token: 'temporary-test-token' } as TravelCredentialsMessage;
  const fetcher = vi.fn(async () => new Response(JSON.stringify({output:{code:0,data:{accepted:true,status:'completed'}}})));
  vi.stubGlobal('fetch', fetcher);
  await expect(sendRemoteInstruction(credentials,'test-travel','Keep the same cockpit')).resolves.toBeUndefined();
  await expect(endRemoteTravel(credentials,'test-travel')).resolves.toBeUndefined();
  fetcher.mockImplementation(async () => new Response(JSON.stringify({output:{code:0,data:{accepted:false,status:'running'}}})));
  await expect(sendRemoteInstruction(credentials,'test-travel','Keep the same cockpit')).rejects.toThrow('did not accept');
  await expect(endRemoteTravel(credentials,'test-travel')).rejects.toThrow('not confirmed');
  await expect(endRemoteTravel({...credentials,api_base_url:'http://example.com'},'test-travel')).rejects.toThrow('unencrypted');
  vi.unstubAllGlobals();
});
