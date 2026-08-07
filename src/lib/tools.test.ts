import { describe, expect, it } from 'vitest';
import { normalizeTools } from './tools';
import { getToolIcon } from './tool-icons';
import { FileText, Scissors } from 'lucide-react';

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

  it('resolves CMS icon names and falls back safely', () => {
    expect(getToolIcon('Scissors')).toBe(Scissors);
    expect(getToolIcon('missing-icon')).toBe(FileText);
    expect(getToolIcon(null)).toBe(FileText);
  });
});
