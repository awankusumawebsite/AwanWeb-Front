import { cms } from './cms';

export type ToolType = 'html' | 'url' | 'react_component';

export interface CmsTool {
  id: number;
  name: string;
  slug: string;
  type: ToolType;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  html_content?: string | null;
  url?: string | null;
  updated_at?: string | null;
}

interface ToolCollectionResponse {
  data?: unknown;
}

const TOOL_TYPES = new Set<ToolType>(['html', 'url', 'react_component']);

export function normalizeTools(payload: ToolCollectionResponse | null): CmsTool[] {
  if (!Array.isArray(payload?.data)) return [];

  return payload.data.filter((entry): entry is CmsTool => {
    if (!entry || typeof entry !== 'object') return false;
    const tool = entry as Partial<CmsTool>;

    return typeof tool.id === 'number'
      && typeof tool.name === 'string'
      && tool.name.trim().length > 0
      && typeof tool.slug === 'string'
      && tool.slug.trim().length > 0
      && typeof tool.type === 'string'
      && TOOL_TYPES.has(tool.type as ToolType);
  });
}

export async function getActiveTools(): Promise<CmsTool[]> {
  const response = await cms.requestOnce<ToolCollectionResponse>('/tools');
  return normalizeTools(response);
}

export function findToolBySlug(tools: CmsTool[], slug: string): CmsTool | null {
  return tools.find((tool) => tool.slug === slug) ?? null;
}
