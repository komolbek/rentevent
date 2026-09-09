import { NextApiRequest } from 'next'
import { ru } from './translations/ru'
import { en } from './translations/en'
import { uz } from './translations/uz'

export type Language = 'ru' | 'en' | 'uz'
export type TranslationKey = keyof typeof ru

const translations = {
  ru,
  en,
  uz,
}

export function getLanguage(req: NextApiRequest): Language {
  // Check x-language header first
  const langHeader = req.headers['x-language']
  if (langHeader && isValidLanguage(langHeader as string)) {
    return langHeader as Language
  }

  // Check Accept-Language header
  const acceptLanguage = req.headers['accept-language']
  if (acceptLanguage) {
    const primary = acceptLanguage.split(',')[0].split('-')[0]
    if (isValidLanguage(primary)) {
      return primary as Language
    }
  }

  // Default to Russian
  return 'ru'
}

function isValidLanguage(lang: string): lang is Language {
  return ['ru', 'en', 'uz'].includes(lang)
}

export function translate(key: TranslationKey, language: Language = 'ru'): string {
  const dict = translations[language] || translations.ru
  return dict[key] || translations.ru[key] || key
}

export function createTranslator(req: NextApiRequest) {
  const language = getLanguage(req)
  return (key: TranslationKey) => translate(key, language)
}

export { ru, en, uz }
