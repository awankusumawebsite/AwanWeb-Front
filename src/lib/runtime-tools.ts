import { normalizeTools, type CmsTool } from './tools';

type FetchLike = typeof fetch;

interface ToolResponse {
  data?: unknown;
}

function runtimeApiUrl(path: string, origin: string): string {
  const normalizedOrigin = origin.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedOrigin}/api/${normalizedPath}`;
}

async function fetchToolPayload(
  path: string,
  origin: string,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<ToolResponse> {
  const response = await fetchImpl(runtimeApiUrl(path, origin), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? 'TOOL_NOT_FOUND' : `TOOLS_API_${response.status}`);
  }

  return response.json() as Promise<ToolResponse>;
}

export async function fetchRuntimeTools({
  origin,
  fetchImpl = fetch,
  signal,
}: {
  origin: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
}): Promise<CmsTool[]> {
  return normalizeTools(await fetchToolPayload('tools', origin, fetchImpl, signal));
}

export async function fetchRuntimeTool({
  origin,
  slug,
  fetchImpl = fetch,
  signal,
}: {
  origin: string;
  slug: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
}): Promise<CmsTool> {
  const payload = await fetchToolPayload(
    `tools/${encodeURIComponent(slug)}`,
    origin,
    fetchImpl,
    signal,
  );
  const [tool] = normalizeTools({ data: payload.data ? [payload.data] : [] });

  if (!tool) throw new Error('INVALID_TOOL_RESPONSE');
  return tool;
}

export function runtimeToolSlug(location: Pick<Location, 'pathname' | 'search'>): string | null {
  const querySlug = new URLSearchParams(location.search).get('slug');
  const segments = location.pathname.split('/').filter(Boolean);
  const toolsIndex = segments.lastIndexOf('tools');
  const pathSlug = toolsIndex >= 0 ? segments[toolsIndex + 1] : null;
  const candidate = pathSlug && pathSlug !== 'runner' ? pathSlug : querySlug;

  if (!candidate || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate)) return null;
  return candidate;
}

export function safeToolUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
