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
 * Generate localized path
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  // Remove any existing locale prefix (must be followed by / or end of string)
  const cleanPath = path.replace(/^\/(it|en)(\/|$)/, '/');
  // Normalize the path - ensure it starts with / and handle empty paths
  const normalizedPath = cleanPath === '/' ? '/' : cleanPath.replace(/^\/+/, '/');
  // Add the new locale prefix
  return `/${locale}${normalizedPath === '/' ? '/' : normalizedPath}`;
}
