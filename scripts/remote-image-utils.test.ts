import { describe, expect, it } from 'vitest';
import {
  extractOptimizableImageUrls,
  rewriteCmsImageUrls,
  targetWidthForCmsImage,
} from './remote-image-utils.mjs';

describe('remote CMS image optimizer helpers', () => {
  it('hanya mengumpulkan raster image dari CDN milik Awan Kusuma', () => {
    const html = [
      '<img src="https://cdn.awankusuma.com/articles/featured/a.png">',
      '<img src="https://cdn.awankusuma.com/marquee/b.webp">',
      '<img src="https://example.com/external.png">',
      '<img src="https://cdn.awankusuma.com/file.svg">',
    ].join('');

    expect([...extractOptimizableImageUrls(html)]).toEqual([
      'https://cdn.awankusuma.com/articles/featured/a.png',
      'https://cdn.awankusuma.com/marquee/b.webp',
    ]);
  });

  it('mengumpulkan avatar Google yang harus dilokalkan untuk mencegah ORB', () => {
    const avatar = 'https://lh3.googleusercontent.com/a-/example=s120-c-rp-mo';
    const html = `<img src="${avatar}"><img src="https://googleusercontent.com/untrusted.png">`;

    expect([...extractOptimizableImageUrls(html)]).toEqual([avatar]);
    expect(targetWidthForCmsImage(avatar)).toBe(320);
  });

  it('memberi batas lebar sesuai jenis penggunaan media', () => {
    expect(targetWidthForCmsImage('https://cdn.awankusuma.com/testimonials/avatars/a.jpg')).toBe(320);
    expect(targetWidthForCmsImage('https://cdn.awankusuma.com/marquee/a.webp')).toBe(960);
    expect(targetWidthForCmsImage('https://cdn.awankusuma.com/articles/featured/a.png')).toBe(1600);
  });

  it('menjaga URL absolut untuk social metadata dan JSON-LD', () => {
    const source = 'https://cdn.awankusuma.com/articles/featured/a.png';
    const html = [
      `<img src="${source}">`,
      `<meta property="og:image" content="${source}">`,
      `<script type="application/ld+json">{"image":"${source}"}</script>`,
    ].join('');
    const rewritten = rewriteCmsImageUrls(html, new Map([[source, '/_media/cms/a.webp']]));

    expect(rewritten).toContain('<img src="/_media/cms/a.webp">');
    expect(rewritten).toContain('content="https://awankusuma.com/_media/cms/a.webp"');
    expect(rewritten).toContain('"image":"https://awankusuma.com/_media/cms/a.webp"');
  });
});
