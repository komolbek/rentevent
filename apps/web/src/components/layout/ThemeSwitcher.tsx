'use client';

import { useSyncExternalStore } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import {
  THEME_CHANGE_EVENT,
  readStoredTheme,
  setTheme,
  type ThemeChoice,
} from '@/lib/theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** The stored choice; `system` on the server so hydration matches. */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readStoredTheme, () => 'system');
}

interface ThemeSwitcherProps {
  /** `icon` is the quiet header button; `full` names the choice (phone menu). */
  variant?: 'icon' | 'full';
  align?: 'start' | 'end';
  className?: string;
}

/** System / Light / Dark chooser: a menu with radio items (Radix keyboard + focus handling). */
export function ThemeSwitcher({ variant = 'icon', align = 'end', className }: ThemeSwitcherProps) {
  const { t } = useTranslation();
  const choice = useThemeChoice();
  const Icon = ICONS[choice];
  const label = (c: ThemeChoice) => t(`theme.${c}`);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center justify-center rounded-full outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          variant === 'icon'
            ? 'h-11 w-11 text-foreground/80 hover:bg-muted hover:text-foreground'
            : 'h-11 gap-2 border border-border px-3.5 text-sm font-semibold hover:bg-muted',
          className,
        )}
        aria-label={`${t('theme.label')}: ${label(choice)}`}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        {variant === 'full' && label(choice)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuLabel>{t('theme.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={choice} onValueChange={(v) => setTheme(v as ThemeChoice)}>
          {(['system', 'light', 'dark'] as const).map((c) => {
            const ItemIcon = ICONS[c];
            return (
              <DropdownMenuRadioItem key={c} value={c}>
                <ItemIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">{label(c)}</span>
                <span className="flex w-4 justify-end">
                  <DropdownMenuItemIndicator>
                    <Check className="h-4 w-4 text-primary-text" />
                  </DropdownMenuItemIndicator>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
