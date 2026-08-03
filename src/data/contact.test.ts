import { describe, expect, it } from 'vitest';

import { fallbackContactInfo, normalizeContactInfo } from './contact';

describe('normalizeContactInfo', () => {
  it('keeps complete CMS values', () => {
    const value = normalizeContactInfo({
      whatsapp: '621234',
      whatsapp_display: '+62 1234',
      email: 'team@example.com',
      address: 'Alamat uji',
      maps_url: 'https://maps.example.com',
      maps_embed: 'https://maps.example.com/embed',
      hours: '09.00–17.00 WIB',
    });

    expect(value.email).toBe('team@example.com');
    expect(value.maps_embed).toBe('https://maps.example.com/embed');
  });

  it('fills optional missing fields without replacing a valid phone number', () => {
    const value = normalizeContactInfo({ whatsapp: '629999' });

    expect(value.whatsapp).toBe('629999');
    expect(value.email).toBe(fallbackContactInfo.email);
    expect(value.maps_embed).toBe(fallbackContactInfo.maps_embed);
  });
});
