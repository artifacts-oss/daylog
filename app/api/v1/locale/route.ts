import {
  defaultLocale,
  isValidLocale,
  localeCookieMaxAge,
  localeCookieName,
  localeCookieSameSite,
} from '@/i18n/config';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    locale?: string;
  } | null;

  const locale = payload?.locale;

  if (!locale || !isValidLocale(locale)) {
    return NextResponse.json(
      { error: 'Invalid locale', locale: defaultLocale },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ locale });
  response.cookies.set(localeCookieName, locale, {
    path: '/',
    sameSite: localeCookieSameSite,
    maxAge: localeCookieMaxAge,
  });

  return response;
}