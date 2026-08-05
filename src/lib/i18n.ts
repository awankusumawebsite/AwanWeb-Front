import {
  DEFAULT_LOCALE,
  LOCALES,
  SITE_URL,
  type Locale,
} from '../config/site';

export type MessageTree = Record<string, unknown>;

const messageLoaders: Record<Locale, () => Promise<{ default: MessageTree }>> = {
  id: () => import('../i18n/messages/id.json'),
  en: () => import('../i18n/messages/en.json'),
  zh: () => import('../i18n/messages/zh.json'),
};

function splitPathSuffix(path: string): { pathname: string; suffix: string } {
  const suffixIndex = path.search(/[?#]/);

  if (suffixIndex === -1) {
    return { pathname: path, suffix: '' };
  }

  return {
    pathname: path.slice(0, suffixIndex),
    suffix: path.slice(suffixIndex),
  };
}

export function normalizeLogicalPath(path: string): string {
  const { pathname, suffix } = splitPathSuffix(path.trim() || '/');
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const compactPath = withLeadingSlash.replace(/\/{2,}/g, '/');
  const normalizedPath = compactPath !== '/' ? compactPath.replace(/\/$/, '') : '/';

  return `${normalizedPath}${suffix}`;
}

export function localizedPath(path: string, locale: Locale): string {
  const normalizedPath = normalizeLogicalPath(path);
  const { pathname, suffix } = splitPathSuffix(normalizedPath);

  if (locale === DEFAULT_LOCALE) {
    return `${pathname}${suffix}`;
  }

  return pathname === '/'
    ? `/${locale}${suffix}`
    : `/${locale}${pathname}${suffix}`;
}

export function localizedUrl(path: string, locale: Locale): string {
  return new URL(localizedPath(path, locale), SITE_URL).href;
}

export type AlternateLocaleUrls = Partial<Record<Locale, string>> & { 'x-default': string };

export function alternateLocaleUrls(
  path: string,
  availableLocales: readonly Locale[] = LOCALES,
): AlternateLocaleUrls {
  const locales = LOCALES.filter((locale) => availableLocales.includes(locale));
  const defaultLocale = locales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : (locales[0] ?? DEFAULT_LOCALE);
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, localizedUrl(path, locale)]),
  ) as Partial<Record<Locale, string>>;

  return {
    ...languages,
    'x-default': localizedUrl(path, defaultLocale),
  };
}

export async function getMessages(locale: Locale): Promise<MessageTree> {
  return (await messageLoaders[locale]()).default;
}

export function translate(
  messages: MessageTree,
  key: string,
  variables: Record<string, string | number> = {},
): string {
  const value = key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, messages);

  if (typeof value !== 'string') {
    throw new Error(`Missing translation: ${key}`);
  }

  return value.replace(/\{([^}]+)\}/g, (match, variable: string) => {
    const replacement = variables[variable];
    return replacement === undefined ? match : String(replacement);
  });
}
