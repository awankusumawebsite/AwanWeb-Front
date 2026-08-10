import { describe, expect, it } from 'vitest';

import { LOCALES } from '../config/site';
import {
  alternateLocaleUrls,
  getMessages,
  localizedPath,
  normalizeLogicalPath,
  translate,
} from './i18n';

describe('locale routing parity', () => {
  it('keeps Indonesian URLs unprefixed', () => {
    expect(localizedPath('/layanan', 'id')).toBe('/layanan');
    expect(localizedPath('/', 'id')).toBe('/');
  });

  it('prefixes English and Chinese URLs', () => {
    expect(localizedPath('/layanan', 'en')).toBe('/en/layanan');
    expect(localizedPath('/', 'zh')).toBe('/zh');
  });

  it('preserves query and hash suffixes exactly once', () => {
    expect(localizedPath('/info-bisnis?page=2#articles-grid', 'en'))
      .toBe('/en/info-bisnis?page=2#articles-grid');
  });

  it('normalizes duplicate slashes and trailing slashes', () => {
    expect(normalizeLogicalPath('///layanan///')).toBe('/layanan');
  });

  it('generates canonical hreflang and x-default URLs', () => {
    expect(alternateLocaleUrls('/kontak')).toEqual({
      id: 'https://awankusuma.com/kontak',
      en: 'https://awankusuma.com/en/kontak',
      zh: 'https://awankusuma.com/zh/kontak',
      'x-default': 'https://awankusuma.com/kontak',
    });
  });

  it('only advertises locale variants that actually exist', () => {
    expect(alternateLocaleUrls('/layanan/pendirian-pt', ['id'])).toEqual({
      id: 'https://awankusuma.com/layanan/pendirian-pt',
      'x-default': 'https://awankusuma.com/layanan/pendirian-pt',
    });

    expect(alternateLocaleUrls('/layanan/pendirian-pt', ['id', 'en'])).toEqual({
      id: 'https://awankusuma.com/layanan/pendirian-pt',
      en: 'https://awankusuma.com/en/layanan/pendirian-pt',
      'x-default': 'https://awankusuma.com/layanan/pendirian-pt',
    });
  });

  it('interpolates translated variables without changing missing placeholders', async () => {
    const messages = await getMessages('id');

    expect(translate(messages, 'footer.copyright', { year: 2026 }))
      .toBe('© 2026 AWAN KUSUMA LEGALITAS');
  });

  it('keeps the primary brand tagline identical in every locale', async () => {
    for (const locale of LOCALES) {
      const messages = await getMessages(locale);

      expect([
        translate(messages, 'hero.heading1'),
        translate(messages, 'hero.heading2'),
      ]).toEqual(['GROW & SECURE', 'BUSINESS WITH US']);
    }
  });
});
