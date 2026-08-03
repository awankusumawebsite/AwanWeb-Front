import { describe, expect, it } from 'vitest';
import { createRobotsTxt } from './robots-policy';

describe('createRobotsTxt', () => {
  it('memblokir seluruh crawler untuk artifact staging', () => {
    expect(createRobotsTxt(true)).toBe('User-agent: *\nDisallow: /\n');
  });

  it('mengizinkan konten publik tetapi memblokir route privat di production', () => {
    const robots = createRobotsTxt(false);

    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Disallow: /login');
    expect(robots).toContain('Disallow: /en/lacak');
    expect(robots).toContain('Disallow: /zh/mitra');
    expect(robots).toContain('Sitemap: https://awankusuma.com/sitemap-index.xml');
    expect(robots).not.toMatch(/^Disallow: \/$/m);
  });
});
