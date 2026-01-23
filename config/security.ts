// Security Configuration
export const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    MAX_LENGTH: 128,
  },
  
  // Session configuration
  SESSION: {
    EXPIRY_DAYS: 7,
    RENEWAL_THRESHOLD_DAYS: 2,
    COOKIE_SECURE: process.env.NODE_ENV === 'production',
    COOKIE_HTTP_ONLY: true,
    COOKIE_SAME_SITE: 'strict' as const,
  },
  
  // Rate limiting
  RATE_LIMIT: {
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 5,
    },
    GENERAL: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 100,
    },
    UPLOAD: {
      WINDOW_MS: 60 * 1000, // 1 minute
      MAX_REQUESTS: 10,
    },
  },
  
  // MFA configuration
  MFA: {
    TIME_STEP: 30, // seconds
    WINDOW: 1, // allow 1 window before and after
    DIGITS: 6,
  },
  
  // Account lockout
  LOCKOUT: {
    MAX_FAILED_ATTEMPTS: 5,
    LOCK_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  },
  
  // CSRF protection
  CSRF: {
    TOKEN_NAME: 'csrf-token',
    HEADER_NAME: 'x-csrf-token',
    COOKIE_EXPIRY_HOURS: 24,
  },
  
  // File upload security
  FILE_UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_MIME_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  
  // CORS configuration
  CORS: {
    ALLOWED_ORIGINS: [
      process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGIN || process.env.NEXT_PUBLIC_APP_URL
        : 'http://localhost:3000',
    ].filter(Boolean),
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    ALLOWED_HEADERS: [
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
      'Accept-Version',
      'Content-Length',
      'Content-MD5',
      'Content-Type',
      'Date',
      'X-Api-Version',
      'Authorization',
    ],
    ALLOW_CREDENTIALS: true,
  },
  
  // Security headers
  HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': process.env.NODE_ENV === 'production' 
      ? 'max-age=31536000; includeSubDomains; preload' 
      : undefined,
  },
};