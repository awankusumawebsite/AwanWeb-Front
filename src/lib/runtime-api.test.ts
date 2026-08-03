import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PortalApiError,
  apiUrl,
  createRuntimeApi,
  getXsrfToken,
  safeLocalRedirect,
  trackingDocumentUrl,
} from './runtime-api';

afterEach(() => vi.unstubAllGlobals());

describe('runtime API', () => {
  it('normalizes backend and API URLs', () => {
    expect(apiUrl('/auth/me', 'https://cms.example.test/api/')).toBe('https://cms.example.test/api/auth/me');
  });

  it('allows only same-site relative redirects', () => {
    expect(safeLocalRedirect('/mitra?tab=orders', '/lacak')).toBe('/mitra?tab=orders');
    expect(safeLocalRedirect('//evil.example', '/lacak')).toBe('/lacak');
    expect(safeLocalRedirect('https://evil.example', '/lacak')).toBe('/lacak');
  });

  it('reads a URL-encoded XSRF token', () => {
    expect(getXsrfToken('other=1; XSRF-TOKEN=abc%3D123; theme=dark')).toBe('abc=123');
  });

  it('performs CSRF initialization before login', async () => {
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=test-token' });
    vi.stubGlobal('window', { localStorage: { setItem: vi.fn(), removeItem: vi.fn() } });
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        user: { id: 1, name: 'Client', email: 'client@example.test', role: 'customer', is_active: true },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const user = await createRuntimeApi({ origin: 'https://cms.example.test', fetchImpl }).login('client@example.test', 'secret');

    expect(user.role).toBe('customer');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://cms.example.test/sanctum/csrf-cookie');
    expect(fetchImpl.mock.calls[1][0]).toBe('https://cms.example.test/api/auth/login');
    expect(fetchImpl.mock.calls[1][1].headers['X-XSRF-TOKEN']).toBe('test-token');
  });

  it('maps login network failures without pretending credentials are invalid', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const result = createRuntimeApi({ fetchImpl }).login('client@example.test', 'secret');

    await expect(result).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('handles tracking verification and successful order responses', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ requires_verification: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {
        tracking_code: 'AK-2026-TEST', title: 'Pendirian PT', status: 'in_progress',
      } }), { status: 200 }));
    const api = createRuntimeApi({ fetchImpl });

    await expect(api.lookupTracking('AK-2026-TEST', 'id')).resolves.toEqual({
      requiresVerification: true,
      order: null,
    });
    await expect(api.lookupTracking('AK-2026-TEST', 'id', '1234')).resolves.toMatchObject({
      requiresVerification: false,
      order: { tracking_code: 'AK-2026-TEST' },
    });
  });

  it('keeps rate limits distinct from empty results', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Slow down' }), { status: 429 }));
    const result = createRuntimeApi({ fetchImpl }).lookupTracking('AK-2026-TEST', 'id');

    await expect(result).rejects.toSatisfy((error: unknown) => (
      error instanceof PortalApiError && error.status === 429 && error.code === 'SERVER_ERROR'
    ));
  });

  it('builds encoded document URLs with optional phone verification', () => {
    expect(trackingDocumentUrl('AK-2026 TEST', 7, '1234', 'https://cms.example.test')).toBe(
      'https://cms.example.test/api/tracking/documents/AK-2026%20TEST/7/download?phone_last4=1234',
    );
  });
});
