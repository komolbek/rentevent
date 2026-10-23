'use client';

import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLanguageStore } from '@/stores/language-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Locale } from '@/lib/i18n';

export const LOCALES: { code: Locale; label: string; full: string; flag: string }[] = [
  { code: 'ru', label: 'RU', full: 'Русский', flag: '🇷🇺' },
  { code: 'uz', label: 'UZ', full: 'O‘zbekcha', flag: '🇺🇿' },
  { code: 'en', label: 'EN', full: 'English', flag: '🇬🇧' },
];

interface LanguageSwitcherProps {
  /** `compact` is the header chip (globe + code); `full` names the language (phone menu). */
  variant?: 'compact' | 'full';
  align?: 'start' | 'end';
  className?: string;
}

/**
 * Language dropdown: a list with the flag and each language in its own name,
 * the current one ticked. Replaces the bare RU/UZ/EN <select>.
 */
export function LanguageSwitcher({ variant = 'compact', align = 'end', className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguageStore();
  const { t } = useTranslation();
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-semibold outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          variant === 'compact'
            ? 'h-9 px-2.5 text-xs uppercase tracking-[0.08em] text-foreground/80 hover:bg-muted hover:text-foreground'
            : 'h-10 border border-border px-3.5 text-sm hover:bg-muted',
          className,
        )}
        aria-label={`${t('header.language')}: ${current.full}`}
      >
        {variant === 'compact' ? (
          <Globe className="h-4 w-4" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{current.flag}</span>
        )}
        {variant === 'compact' ? current.label : current.full}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        <DropdownMenuLabel>{t('header.language')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          {LOCALES.map((l) => (
            <DropdownMenuRadioItem key={l.code} value={l.code} lang={l.code}>
              <span className="text-base leading-none" aria-hidden="true">
                {l.flag}
              </span>
              <span className="flex-1">{l.full}</span>
              <span className="text-xs text-muted-foreground">{l.label}</span>
              <span className="flex w-4 justify-end">
                <DropdownMenuItemIndicator>
                  <Check className="h-4 w-4 text-primary-text" />
                </DropdownMenuItemIndicator>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
