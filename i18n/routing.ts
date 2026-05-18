import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es', 'de', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'never',
  localeDetection: true,
  localeCookie: {
    name: 'locale',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  },
  alternateLinks: false,
});