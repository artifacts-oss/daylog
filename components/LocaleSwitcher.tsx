'use client';

import { localeStorageKey, locales } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('LocaleSwitcher');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  const handleChange = async (nextLocale: string) => {

    if (nextLocale === locale) {
      return;
    }

    setIsSubmitting(true);
    localStorage.setItem(localeStorageKey, nextLocale);

    await fetch('/api/v1/locale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ locale: nextLocale }),
    });

    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t('trigger')}
          disabled={isSubmitting}
        >
          <LanguageIcon className="h-5 w-5" />
          <span className="sr-only">
            {isSubmitting ? t('updating') : t('trigger')}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t('title')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
          {locales.map((optionLocale) => (
            <DropdownMenuRadioItem key={optionLocale} value={optionLocale}>
              {t(`options.${optionLocale}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}