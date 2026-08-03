import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cms', () => ({
  cms: {
    requestOnce: vi.fn(),
  },
}));

import { cms } from './cms';
import { fetchArticleSummaries } from './articles';

const requestOnce = vi.mocked(cms.requestOnce);

function article(id: number) {
  return { id, slug: `artikel-${id}`, title: `Artikel ${id}` };
}

describe('fetchArticleSummaries', () => {
  beforeEach(() => requestOnce.mockReset());

  it('mengikuti seluruh halaman paginator agar detail lama tidak hilang dari build', async () => {
    requestOnce
      .mockResolvedValueOnce({ data: [article(1)], current_page: 1, last_page: 2 })
      .mockResolvedValueOnce({ data: [article(2)], current_page: 2, last_page: 2 });

    await expect(fetchArticleSummaries('id')).resolves.toEqual([article(1), article(2)]);
    expect(requestOnce).toHaveBeenNthCalledWith(
      1,
      '/blog/articles?locale=id&per_page=100&page=1',
    );
    expect(requestOnce).toHaveBeenNthCalledWith(
      2,
      '/blog/articles?locale=id&per_page=100&page=2',
    );
  });

  it('menggagalkan build bila halaman lanjutan CMS tidak lengkap', async () => {
    requestOnce
      .mockResolvedValueOnce({ data: [article(1)], current_page: 1, last_page: 2 })
      .mockResolvedValueOnce({ current_page: 2, last_page: 2 });

    await expect(fetchArticleSummaries('en')).rejects.toThrow(
      'CMS tidak mengembalikan ringkasan artikel en/page/2.',
    );
  });
});
