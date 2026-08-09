import { describe, expect, it, vi } from 'vitest';

import { CmsApiError, createCmsClient } from './cms';

describe('static CMS client', () => {
  it('normalizes the API base and parses JSON', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ data: ['ok'] }));
    const client = createCmsClient({
      baseUrl: 'https://cms.example.test/api/',
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(client.request('/services?locale=id')).resolves.toEqual({ data: ['ok'] });
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL('https://cms.example.test/api/services?locale=id'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Origin: 'https://awankusuma.com',
          Referer: 'https://awankusuma.com/',
          'User-Agent': expect.stringContaining('Mozilla/5.0'),
        }),
      }),
    );
  });

  it('returns null only for explicitly allowed 404 responses', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    const client = createCmsClient({ fetchImpl: fetchImpl as typeof fetch });

    await expect(client.request('/services/missing', { allowNotFound: true }))
      .resolves.toBeNull();
  });

  it('does not turn server errors into empty content', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 508 }));
    const client = createCmsClient({ fetchImpl: fetchImpl as typeof fetch });

    await expect(client.request('/services', { retryCount: 0 })).rejects.toMatchObject({
      name: 'CmsApiError',
      status: 508,
      code: 'ORIGIN_CAPACITY',
    });
  });

  it('retries bounded transient failures and then succeeds', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ data: ['recovered'] }));
    const client = createCmsClient({ fetchImpl: fetchImpl as typeof fetch });

    await expect(client.request('/services', { retryCount: 1 }))
      .resolves.toEqual({ data: ['recovered'] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('uses a typed error for invalid JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response('not-json'));
    const client = createCmsClient({ fetchImpl: fetchImpl as typeof fetch });

    await expect(client.request('/services')).rejects.toBeInstanceOf(CmsApiError);
  });

  it('deduplicates identical GET requests during one static build', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ data: ['shared'] }));
    const client = createCmsClient({ fetchImpl: fetchImpl as typeof fetch });

    const [first, second] = await Promise.all([
      client.requestOnce('/services?locale=id'),
      client.requestOnce('/services?locale=id'),
    ]);

    expect(first).toEqual({ data: ['shared'] });
    expect(second).toEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('evicts failed build requests so a later attempt can recover', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ data: ['recovered'] }));
    const client = createCmsClient({ fetchImpl: fetchImpl as typeof fetch });

    await expect(client.requestOnce('/services', { retryCount: 0 }))
      .rejects.toMatchObject({ status: 503 });
    await expect(client.requestOnce('/services', { retryCount: 0 }))
      .resolves.toEqual({ data: ['recovered'] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('paces request starts to avoid tripping shared-hosting bot protection', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const starts: number[] = [];
    const fetchImpl = vi.fn(async () => {
      starts.push(Date.now());
      return Response.json({ data: ['ok'] });
    });
    const client = createCmsClient({
      fetchImpl: fetchImpl as typeof fetch,
      maxConcurrentRequests: 1,
      minRequestIntervalMs: 750,
    });

    const requests = [
      client.request('/services/1'),
      client.request('/services/2'),
      client.request('/services/3'),
    ];
    await vi.runAllTimersAsync();
    await expect(Promise.all(requests)).resolves.toHaveLength(3);

    expect(starts).toEqual([0, 750, 1_500]);
    vi.useRealTimers();
  });
});
