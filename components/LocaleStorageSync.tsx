'use client';

import { localeStorageKey } from '@/i18n/config';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';

export default function LocaleStorageSync() {
  const locale = useLocale();

  useEffect(() => {
    localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  return null;
}