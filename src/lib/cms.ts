const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504, 507, 508, 525]);
const DEFAULT_CMS_ORIGIN = 'https://cms.awankusuma.com';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_BUILD_CONCURRENCY = 1;

type FetchLike = typeof fetch;

interface CmsClientOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  maxConcurrentRequests?: number;
}

interface CmsRequestOptions extends RequestInit {
  allowNotFound?: boolean;
  retryCount?: number;
}

interface CmsApiErrorOptions {
  message: string;
  path: string;
  status?: number;
  code?: string;
  cause?: unknown;
}

function errorCodeForStatus(status: number): string {
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 507 || status === 508) return 'ORIGIN_CAPACITY';
  if (status >= 500) return 'CMS_SERVER_ERROR';
  return 'CMS_REQUEST_ERROR';
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
}

function retryDelay(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get('retry-after');
  const seconds = retryAfter === null || retryAfter === undefined
    ? Number.NaN
    : Number.parseFloat(retryAfter);

  if (Number.isFinite(seconds)) {
    return Math.min(2_000, Math.max(0, seconds * 1_000));
  }

  return 250 * (2 ** attempt);
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export class CmsApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly path: string;
  readonly retryable: boolean;

  constructor({
    message,
    path,
    status = 0,
    code = 'CMS_NETWORK_ERROR',
    cause,
  }: CmsApiErrorOptions) {
    super(message, { cause });
    this.name = 'CmsApiError';
    this.status = status;
    this.code = code;
    this.path = path;
    this.retryable = status === 0 || RETRYABLE_STATUS.has(status);
  }
}

export function createCmsClient({
  baseUrl = import.meta.env.PUBLIC_BACKEND_URL || DEFAULT_CMS_ORIGIN,
  fetchImpl = fetch,
  timeoutMs = Number(import.meta.env.CMS_BUILD_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  maxConcurrentRequests = Number(import.meta.env.CMS_BUILD_CONCURRENCY) || DEFAULT_BUILD_CONCURRENCY,
}: CmsClientOptions = {}) {
  const origin = normalizeBaseUrl(baseUrl);
  const buildRequests = new Map<string, Promise<unknown>>();
  const maxConcurrent = Math.max(1, Math.floor(maxConcurrentRequests));
  let activeRequests = 0;
  const queuedRequests: Array<() => void> = [];

  async function runQueued<T>(operation: () => Promise<T>): Promise<T> {
    if (activeRequests >= maxConcurrent) {
      await new Promise<void>((resolve) => queuedRequests.push(resolve));
    }

    activeRequests += 1;
    try {
      return await operation();
    } finally {
      activeRequests -= 1;
      queuedRequests.shift()?.();
    }
  }

  async function requestUnqueued<T>(
    path: string,
    { allowNotFound = false, retryCount = 2, ...options }: CmsRequestOptions = {},
  ): Promise<T | null> {
    const url = new URL(path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`, origin);
    let response: Response;

    try {
      response = await fetchImpl(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...options.headers,
        },
        signal: options.signal ?? AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      if (retryCount > 0) {
        await wait(retryDelay(null, 2 - retryCount));
        return requestUnqueued<T>(path, { ...options, allowNotFound, retryCount: retryCount - 1 });
      }

      throw new CmsApiError({
        message: 'CMS tidak dapat dihubungi.',
        path: url.href,
        cause,
      });
    }

    if (allowNotFound && response.status === 404) return null;

    if (!response.ok) {
      if (RETRYABLE_STATUS.has(response.status) && retryCount > 0) {
        await wait(retryDelay(response, 2 - retryCount));
        return requestUnqueued<T>(path, { ...options, allowNotFound, retryCount: retryCount - 1 });
      }

      throw new CmsApiError({
        message: `CMS merespons dengan status ${response.status}.`,
        status: response.status,
        code: errorCodeForStatus(response.status),
        path: url.href,
      });
    }

    try {
      return await response.json() as T;
    } catch (cause) {
      throw new CmsApiError({
        message: 'Respons CMS bukan JSON yang valid.',
        status: response.status,
        code: 'CMS_INVALID_RESPONSE',
        path: url.href,
        cause,
      });
    }
  }

  function request<T>(path: string, options: CmsRequestOptions = {}): Promise<T | null> {
    return runQueued(() => requestUnqueued<T>(path, options));
  }

  function requestOnce<T>(
    path: string,
    options: CmsRequestOptions = {},
  ): Promise<T | null> {
    const method = options.method?.toUpperCase() ?? 'GET';

    if (method !== 'GET') {
      return request<T>(path, options);
    }

    const key = `${options.allowNotFound ? 'optional' : 'required'}:${path}`;
    const existing = buildRequests.get(key) as Promise<T | null> | undefined;
    if (existing) return existing;

    const pending = request<T>(path, options).catch((error) => {
      buildRequests.delete(key);
      throw error;
    });
    buildRequests.set(key, pending);

    return pending;
  }

  function clearBuildCache(): void {
    buildRequests.clear();
  }

  return { request, requestOnce, clearBuildCache };
}

export const cms = createCmsClient();
