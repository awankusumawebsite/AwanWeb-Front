import type { ServiceMenuItem } from './site-data';

export function serviceCategoryId(group: { slug?: string | null; category: string }): string {
  return group.slug || group.category
    .toLowerCase()
    .replace(/ & | dan /g, '-')
    .replace(/\s+/g, '-');
}

export function serviceParentSlug(slug: string): string {
  return slug.split('#')[0];
}

export function serviceDescription(item: ServiceMenuItem, items: ServiceMenuItem[]): string {
  if (item.description) return item.description;
  if (!item.slug.includes('#')) return '';
  return items.find((candidate) => candidate.slug === serviceParentSlug(item.slug))?.description || '';
}
