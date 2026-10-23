import { enUS, ru, uz } from 'date-fns/locale';
import type { Locale } from './index';

/** date-fns locale for the UI language — month names follow the switcher. */
export function dateFnsLocale(locale: Locale) {
  return locale === 'uz' ? uz : locale === 'en' ? enUS : ru;
}
