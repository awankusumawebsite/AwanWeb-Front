import { describe, expect, it } from 'vitest';

import { serviceDetailCopy } from './service-detail-copy';

function objectShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(objectShape);
  if (!value || typeof value !== 'object') return typeof value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, objectShape(nested)]),
  );
}

describe('service detail localized copy', () => {
  it('keeps the same UI contract for every locale', () => {
    expect(objectShape(serviceDetailCopy.en)).toEqual(objectShape(serviceDetailCopy.id));
    expect(objectShape(serviceDetailCopy.zh)).toEqual(objectShape(serviceDetailCopy.id));
  });

  it.each(['id', 'en', 'zh'] as const)('keeps required template placeholders for %s', (locale) => {
    const copy = serviceDetailCopy[locale];

    expect(copy.hero.whatsappTemplate).toContain('{service}');
    expect(copy.pricing.whatsappTemplate).toContain('{package}');
    expect(copy.pricing.whatsappTemplate).toContain('{servicePart}');
    expect(copy.faq.whatsappIntro).toContain('{name}');
    expect(copy.faq.whatsappIntro).toContain('{servicePart}');
  });
});

