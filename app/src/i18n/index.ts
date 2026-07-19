import { en, type Dict } from './en';
import { fr } from './fr';

export type Lang = 'en' | 'fr';
export const DICTS: Record<Lang, Dict> = { en, fr };

export const localeOf = (lang: Lang): string => (lang === 'fr' ? 'fr-CA' : 'en-US');

/** "{cm} of fresh snow" + {cm: "12 cm"} → "12 cm of fresh snow". */
export const fill = (template: string, vars: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

export const detectLang = (navLang: string | undefined): Lang =>
  (navLang ?? 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';

export type { Dict };
