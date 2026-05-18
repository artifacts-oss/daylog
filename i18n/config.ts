import { routing } from './routing';

export const locales = [...routing.locales] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = routing.defaultLocale;
export const localeStorageKey = 'daylog-locale';

const localeCookieConfig =
  routing.localeCookie && typeof routing.localeCookie === 'object'
    ? routing.localeCookie
    : { name: 'locale', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' as const };

export const localeCookieName = localeCookieConfig.name ?? 'locale';
export const localeCookieMaxAge =
  localeCookieConfig.maxAge ?? 60 * 60 * 24 * 365;
export const localeCookieSameSite = localeCookieConfig.sameSite ?? 'lax';

export function isValidLocale(locale: string): locale is AppLocale {
  return locales.includes(locale as AppLocale);
}

export function getPreferredLocale(
  acceptLanguageHeader?: string | null,
): AppLocale {
  if (!acceptLanguageHeader) {
    return defaultLocale;
  }

  const candidates = acceptLanguageHeader
    .split(',')
    .map((part) => {
      const [tagPart, ...params] = part.trim().split(';');
      const qualityParam = params.find((param) => param.trim().startsWith('q='));
      const quality = qualityParam ? Number(qualityParam.trim().slice(2)) : 1;

      return {
        tag: tagPart.toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((candidate) => candidate.tag.length > 0)
    .sort((left, right) => right.quality - left.quality);

  for (const candidate of candidates) {
    if (isValidLocale(candidate.tag)) {
      return candidate.tag;
    }

    const baseLanguage = candidate.tag.split('-')[0];
    if (isValidLocale(baseLanguage)) {
      return baseLanguage;
    }
  }

  return defaultLocale;
}

export function resolveLocale(
  requestedLocale?: string | null,
  acceptLanguageHeader?: string | null,
): AppLocale {
  if (requestedLocale && isValidLocale(requestedLocale)) {
    return requestedLocale;
  }

  return getPreferredLocale(acceptLanguageHeader);
}