import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generalRateLimiter, getClientIP, getRateLimitHeaders } from '@/utils/rateLimit';
import { SECURITY_CONFIG } from '@/config/security';

const PUBLIC_FILE = /^(?!\/\.(?!well-known\/)).*\.(.*)$/;

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  
  // Apply rate limiting to all requests
  const ip = getClientIP(request);
  const rateLimitResult = generalRateLimiter.isAllowed(`${ip}:${pathname}`);
  
  const response = NextResponse.next();
  
// Add security headers from config
  Object.entries(SECURITY_CONFIG.HEADERS).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    }
  });
  
  // Add rate limiting headers
  if (!rateLimitResult.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        ...getRateLimitHeaders(rateLimitResult.resetTime, rateLimitResult.remaining),
        'Content-Type': 'text/plain',
      },
    });
  }
  
Object.entries(getRateLimitHeaders(rateLimitResult.resetTime, rateLimitResult.remaining, SECURITY_CONFIG.RATE_LIMIT.GENERAL.MAX_REQUESTS)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CORS validation for non-GET requests
  if (request.method !== 'GET') {
    const originHeader = request.headers.get('Origin');
    const hostHeader = request.headers.get('Host');
    
    if (originHeader === null || hostHeader === null) {
      return new NextResponse(null, {
        status: 403,
        headers: response.headers,
      });
    }
    
    let origin: URL;
    try {
      origin = new URL(originHeader);
    } catch {
      return new NextResponse(null, {
        status: 403,
        headers: response.headers,
      });
    }
    
if (origin.host !== hostHeader && !SECURITY_CONFIG.CORS.ALLOWED_ORIGINS.includes(originHeader)) {
      return new NextResponse(null, {
        status: 403,
        headers: response.headers,
      });
    }
    
    // Add CORS headers for valid origins
    if (SECURITY_CONFIG.CORS.ALLOWED_ORIGINS.includes(originHeader)) {
      response.headers.set('Access-Control-Allow-Origin', originHeader);
      response.headers.set('Access-Control-Allow-Methods', SECURITY_CONFIG.CORS.ALLOWED_METHODS.join(','));
      response.headers.set('Access-Control-Allow-Headers', SECURITY_CONFIG.CORS.ALLOWED_HEADERS.join(', '));
      response.headers.set('Access-Control-Allow-Credentials', SECURITY_CONFIG.CORS.ALLOW_CREDENTIALS.toString());
    }
  }

  // Allow static files, Next.js internals and the auth API through
  if (
    pathname.startsWith('/api/v1/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

// Validate if admin user exists (for initial registration flow)
  if (pathname !== '/register/init') {
    const adminResponse = await fetch(
      `${request.nextUrl.origin}/api/v1/auth/admin`,
      {
        cache: 'force-cache',
      }
    );
    if (!adminResponse.ok) {
      return NextResponse.next();
    }
    const adminData = await adminResponse.json();
    const adminExists = adminData.initialized;
    if (!adminExists) {
      return NextResponse.redirect(new URL('/register/init', request.url));
    }
  } else {
    const adminResponse = await fetch(
      `${request.nextUrl.origin}/api/v1/auth/admin`,
      {
        cache: 'force-cache',
      }
    );
    if (!adminResponse.ok) {
      return NextResponse.next();
    }
    const adminData = await adminResponse.json();
    const adminExists = adminData.initialized;
    if (adminExists) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (pathname === '/login') {
    const token = request.cookies.get('session')?.value;
    const sessionResponse = await fetch(
      `${request.nextUrl.origin}/api/v1/auth/session?token=${token}`,
      {
        cache: 'force-cache',
      }
    );
    if (!sessionResponse.ok) {
      return NextResponse.next();
    }
const sessionData = await sessionResponse.json();
    const isLoggedIn = sessionData.user !== null;
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Handle home page - redirect if not logged in
  if (pathname === '/') {
    const token = request.cookies.get('session')?.value;
    const sessionResponse = await fetch(
      `${request.nextUrl.origin}/api/v1/auth/session?token=${token}`,
      {
        cache: 'force-cache',
        // Revalidate user session cache every hour
        next: { revalidate: 3600 },
      }
    );
    if (!sessionResponse.ok) {
      return NextResponse.next();
    }
const sessionData = await sessionResponse.json();
    const isLoggedIn = sessionData.user !== null;
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

if (pathname === '/register') {
    // Validate if user registration is allowed
    const allowResponse = await fetch(
      `${request.nextUrl.origin}/api/v1/auth/register`
    );
    if (!allowResponse.ok) {
      return NextResponse.next();
    }
    const allowData = await allowResponse.json();
    const allowRegistration = allowData.registration;
    if (!allowRegistration) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Session exists — allow the request
  return NextResponse.next();
}
