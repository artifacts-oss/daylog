'use client';

import { locales } from '@/i18n/config';
import { changeLocale } from '@/lib/locale';
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
import { useState } from 'react';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('LocaleSwitcher');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = async (nextLocale: string) => {
    setIsSubmitting(true);
    await changeLocale(nextLocale, locale);
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
            <DropdownMenuRadioItem
              key={optionLocale}
              value={optionLocale}
              className="w-full min-h-[48px] py-1"
            >
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span>{t(`options.${optionLocale}`)}</span>
                {optionLocale !== locale && (
                  <span aria-hidden="true" className="mt-0.5 text-xs text-muted-foreground">
                    {new Intl.DisplayNames([optionLocale], { type: 'language' })
                      .of(optionLocale)
                      ?.replace(/^./u, (firstLetter) => firstLetter.toLocaleUpperCase(optionLocale))}
                  </span>
                )}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
