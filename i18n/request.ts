import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { localeCookieName, resolveLocale } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const requestedLocale = cookieStore.get(localeCookieName)?.value;
  const locale = resolveLocale(
    requestedLocale,
    headerStore.get('accept-language'),
  );

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});