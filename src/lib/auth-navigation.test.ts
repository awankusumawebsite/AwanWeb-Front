import { describe, expect, it, vi } from 'vitest';
import { authDestination, resolveAuthNavigation } from './auth-navigation';
import { PortalApiError, type AuthUser } from './runtime-api';

const user = (role: string): AuthUser => ({
  id: 1,
  name: 'Awan Kusuma',
  email: 'user@example.test',
  role,
  is_active: true,
});

describe('auth navigation', () => {
  it('does not call auth/me without a session hint', async () => {
    const currentUser = vi.fn(async () => user('customer'));
    await expect(resolveAuthNavigation(false, currentUser)).resolves.toEqual({ status: 'guest', user: null });
    expect(currentUser).not.toHaveBeenCalled();
  });

  it('keeps network errors distinct from an expired session', async () => {
    const unavailable = await resolveAuthNavigation(true, async () => {
      throw new PortalApiError({ code: 'NETWORK_ERROR', message: 'offline' });
    });
    const expired = await resolveAuthNavigation(true, async () => {
      throw new PortalApiError({ status: 401, code: 'SESSION_EXPIRED', message: 'expired' });
    });

    expect(unavailable.status).toBe('unavailable');
    expect(expired.status).toBe('guest');
  });

  it('maps roles to their authoritative destination', () => {
    expect(authDestination('super_admin')).toBe('admin');
    expect(authDestination('manager')).toBe('admin');
    expect(authDestination('notaris')).toBe('mitra');
    expect(authDestination('staff_notaris')).toBe('mitra');
    expect(authDestination('customer')).toBe('customer');
    expect(authDestination(null)).toBe('customer');
  });
});
