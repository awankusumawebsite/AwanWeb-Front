const DEFAULT_BACKEND_ORIGIN = 'https://cms.awankusuma.com';

export const AUTH_SESSION_HINT_KEY = 'awan-auth-session';

export type PortalErrorCode =
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string | null;
  avatar?: string | null;
  is_active: boolean;
}

export interface TrackingDocument {
  id: number;
  name: string;
  released_at?: string | null;
}

export interface TrackingStage {
  id: number;
  name: string;
  description?: string;
  status: string;
  eta_date?: string | null;
  completed_at?: string | null;
  customer_note?: string | null;
  checklist_items?: Array<{
    id: number;
    name: string;
    is_completed: boolean;
    completed_at?: string | null;
  }>;
}

export interface TrackingOrder {
  tracking_code: string;
  title: string;
  customer_name?: string;
  service_name?: string | null;
  status: string;
  progress_percent?: number;
  overall_eta?: string | null;
  public_note?: string | null;
  stages?: TrackingStage[];
  documents?: TrackingDocument[];
}

export class PortalApiError extends Error {
  readonly status: number;
  readonly code: PortalErrorCode;
  readonly fields: Record<string, string[]> | null;

  constructor({
    status = 0,
    code,
    message,
    fields = null,
  }: {
    status?: number;
    code: PortalErrorCode;
    message: string;
    fields?: Record<string, string[]> | null;
  }) {
    super(message);
    this.name = 'PortalApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function normalizeBackendOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').replace(/\/api$/, '');
}

export function backendOrigin(value?: string): string {
  return normalizeBackendOrigin(value || DEFAULT_BACKEND_ORIGIN);
}

export function apiUrl(path: string, origin?: string): string {
  const cleanPath = path.replace(/^\/+/, '');
  return `${backendOrigin(origin)}/api/${cleanPath}`;
}

export function safeLocalRedirect(value: string | null, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;

  try {
    const parsed = new URL(value, 'https://awankusuma.com');
    if (parsed.origin !== 'https://awankusuma.com') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function getXsrfToken(cookie = typeof document === 'undefined' ? '' : document.cookie): string {
  const match = cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function setSessionHint(active: boolean): void {
  if (typeof window === 'undefined') return;
  if (active) window.localStorage.setItem(AUTH_SESSION_HINT_KEY, '1');
  else window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
}

function errorCodeForStatus(status: number): PortalErrorCode {
  if (status === 401) return 'SESSION_EXPIRED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 422) return 'VALIDATION_ERROR';
  return 'SERVER_ERROR';
}

async function jsonBody(response: Response): Promise<Record<string, unknown>> {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export function createRuntimeApi({
  origin,
  fetchImpl = fetch,
}: {
  origin?: string;
  fetchImpl?: typeof fetch;
} = {}) {
  const base = backendOrigin(origin);

  async function csrfCookie(): Promise<void> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}/sanctum/csrf-cookie`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new PortalApiError({
        code: 'NETWORK_ERROR',
        message: 'Tidak dapat terhubung ke server.',
      });
    }

    if (!response.ok) {
      throw new PortalApiError({
        status: response.status,
        code: errorCodeForStatus(response.status),
        message: 'Tidak dapat menyiapkan sesi aman.',
      });
    }
  }

  async function login(email: string, password: string, remember = false): Promise<AuthUser> {
    await csrfCookie();

    let response: Response;
    try {
      response = await fetchImpl(apiUrl('auth/login', base), {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getXsrfToken(),
        },
        body: JSON.stringify({ email, password, remember }),
      });
    } catch {
      throw new PortalApiError({
        code: 'NETWORK_ERROR',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
      });
    }

    const body = await jsonBody(response);
    if (!response.ok || !body.user) {
      throw new PortalApiError({
        status: response.status,
        code: errorCodeForStatus(response.status),
        message: typeof body.message === 'string' ? body.message : 'Login tidak dapat diproses.',
        fields: body.errors as Record<string, string[]> | null | undefined,
      });
    }

    setSessionHint(true);
    return body.user as AuthUser;
  }

  async function lookupTracking(
    code: string,
    locale: string,
    phoneLast4?: string,
  ): Promise<{ requiresVerification: boolean; order: TrackingOrder | null }> {
    let response: Response;
    try {
      response = await fetchImpl(apiUrl(`tracking/lookup?locale=${encodeURIComponent(locale)}`, base), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, phone_last4: phoneLast4 || null }),
      });
    } catch {
      throw new PortalApiError({
        code: 'NETWORK_ERROR',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
      });
    }

    const body = await jsonBody(response);
    if (!response.ok) {
      throw new PortalApiError({
        status: response.status,
        code: errorCodeForStatus(response.status),
        message: typeof body.message === 'string' ? body.message : 'Pelacakan tidak dapat diproses.',
        fields: body.errors as Record<string, string[]> | null | undefined,
      });
    }

    if (body.requires_verification === true) {
      return { requiresVerification: true, order: null };
    }

    return {
      requiresVerification: false,
      order: (body.data || null) as TrackingOrder | null,
    };
  }

  return { csrfCookie, login, lookupTracking };
}

export function trackingDocumentUrl(
  code: string,
  documentId: number,
  phoneLast4 = '',
  origin?: string,
): string {
  const url = new URL(apiUrl(`tracking/documents/${encodeURIComponent(code)}/${documentId}/download`, origin));
  if (phoneLast4) url.searchParams.set('phone_last4', phoneLast4);
  return url.href;
}
