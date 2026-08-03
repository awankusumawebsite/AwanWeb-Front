import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cms', () => ({
  cms: {
    requestOnce: vi.fn(),
  },
}));

import { cms } from './cms';
import { getHomeData, homeMediaUrl, mediaHasRenderableFrame } from './home';

const requestOnce = vi.mocked(cms.requestOnce);

describe('getHomeData', () => {
  beforeEach(() => {
    requestOnce.mockReset();
  });

  it('mengambil seluruh data Home secara paralel dengan locale yang aman', async () => {
    requestOnce
      .mockResolvedValueOnce({ data: [{ id: 1, slug: 'artikel', title: 'Artikel' }] })
      .mockResolvedValueOnce({ data: [{ name: 'Client', quote: 'Bagus' }] })
      .mockResolvedValueOnce({ data: [{ question: 'Apa?', answer: 'Ini.' }] })
      .mockResolvedValueOnce({ data: [{ name: 'Partner' }] })
      .mockResolvedValueOnce({ data: [{ image_url: '/image.webp' }] });

    const data = await getHomeData('en');

    expect(requestOnce).toHaveBeenCalledTimes(5);
    expect(requestOnce).toHaveBeenNthCalledWith(1, '/blog/articles?locale=en&per_page=2');
    expect(requestOnce).toHaveBeenNthCalledWith(2, '/testimonials?locale=en');
    expect(requestOnce).toHaveBeenNthCalledWith(3, '/faqs?locale=en&location=home');
    expect(data.articles).toHaveLength(1);
    expect(data.testimonials).toHaveLength(1);
    expect(data.faqs).toHaveLength(1);
    expect(data.partners).toHaveLength(1);
    expect(data.marqueeImages).toHaveLength(1);
  });

  it('menghasilkan array kosong ketika endpoint mengembalikan data kosong', async () => {
    requestOnce.mockResolvedValue(null);

    await expect(getHomeData('id')).resolves.toEqual({
      articles: [],
      testimonials: [],
      faqs: [],
      partners: [],
      marqueeImages: [],
    });
  });
});

describe('mediaHasRenderableFrame', () => {
  it.each([
    [0, false],
    [1, false],
    [2, true],
    [3, true],
    [4, true],
  ])('readyState %s menghasilkan %s', (readyState, expected) => {
    expect(mediaHasRenderableFrame(readyState)).toBe(expected);
  });
});

describe('homeMediaUrl', () => {
  it('mempertahankan asset lokal dan URL absolut', () => {
    expect(homeMediaUrl('/images/logo.webp')).toBe('/images/logo.webp');
    expect(homeMediaUrl('https://cdn.example/logo.webp')).toBe('https://cdn.example/logo.webp');
  });

  it('mengubah storage path CMS menjadi URL absolut', () => {
    expect(homeMediaUrl('partners/logo.webp')).toBe('https://cms.awankusuma.com/storage/partners/logo.webp');
  });
});
