/**
 * i18n Configuration for next-intl
 * Defines supported locales and routing configuration
 */

// madweb fork: MadPDF is served with the madweb.it account suite, so only the
// Italian (default) and English locales are shipped. Italian is canonical;
// new visitors land on /it regardless of browser language.
export const locales = ['it', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'it';

export const localeConfig: Record<Locale, {
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
}> = {
  it: { name: 'Italian', nativeName: 'Italiano', direction: 'ltr', dateFormat: 'DD/MM/YYYY' },
  en: { name: 'English', nativeName: 'English', direction: 'ltr', dateFormat: 'MM/DD/YYYY' },
};

/**
 * Check if a locale is RTL
 */
export function isRTL(locale: Locale): boolean {
  return localeConfig[locale].direction === 'rtl';
}

/**
 * Check if a string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get locale from path
 */
export function getLocaleFromPath(path: string): Locale | null {
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0];
  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment;
  }
  return null;
}

/**
 * Public URL for a route in the given locale.
 *
 * madweb fork: pdf.madweb.it is an Italian domain, so the default locale
 * (Italian) is served **unprefixed at the domain root** ("/", "/about",
 * "/tools/merge-pdf"). English keeps its "/en" prefix ("/en/about").
 */
export function localePath(locale: Locale | string, path: string): string {
  const clean = path === '' || path === '/' ? '/' : path.startsWith('/') ? path : `/${path}`;
  if (locale !== 'en') {
    // Italian (the bare-URL default) — and any unexpected value falls back to it.
    return clean;
  }
  return `/en${clean === '/' ? '/' : clean}`;
}

/**
 * Generate the localized version of the current path (language switcher).
 * Accepts both bare root paths (Italian, e.g. "/about") and prefixed paths
 * (e.g. "/en/about" or legacy "/it/about").
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  // Strip an existing locale prefix (must be followed by / or end of string).
  const cleanPath = path.replace(/^\/(it|en)(\/|$)/, '/');
  const normalizedPath = cleanPath === '/' ? '/' : cleanPath.replace(/^\/+/, '/');
  return localePath(locale, normalizedPath);
}
