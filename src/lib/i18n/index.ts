/**
 * Internationalization utilities
 * Re-exports all i18n configuration and utilities
 */

export {
  locales,
  defaultLocale,
  localeConfig,
  isRTL,
  isValidLocale,
  getLocaleFromPath,
  getLocalizedPath,
  type Locale,
} from './config';

export {
  isRTLLocale,
  getDirection,
  getRTLClasses,
  flipPosition,
  getLogicalProperty,
  getIconRotation,
} from './rtl';

export {
  loadMessages,
  loadEnglishMessages,
  getNestedValue,
  getTranslationWithFallback,
  mergeWithFallback,
  createTranslator,
  hasTranslation,
  getMissingKeys,
  type NestedMessages,
} from './fallback';

// Legacy exports for backward compatibility
// Legacy exports for backward compatibility (madweb fork: it + en only)
export const SUPPORTED_LOCALES = ['it', 'en'] as const;
export const DEFAULT_LOCALE = 'it';
export const LOCALE_CONFIG = {
  it: { name: 'Italian', nativeName: 'Italiano', direction: 'ltr' as const },
  en: { name: 'English', nativeName: 'English', direction: 'ltr' as const },
};
