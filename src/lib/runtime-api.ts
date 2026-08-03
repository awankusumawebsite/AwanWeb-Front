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

export interface CustomerOrderSummary {
  id: number;
  tracking_code: string;
  title: string;
  status: string;
  progress: number;
  service_name?: string | null;
  notary_office?: string | null;
  public_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CustomerOrderDetail extends Omit<CustomerOrderSummary, 'notary_office'> {
  notary_office?: string | Record<string, unknown> | null;
  stages: TrackingStage[];
  documents: TrackingDocument[];
}

export interface CustomerInvoiceSummary {
  id: number;
  invoice_number: string;
  order_title?: string | null;
  tracking_code?: string | null;
  status: string;
  total: number | string;
  issued_at?: string | null;
  due_at?: string | null;
  payment_receipt?: boolean;
  has_payment_receipt?: boolean;
}

export interface CustomerInvoiceDetail extends CustomerInvoiceSummary {
  order?: { title?: string; tracking_code?: string } | null;
  subtotal?: number | string;
  discount?: number | string;
  tax?: number | string;
  paid_at?: string | null;
  notes?: string | null;
  items?: Array<{
    id: number;
    description: string;
    quantity: number | string;
    unit_price: number | string;
    amount: number | string;
  }>;
}

export interface PaymentMethod {
  id: number;
  bank_name: string;
  account_number: string;
  account_name: string;
}

export interface NotaryOrderSummary {
  id: number;
  tracking_code: string;
  title: string;
  status: string;
  progress: number;
  service_name?: string | null;
  customer_name?: string | null;
  public_note?: string | null;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface NotaryChecklistItem {
  id: number;
  name: string;
  is_completed: boolean;
  is_required?: boolean;
}

export interface NotaryStage {
  id: number;
  name: string;
  status: string;
  description?: string;
  eta_date?: string | null;
  is_final?: boolean;
  checklist_items: NotaryChecklistItem[];
}

export interface NotaryOrderDetail extends NotaryOrderSummary {
  customer_phone?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  stages: NotaryStage[];
  documents: Array<TrackingDocument & { is_final?: boolean }>;
}

export interface NotaryStaff {
  id: number;
  name: string;
  username?: string | null;
  email: string;
  is_active: boolean;
  supervisor_name?: string | null;
  created_at?: string | null;
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
  try {
    if (active) window.localStorage.setItem(AUTH_SESSION_HINT_KEY, '1');
    else window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
  } catch {
    // Storage can be disabled by browser privacy settings. Authentication
    // remains authoritative on the backend; this is only a request hint.
  }
}

export function hasSessionHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
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

  async function request(
    path: string,
    options: RequestInit = {},
    prepareCsrf = false,
  ): Promise<Record<string, unknown>> {
    if (prepareCsrf) await csrfCookie();

    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (prepareCsrf) headers.set('X-XSRF-TOKEN', getXsrfToken());

    let response: Response;
    try {
      response = await fetchImpl(apiUrl(path, base), {
        ...options,
        credentials: 'include',
        cache: 'no-store',
        headers,
      });
    } catch {
      throw new PortalApiError({
        code: 'NETWORK_ERROR',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
      });
    }

    const body = await jsonBody(response);
    if (!response.ok) {
      if (response.status === 401) setSessionHint(false);
      throw new PortalApiError({
        status: response.status,
        code: errorCodeForStatus(response.status),
        message: typeof body.message === 'string' ? body.message : 'Permintaan tidak dapat diproses.',
        fields: body.errors as Record<string, string[]> | null | undefined,
      });
    }

    return body;
  }

  async function currentUser(): Promise<AuthUser | null> {
    const body = await request('auth/me');
    const user = body.authenticated === true && body.user ? body.user as AuthUser : null;
    if (!user) setSessionHint(false);
    return user;
  }

  async function logout(): Promise<void> {
    await request('auth/logout', { method: 'POST' }, true);
    setSessionHint(false);
  }

  async function customerOrders(): Promise<CustomerOrderSummary[]> {
    const body = await request('portal/orders');
    const result = Array.isArray(body.orders) ? body.orders : body.data;
    return Array.isArray(result) ? result as CustomerOrderSummary[] : [];
  }

  async function customerOrderDetail(trackingCode: string): Promise<CustomerOrderDetail> {
    const body = await request(`portal/orders/${encodeURIComponent(trackingCode)}`);
    return body.order as CustomerOrderDetail;
  }

