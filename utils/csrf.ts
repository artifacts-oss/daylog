import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { SECURITY_CONFIG } from '@/config/security';

export const CSRF_TOKEN_NAME = SECURITY_CONFIG.CSRF.TOKEN_NAME;
export const CSRF_HEADER_NAME = SECURITY_CONFIG.CSRF.HEADER_NAME;

/**
 * Generates a CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Sets the CSRF token in a cookie
 */
export async function setCSRFToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SECURITY_CONFIG.CSRF.COOKIE_EXPIRY_HOURS * 60 * 60,
  });
}

/**
 * Gets the CSRF token from the cookie
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_NAME)?.value ?? null;
}

/**
 * Validates CSRF token against header or form data
 */
export async function validateCSRFToken(
  request: Request,
  formData?: FormData
): Promise<boolean> {
  const cookieToken = await getCSRFToken();
  
  if (!cookieToken) {
    return false;
  }

  // API requests
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken === cookieToken;
  }

  // Form submissions
  if (formData) {
    const formToken = formData.get(CSRF_TOKEN_NAME) as string;
    return formToken === cookieToken;
  }

  return false;
}

/**
 * Middleware to validate CSRF for state-changing operations
 */
export function requireCSRF(methods: string[] = ['POST', 'PUT', 'DELETE', 'PATCH']) {
  return (request: Request) => {
    if (methods.includes(request.method)) {
      return validateCSRFToken(request);
    }
    return true;
  };
}