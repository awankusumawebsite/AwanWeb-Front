import { describe, expect, it } from 'vitest';
import type { ServiceMenuGroup } from './site-data';
import { uniqueServiceRoutes } from './service-details';

describe('uniqueServiceRoutes', () => {
  it('membuat satu route untuk parent dan fragment sub-service', () => {
    const groups: ServiceMenuGroup[] = [{
      category: 'Virtual Office',
      items: [
        { name: 'Virtual Office', slug: 'virtual-office' },
        { name: 'Tangerang', slug: 'virtual-office#tangerang' },
        { name: 'Jakarta', slug: 'virtual-office#jakarta' },
      ],
    }];

    expect(uniqueServiceRoutes(groups)).toEqual([
      { slug: 'virtual-office', category: 'Virtual Office' },
    ]);
  });

  it('mempertahankan kategori pertama untuk slug duplikat', () => {
    const groups: ServiceMenuGroup[] = [
      { category: 'Kategori A', items: [{ name: 'A', slug: 'layanan-sama' }] },
      { category: 'Kategori B', items: [{ name: 'B', slug: 'layanan-sama' }] },
    ];

    expect(uniqueServiceRoutes(groups)).toEqual([
      { slug: 'layanan-sama', category: 'Kategori A' },
    ]);
  });

  it('mengabaikan slug kosong', () => {
    const groups: ServiceMenuGroup[] = [{
      category: 'Kosong',
      items: [{ name: 'Tidak valid', slug: '   ' }],
    }];

    expect(uniqueServiceRoutes(groups)).toEqual([]);
  });

  it('tidak membuat route locale yang belum dipublikasikan admin', () => {
    const groups: ServiceMenuGroup[] = [{
      category: 'Pendirian',
      items: [
        {
          name: 'Pendirian PT',
          slug: 'pendirian-pt',
          available_locales: ['id'],
        },
        {
          name: 'Pendirian CV',
          slug: 'pendirian-cv',
          available_locales: ['id', 'en'],
        },
      ],
    }];

    expect(uniqueServiceRoutes(groups, 'en')).toEqual([
      { slug: 'pendirian-cv', category: 'Pendirian' },
    ]);
    expect(uniqueServiceRoutes(groups, 'zh')).toEqual([]);
  });
});
