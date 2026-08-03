import { describe, expect, it } from 'vitest';
import { findToolBySlug, normalizeTools } from './tools';

describe('tools build data', () => {
  it('normalizes only tools with a supported rendering type', () => {
    const tools = normalizeTools({
      data: [
        { id: 1, name: 'HTML tool', slug: 'html-tool', type: 'html' },
        { id: 2, name: 'External tool', slug: 'external-tool', type: 'url' },
        { id: 3, name: 'React tool', slug: 'react-tool', type: 'react_component' },
        { id: 4, name: 'Broken tool', slug: 'broken-tool', type: 'unknown' },
      ],
    });

    expect(tools.map((tool) => tool.slug)).toEqual([
      'html-tool',
      'external-tool',
      'react-tool',
    ]);
  });

  it('returns an empty collection for malformed CMS data', () => {
    expect(normalizeTools(null)).toEqual([]);
    expect(normalizeTools({ data: { slug: 'not-a-list' } })).toEqual([]);
  });

  it('finds a tool by its exact slug', () => {
    const tools = normalizeTools({
      data: [{ id: 1, name: 'HTML tool', slug: 'html-tool', type: 'html' }],
    });

    expect(findToolBySlug(tools, 'html-tool')?.name).toBe('HTML tool');
    expect(findToolBySlug(tools, 'HTML-TOOL')).toBeNull();
  });
});
