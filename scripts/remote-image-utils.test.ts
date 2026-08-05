import { describe, expect, it } from 'vitest';
import {
  extractOptimizableImageUrls,
  responsiveWidthsForCmsImage,
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

  it('menghentikan URL avatar pada batas entity JSON milik island Astro', () => {
    const avatar = 'https://lh3.googleusercontent.com/a/example=s120-c-rp-mo-ba12-br100';
    const html = `&quot;avatar&quot;:&quot;${avatar}&quot;],&quot;services&quot;:[1,[]]`;

    expect([...extractOptimizableImageUrls(html)]).toEqual([avatar]);
  });

  it('memberi batas lebar sesuai jenis penggunaan media', () => {
    expect(targetWidthForCmsImage('https://cdn.awankusuma.com/testimonials/avatars/a.jpg')).toBe(320);
    expect(targetWidthForCmsImage('https://cdn.awankusuma.com/marquee/a.webp')).toBe(960);
    expect(targetWidthForCmsImage('https://cdn.awankusuma.com/partners/a.webp')).toBe(320);
    expect(targetWidthForCmsImage('https://cdn.awankusuma.com/articles/featured/a.png')).toBe(1600);
    expect(responsiveWidthsForCmsImage('https://cdn.awankusuma.com/articles/featured/a.png')).toEqual([160, 480, 960, 1600]);
    expect(responsiveWidthsForCmsImage('https://cdn.awankusuma.com/marquee/a.webp')).toEqual([960]);
  });

  it('memberi srcset default pada image artikel dari rich content CMS', () => {
    const source = 'https://cdn.awankusuma.com/article-images/body.png';
    const html = `<article><img src="${source}" loading="lazy"></article>`;
    const replacement = {
      localPath: '/_media/cms/body-1600.webp',
      variants: [
        { localPath: '/_media/cms/body-480.webp', width: 480 },
        { localPath: '/_media/cms/body-1600.webp', width: 1600 },
      ],
    };
    const rewritten = rewriteCmsImageUrls(html, new Map([[source, replacement]]));

    expect(rewritten).toContain('srcset="/_media/cms/body-480.webp 480w, /_media/cms/body-1600.webp 1600w"');
    expect(rewritten).toContain('sizes="(min-width: 1024px) 700px, calc(100vw - 3rem)"');
  });

  it('menambahkan srcset hanya pada image yang ditandai responsif', () => {
    const source = 'https://cdn.awankusuma.com/articles/featured/a.png';
    const html = [
      `<img src="${source}" data-cms-responsive sizes="100vw">`,
      `<meta property="og:image" content="${source}">`,
    ].join('');
    const replacement = {
      localPath: '/_media/cms/a-1600.webp',
      variants: [
        { localPath: '/_media/cms/a-480.webp', width: 480 },
        { localPath: '/_media/cms/a-1600.webp', width: 1600 },
      ],
    };
    const rewritten = rewriteCmsImageUrls(html, new Map([[source, replacement]]));

    expect(rewritten).toContain('src="/_media/cms/a-1600.webp"');
    expect(rewritten).toContain('srcset="/_media/cms/a-480.webp 480w, /_media/cms/a-1600.webp 1600w"');
    expect(rewritten).not.toContain('data-cms-responsive');
    expect(rewritten).toContain('content="https://awankusuma.com/_media/cms/a-1600.webp"');
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
