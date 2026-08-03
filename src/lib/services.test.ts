import { describe, expect, it } from 'vitest';

import { serviceCategoryId, serviceDescription, serviceParentSlug } from './services';

describe('service route helpers', () => {
  it('uses the CMS category slug when available', () => {
    expect(serviceCategoryId({ category: 'Pendirian Entitas', slug: 'pendirian' })).toBe('pendirian');
  });

  it('creates a stable fallback category id', () => {
    expect(serviceCategoryId({ category: 'Izin & Perubahan Usaha' })).toBe('izin-perubahan-usaha');
  });

  it('removes an anchor fragment from a service route', () => {
    expect(serviceParentSlug('pendirian-pt#benefit')).toBe('pendirian-pt');
  });

  it('inherits a parent description for anchor sub-items', () => {
    const items = [
      { name: 'Parent', slug: 'pendirian-pt', description: 'Deskripsi parent' },
      { name: 'Child', slug: 'pendirian-pt#benefit' },
    ];

    expect(serviceDescription(items[1], items)).toBe('Deskripsi parent');
  });
});
