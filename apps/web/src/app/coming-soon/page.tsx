'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLanguageStore } from '@/stores/language-store';
import type { Locale } from '@/lib/i18n';
import { Logo } from '@/components/layout/Logo';

const LANGUAGES: { code: Locale; label: string; full: string }[] = [
  { code: 'ru', label: 'RU', full: 'Русский' },
  { code: 'uz', label: 'UZ', full: 'O‘zbekcha' },
  { code: 'en', label: 'EN', full: 'English' },
];

function LanguageSwitcher() {
  const { locale, setLocale } = useLanguageStore();
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('coming_soon.language')}
      className="inline-flex items-center rounded-full border border-border/60 bg-card/70 p-1 shadow-sm backdrop-blur"
    >
      {LANGUAGES.map((lang) => {
        const active = lang.code === locale;
        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={lang.full}
            title={lang.full}
            onClick={() => setLocale(lang.code)}
            className={
              'rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-all ' +
              (active
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}

function ComingSoonForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search?.get('next') || '/';
  const { t } = useTranslation();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError(t('coming_soon.error_empty'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      if (res.status === 401) setError(t('coming_soon.error_invalid'));
      else setError(t('coming_soon.error_generic'));
    } catch {
      setError(t('coming_soon.error_network'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="fixed inset-0 z-[100] flex flex-col bg-background">
      <header className="flex items-center justify-end p-5 sm:p-6">
        <LanguageSwitcher />
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-10">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <Logo className="mx-auto mb-5 h-10 w-auto text-primary dark:text-white" />
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              {t('coming_soon.brand')}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              {t('coming_soon.title')}
            </h1>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">
              {t('coming_soon.description')}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur"
          >
            <label htmlFor="access-code" className="mb-2 block text-sm font-medium text-foreground">
              {t('coming_soon.code_label')}
            </label>
            <input
              id="access-code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={submitting}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder={t('coming_soon.code_placeholder')}
              autoFocus
            />

            {error && (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? t('coming_soon.submitting') : t('coming_soon.submit')}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={null}>
      <ComingSoonForm />
    </Suspense>
  );
}
