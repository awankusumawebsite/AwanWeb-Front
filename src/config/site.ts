export const SITE_URL = 'https://awankusuma.com';
export const DEFAULT_LOCALE = 'id' as const;
export const LOCALES = ['id', 'en', 'zh'] as const;

export type Locale = (typeof LOCALES)[number];

export const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  id: 'id_ID',
  en: 'en_US',
  zh: 'zh_CN',
};

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}
