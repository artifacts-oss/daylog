import { cookies } from 'next/headers';
import { SECURITY_CONFIG } from '@/config/security';

export async function setSessionTokenCookie(
  token: string,
  expiresAt: Date
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: SECURITY_CONFIG.SESSION.COOKIE_HTTP_ONLY,
    sameSite: SECURITY_CONFIG.SESSION.COOKIE_SAME_SITE,
    secure: SECURITY_CONFIG.SESSION.COOKIE_SECURE,
    expires: expiresAt,
    path: '/',
  });
}

export async function deleteSessionTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('session', '', {
    httpOnly: SECURITY_CONFIG.SESSION.COOKIE_HTTP_ONLY,
    sameSite: SECURITY_CONFIG.SESSION.COOKIE_SAME_SITE,
    secure: SECURITY_CONFIG.SESSION.COOKIE_SECURE,
    maxAge: 0,
    path: '/',
  });
}
