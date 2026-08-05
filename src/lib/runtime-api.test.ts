import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PortalApiError,
  apiUrl,
  createRuntimeApi,
  getXsrfToken,
  hasSessionHint,
  notaryDocumentUrl,
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

  it('uses a local session hint without contacting the backend', () => {
    const getItem = vi.fn().mockReturnValue('1');
    vi.stubGlobal('window', { localStorage: { getItem } });

    expect(hasSessionHint()).toBe(true);
    expect(getItem).toHaveBeenCalledWith('awan-auth-session');
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

  it('sends only the tracking code and returns a successful order response', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: {
      tracking_code: 'AK-2026-TEST', title: 'Pendirian PT', status: 'in_progress',
    } }), { status: 200 }));
    const api = createRuntimeApi({ fetchImpl });

    await expect(api.lookupTracking('AK-2026-TEST', 'id')).resolves.toMatchObject({
      tracking_code: 'AK-2026-TEST',
    });
    expect(fetchImpl.mock.calls[0][1]?.body).toBe(JSON.stringify({ code: 'AK-2026-TEST' }));
  });

  it('keeps rate limits distinct from empty results', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Slow down' }), { status: 429 }));
    const result = createRuntimeApi({ fetchImpl }).lookupTracking('AK-2026-TEST', 'id');

    await expect(result).rejects.toSatisfy((error: unknown) => (
      error instanceof PortalApiError && error.status === 429 && error.code === 'SERVER_ERROR'
    ));
  });

  it('treats an unauthenticated /auth/me response as a guest session', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      authenticated: false,
      user: null,
    }), { status: 200 }));

    await expect(createRuntimeApi({ fetchImpl }).currentUser()).resolves.toBeNull();
  });

  it('builds encoded public tracking document URLs without customer credentials', () => {
    expect(trackingDocumentUrl('AK-2026 TEST', 7, '/__cms')).toBe(
      '/__cms/api/tracking/documents/AK-2026%20TEST/7/download',
    );
  });

  it('reads notary orders without changing their access-scoped payload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      orders: [{ id: 9, tracking_code: 'AK-NOTARY-9', title: 'Akta PT', status: 'pending', progress: 0 }],
    }), { status: 200 }));

    await expect(createRuntimeApi({ fetchImpl }).notaryOrders()).resolves.toEqual([
      expect.objectContaining({ id: 9, tracking_code: 'AK-NOTARY-9' }),
    ]);
  });

  it('initializes CSRF and sends the exact notary stage mutation payload', async () => {
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=notary-token' });
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }));

    await createRuntimeApi({ origin: 'https://cms.example.test', fetchImpl })
      .completeNotaryStage('AK/NOTARY 9', 42);

    expect(fetchImpl.mock.calls[1][0]).toBe('https://cms.example.test/api/portal/mitra/orders/AK%2FNOTARY%209/complete');
    const options = fetchImpl.mock.calls[1][1];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ stage_id: 42 }));
    expect((options.headers as Headers).get('X-XSRF-TOKEN')).toBe('notary-token');
  });

  it('supports clearing an order assignment with a null staff id', async () => {
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=notary-token' });
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ assigned_staff_name: null }), { status: 200 }));

    await expect(createRuntimeApi({ fetchImpl }).assignNotaryOrder('AK-9', null)).resolves.toBeNull();
    expect(fetchImpl.mock.calls[1][1].body).toBe(JSON.stringify({ staff_id: null }));
  });

  it('reads and toggles notary staff through authenticated endpoints', async () => {
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=notary-token' });
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ staff: [{ id: 3, name: 'Staf', email: 'staff@example.test', is_active: true }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ is_active: false }), { status: 200 }));
    const api = createRuntimeApi({ fetchImpl });

    await expect(api.notaryStaff()).resolves.toEqual([expect.objectContaining({ id: 3, is_active: true })]);
    await expect(api.toggleNotaryStaff(3)).resolves.toBe(false);
    expect(fetchImpl.mock.calls[2][0]).toContain('/api/portal/mitra/staff/3/toggle-status');
  });

  it('builds authenticated notary document URLs', () => {
    expect(notaryDocumentUrl(21, 'https://cms.example.test')).toBe(
      'https://cms.example.test/api/portal/mitra/documents/21/download',
    );
  });
});
