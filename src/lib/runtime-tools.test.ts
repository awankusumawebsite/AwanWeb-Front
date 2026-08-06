import { describe, expect, it, vi } from 'vitest';
import {
  fetchRuntimeTool,
  fetchRuntimeTools,
  runtimeToolSlug,
  safeToolUrl,
} from './runtime-tools';

describe('runtime tools API', () => {
  it('loads the current catalog without browser caching', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      data: [{ id: 9, name: 'New CMS Tool', slug: 'new-cms-tool', type: 'html' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    const tools = await fetchRuntimeTools({
      origin: 'https://cms.awankusuma.com/api/',
      fetchImpl,
    });

    expect(tools.map((tool) => tool.slug)).toEqual(['new-cms-tool']);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://cms.awankusuma.com/api/tools',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('loads executable content only from the detail endpoint', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 9,
        name: 'New CMS Tool',
        slug: 'new-cms-tool',
        type: 'html',
        html_content: '<main>ready</main>',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    const tool = await fetchRuntimeTool({
      origin: 'https://cms.awankusuma.com',
      slug: 'new-cms-tool',
      fetchImpl,
    });

    expect(tool.html_content).toBe('<main>ready</main>');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://cms.awankusuma.com/api/tools/new-cms-tool',
      expect.any(Object),
    );
  });
});

describe('runtime tool routing and embeds', () => {
  it('reads tool slugs from localized and unlocalized URLs', () => {
    expect(runtimeToolSlug({ pathname: '/tools/pdf-liner', search: '' } as Location)).toBe('pdf-liner');
    expect(runtimeToolSlug({ pathname: '/en/tools/surat-kuasa', search: '' } as Location)).toBe('surat-kuasa');
    expect(runtimeToolSlug({ pathname: '/tools/runner', search: '?slug=new-tool' } as Location)).toBe('new-tool');
    expect(runtimeToolSlug({ pathname: '/tools/INVALID', search: '' } as Location)).toBeNull();
  });

  it('allows only HTTPS external tool URLs', () => {
    expect(safeToolUrl('https://internal.example/tool')).toBe('https://internal.example/tool');
    expect(safeToolUrl('http://internal.example/tool')).toBeNull();
    expect(safeToolUrl('javascript:alert(1)')).toBeNull();
  });
});
