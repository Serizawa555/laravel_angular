export const SUPPORTED_LANGS = ['en', 'ro'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export function isLang(value: string | null | undefined): value is Lang {
  return value === 'en' || value === 'ro';
}

/** Pick a supported language from the browser, falling back to the default. */
export function detectLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : DEFAULT_LANG;
  return isLang(nav) ? nav : DEFAULT_LANG;
}
