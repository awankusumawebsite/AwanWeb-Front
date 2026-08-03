import { describe, expect, it } from 'vitest';
import {
  articleListingPath,
  normalizeArticleSlug,
  paginationItems,
} from './articles';

describe('normalizeArticleSlug', () => {
  it('menerima slug CMS yang aman', () => {
    expect(normalizeArticleSlug('izin-usaha-2026')).toBe('izin-usaha-2026');
  });

  it('menolak fragment, query, dan karakter yang tidak aman', () => {
    expect(normalizeArticleSlug('izin-usaha#dokumen')).toBeNull();
    expect(normalizeArticleSlug('izin-usaha?page=2')).toBeNull();
    expect(normalizeArticleSlug('../rahasia')).toBeNull();
  });
});

describe('articleListingPath', () => {
  it('membuat URL statis tanpa page satu', () => {
    expect(articleListingPath()).toBe('/info-bisnis');
    expect(articleListingPath({ category: 'pajak' })).toBe('/info-bisnis/kategori/pajak');
  });

  it('membuat URL halaman global dan kategori', () => {
    expect(articleListingPath({ page: 2 })).toBe('/info-bisnis/page/2');
    expect(articleListingPath({ category: 'pajak', page: 3 }))
      .toBe('/info-bisnis/kategori/pajak/page/3');
  });

  it('menormalkan input tidak valid ke listing utama', () => {
    expect(articleListingPath({ category: 'Pajak?', page: -2 })).toBe('/info-bisnis');
  });
});

describe('paginationItems', () => {
  it('menampilkan semua nomor untuk pagination pendek', () => {
    expect(paginationItems(2, 3)).toEqual([1, 2, 3]);
  });

  it('menambahkan ellipsis pada pagination panjang', () => {
    expect(paginationItems(5, 10)).toEqual([
      1,
      'ellipsis-left',
      4,
      5,
      6,
      'ellipsis-right',
      10,
    ]);
  });
});
