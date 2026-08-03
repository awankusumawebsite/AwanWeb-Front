import React, { createContext, useContext, useMemo } from 'react';

const IntlContext = createContext(null);

function getNestedValue(messages, key) {
  return key.split('.').reduce((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return current[segment];
  }, messages);
}

function interpolate(value, variables = {}) {
  return value.replace(/\{([^}]+)\}/g, (match, key) => {
    const replacement = variables[key];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}

export function NextIntlClientProvider({ locale, messages, children }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useLocale() {
  const context = useContext(IntlContext);
  if (!context) throw new Error('useLocale must be used inside NextIntlClientProvider.');
  return context.locale;
}

export function useTranslations(namespace) {
  const context = useContext(IntlContext);
  if (!context) throw new Error('useTranslations must be used inside NextIntlClientProvider.');

  return (key, variables) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const value = getNestedValue(context.messages, fullKey);

    if (typeof value !== 'string') {
      throw new Error(`Missing translation: ${fullKey}`);
    }

    return interpolate(value, variables);
  };
}
