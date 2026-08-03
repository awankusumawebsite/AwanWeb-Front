import { describe, expect, it } from 'vitest';
import { prepareArticleContent, splitArticleForInlineAd } from './article-content';

describe('prepareArticleContent', () => {
  it('memberi id stabil dan unik pada heading', () => {
    const result = prepareArticleContent('<h2>Syarat PT</h2><h3>Syarat PT</h3>');
    expect(result.headings).toEqual([
      { id: 'syarat-pt', text: 'Syarat PT', level: 2 },
      { id: 'syarat-pt-2', text: 'Syarat PT', level: 3 },
    ]);
    expect(result.html).toContain('<h2 id="syarat-pt">');
    expect(result.html).toContain('<h3 id="syarat-pt-2">');
  });

  it('mempertahankan id CMS dan melengkapi atribut gambar', () => {
    const result = prepareArticleContent(
      '<h2 id="dokumen">Dokumen</h2><img src="/storage/articles/a.webp" alt="A">',
    );
    expect(result.headings[0].id).toBe('dokumen');
    expect(result.html).toContain('https://cms.awankusuma.com/storage/articles/a.webp');
    expect(result.html).toContain('loading="lazy"');
    expect(result.html).toContain('width="800"');
  });
});

describe('splitArticleForInlineAd', () => {
  it('membagi konten setelah jumlah paragraf bermakna', () => {
    const html = '<p>Paragraf pertama panjang.</p><p>Paragraf kedua panjang.</p><p>Paragraf ketiga panjang.</p><p>Penutup panjang.</p>';
    const chunks = splitArticleForInlineAd(html, 3);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain('Paragraf ketiga');
    expect(chunks[1]).toContain('Penutup');
  });

  it('tidak membagi artikel pendek', () => {
    expect(splitArticleForInlineAd('<p>Pendek.</p>', 3)).toEqual(['<p>Pendek.</p>']);
  });
});
