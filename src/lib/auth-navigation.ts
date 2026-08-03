import type { AuthUser } from './runtime-api';
import { PortalApiError } from './runtime-api';

export type AuthNavigationState =
  | { status: 'guest'; user: null }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unavailable'; user: null };

export type AuthDestination = 'admin' | 'mitra' | 'customer';

export function authDestination(role: string | null | undefined): AuthDestination {
  if (role === 'super_admin' || role === 'manager' || role === 'admin') return 'admin';
  if (role === 'notaris' || role === 'staff_notaris') return 'mitra';
  return 'customer';
}

export async function resolveAuthNavigation(
  hinted: boolean,
  currentUser: () => Promise<AuthUser | null>,
): Promise<AuthNavigationState> {
  if (!hinted) return { status: 'guest', user: null };

  try {
    const user = await currentUser();
    return user
      ? { status: 'authenticated', user }
      : { status: 'guest', user: null };
  } catch (error) {
    if (error instanceof PortalApiError && error.code === 'SESSION_EXPIRED') {
      return { status: 'guest', user: null };
    }

    return { status: 'unavailable', user: null };
  }
}