  async function customerInvoices(): Promise<CustomerInvoiceSummary[]> {
    const body = await request('portal/invoices');
    return Array.isArray(body.invoices) ? body.invoices as CustomerInvoiceSummary[] : [];
  }

  async function customerInvoiceDetail(invoiceNumber: string): Promise<{
    invoice: CustomerInvoiceDetail;
    paymentMethods: PaymentMethod[];
    adminWhatsapp: string;
  }> {
    const body = await request(`portal/invoices/${encodeURIComponent(invoiceNumber)}`);
    return {
      invoice: body.invoice as CustomerInvoiceDetail,
      paymentMethods: Array.isArray(body.payment_methods) ? body.payment_methods as PaymentMethod[] : [],
      adminWhatsapp: typeof body.admin_whatsapp === 'string' ? body.admin_whatsapp : '',
    };
  }

  async function uploadInvoiceReceipt(invoiceNumber: string, file: File): Promise<void> {
    const form = new FormData();
    form.append('receipt', file);
    await request(`portal/invoices/${encodeURIComponent(invoiceNumber)}/upload-receipt`, {
      method: 'POST',
      body: form,
    }, true);
  }

  async function notaryOrders(): Promise<NotaryOrderSummary[]> {
    const body = await request('portal/mitra/orders');
    return Array.isArray(body.orders) ? body.orders as NotaryOrderSummary[] : [];
  }

  async function notaryOrderDetail(trackingCode: string): Promise<NotaryOrderDetail> {
    const body = await request(`portal/mitra/orders/${encodeURIComponent(trackingCode)}`);
    return body.order as NotaryOrderDetail;
  }

  async function notaryMutation(
    trackingCode: string,
    action: 'complete' | 'undo' | 'checklist' | 'checklist/undo' | 'assign',
    payload: Record<string, number | null>,
  ): Promise<Record<string, unknown>> {
    return request(`portal/mitra/orders/${encodeURIComponent(trackingCode)}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, true);
  }

  async function completeNotaryStage(trackingCode: string, stageId: number): Promise<void> {
    await notaryMutation(trackingCode, 'complete', { stage_id: stageId });
  }

  async function undoNotaryStage(trackingCode: string, stageId: number): Promise<void> {
    await notaryMutation(trackingCode, 'undo', { stage_id: stageId });
  }

  async function completeNotaryChecklist(trackingCode: string, checklistItemId: number): Promise<void> {
    await notaryMutation(trackingCode, 'checklist', { checklist_item_id: checklistItemId });
  }

  async function undoNotaryChecklist(trackingCode: string, checklistItemId: number): Promise<void> {
    await notaryMutation(trackingCode, 'checklist/undo', { checklist_item_id: checklistItemId });
  }

  async function assignNotaryOrder(trackingCode: string, staffId: number | null): Promise<string | null> {
    const body = await notaryMutation(trackingCode, 'assign', { staff_id: staffId });
    return typeof body.assigned_staff_name === 'string' ? body.assigned_staff_name : null;
  }

  async function notaryStaff(): Promise<NotaryStaff[]> {
    const body = await request('portal/mitra/staff');
    return Array.isArray(body.staff) ? body.staff as NotaryStaff[] : [];
  }

  async function toggleNotaryStaff(staffId: number): Promise<boolean> {
    const body = await request(`portal/mitra/staff/${staffId}/toggle-status`, { method: 'POST' }, true);
    return body.is_active === true;
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

  return {
    csrfCookie,
    login,
    currentUser,
    logout,
    customerOrders,
    customerOrderDetail,
    customerInvoices,
    customerInvoiceDetail,
    uploadInvoiceReceipt,
    notaryOrders,
    notaryOrderDetail,
    completeNotaryStage,
    undoNotaryStage,
    completeNotaryChecklist,
    undoNotaryChecklist,
    assignNotaryOrder,
    notaryStaff,
    toggleNotaryStaff,
    lookupTracking,
  };
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

export function customerDocumentUrl(documentId: number, origin?: string): string {
  return apiUrl(`portal/documents/${documentId}/download`, origin);
}

export function notaryDocumentUrl(documentId: number, origin?: string): string {
  return apiUrl(`portal/mitra/documents/${documentId}/download`, origin);
}
