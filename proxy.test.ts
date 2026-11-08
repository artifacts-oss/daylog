import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proxy } from './proxy';
import { generalRateLimiter } from '@/utils/rateLimit';
import { localeCookieName } from '@/i18n/config';

const BASE = 'http://localhost:3000';

interface FetchState {
  session?: { ok?: boolean; user: object | null; sessionExpiresAt?: string };
  admin?: { ok?: boolean; initialized: boolean };
  register?: { ok?: boolean; registration: boolean };
}

function stubFetch({ session, admin, register }: FetchState = {}) {
  const fetchMock = vi.fn(async (url: string) => {
    const reply = (state: { ok?: boolean } | undefined) =>
      ({ ok: state?.ok ?? true, json: async () => state }) as Response;
    if (url.includes('/auth/session')) return reply(session ?? { user: { id: 1 } });
    if (url.includes('/auth/admin')) return reply(admin ?? { initialized: true });
    return reply(register ?? { registration: true });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

let ipCounter = 0;

function makeRequest(
  path: string,
  { method = 'GET', headers = {} }: { method?: string; headers?: Record<string, string> } = {},
) {
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers: {
      'x-forwarded-for': `10.0.0.${++ipCounter}`,
      cookie: `${localeCookieName}=en; session=tok`,
      ...headers,
    },
  });
}

function location(response: Response) {
  const { pathname, search } = new URL(response.headers.get('location') ?? '');
  return pathname + search;
}

describe('proxy', () => {
  beforeEach(() => {
    delete process.env.INTERNAL_APP_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    stubFetch();
    vi.spyOn(generalRateLimiter, 'isAllowed').mockReturnValue({
      allowed: false,
      resetTime: Date.now() + 1000,
      remaining: 0,
    });

    const response = await proxy(makeRequest('/'));

    expect(response.status).toBe(429);
    expect(response.headers.get('Content-Type')).toBe('text/plain');
  });

  it('sets the locale cookie when missing or different from the resolved one', async () => {
    stubFetch();
    const response = await proxy(
      makeRequest('/', { headers: { cookie: 'session=tok', 'accept-language': 'es' } }),
    );

    expect(response.cookies.get(localeCookieName)?.value).toBe('es');
  });

  it.each(['/_next/x.js', '/api/v1/auth/session', '/api/v1/locale', '/static/a', '/favicon.ico', '/logo.png'])(
    'lets %s through without auth checks',
    async (path) => {
      const fetchMock = stubFetch();
      const response = await proxy(makeRequest(path));

      expect(response.status).toBe(200);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  describe('CORS on non-GET requests', () => {
    it.each([
      ['no Origin', { host: 'localhost:3000' }],
      ['no Host', { origin: BASE }],
      ['invalid Origin', { origin: 'not a url', host: 'localhost:3000' }],
      ['foreign Origin', { origin: 'https://evil.test', host: 'localhost:3000' }],
    ])('rejects %s with 403', async (_label, headers) => {
      stubFetch();
      const request = new NextRequest(`${BASE}/boards`, {
        method: 'POST',
        headers: { 'x-forwarded-for': `10.1.0.${++ipCounter}`, ...headers },
      });

      expect((await proxy(request)).status).toBe(403);
    });

    it('adds CORS headers for an allowed origin', async () => {
      stubFetch();
      const response = await proxy(
        makeRequest('/api/v1/auth/session', {
          method: 'POST',
          headers: { origin: BASE, host: 'localhost:3000' },
        }),
      );

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(BASE);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('accepts a same-host origin that is not in the allowlist', async () => {
      stubFetch();
      const response = await proxy(
        makeRequest('/api/v1/auth/session', {
          method: 'POST',
          headers: { origin: 'https://app.test', host: 'app.test' },
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('authentication', () => {
    it('redirects to /login with callbackUrl when the session is invalid', async () => {
      stubFetch({ session: { user: null } });
      const response = await proxy(makeRequest('/boards'));

      expect(location(response)).toBe('/login?callbackUrl=%2Fboards');
    });

    it('redirects when the session endpoint fails', async () => {
      stubFetch({ session: { ok: false, user: null } });
      const response = await proxy(makeRequest('/boards'));

      expect(location(response)).toBe('/login?callbackUrl=%2Fboards');
    });

    it('uses INTERNAL_APP_URL and refreshes the session cookie', async () => {
      process.env.INTERNAL_APP_URL = 'http://internal:3000';
      const fetchMock = stubFetch({
        session: { user: { id: 1 }, sessionExpiresAt: '2030-01-01T00:00:00.000Z' },
      });
      const response = await proxy(makeRequest('/boards'));

      expect(fetchMock.mock.calls[0][0]).toBe('http://internal:3000/api/v1/auth/session?token=tok');
      expect(response.cookies.get('session')?.value).toBe('tok');
    });

    it('skips the session check for public paths', async () => {
      const fetchMock = stubFetch();
      await proxy(makeRequest('/login/reset/abc'));

      expect(fetchMock.mock.calls.some(([url]) => url.includes('/auth/session'))).toBe(false);
    });
  });

  describe('admin initialization', () => {
    it('redirects to /register/init when no admin exists', async () => {
      stubFetch({ admin: { initialized: false } });
      const response = await proxy(makeRequest('/login'));

      expect(location(response)).toBe('/register/init');
    });

    it('redirects /register/init to /login once initialized', async () => {
      stubFetch({ admin: { initialized: true } });
      const response = await proxy(makeRequest('/register/init'));

      expect(location(response)).toBe('/login');
    });

    it('lets /register/init through while no admin exists', async () => {
      stubFetch({ admin: { initialized: false } });
      expect((await proxy(makeRequest('/register/init'))).status).toBe(200);
    });

    it.each(['/register/init', '/register/terms', '/boards'])(
      'falls through when the admin endpoint fails on %s',
      async (path) => {
        stubFetch({ admin: { ok: false, initialized: false } });
        expect((await proxy(makeRequest(path))).status).toBe(200);
      },
    );
  });

  describe('/login', () => {
    it('skips the session lookup without a usable token', async () => {
      const fetchMock = stubFetch();
      const response = await proxy(
        makeRequest('/login', { headers: { cookie: `${localeCookieName}=en; session=undefined` } }),
      );

      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1); // admin check only
    });

    it('redirects logged-in users to a safe callbackUrl', async () => {
      stubFetch();
      const response = await proxy(makeRequest('/login?callbackUrl=/notes'));

      expect(location(response)).toBe('/notes');
    });

    it('ignores external callbackUrl values', async () => {
      stubFetch();
      const response = await proxy(makeRequest('/login?callbackUrl=https://evil.test'));

      expect(location(response)).toBe('/');
    });

    it('stays on /login when the session is not valid', async () => {
      stubFetch({ session: { user: null } });
      expect((await proxy(makeRequest('/login'))).status).toBe(200);
    });

    it('stays on /login when the session endpoint fails', async () => {
      stubFetch({ session: { ok: false, user: null } });
      expect((await proxy(makeRequest('/login'))).status).toBe(200);
    });
  });

  describe('/register', () => {
    it('allows access when registration is enabled', async () => {
      stubFetch({ register: { registration: true } });
      expect((await proxy(makeRequest('/register'))).status).toBe(200);
    });

    it('redirects to /login when registration is disabled', async () => {
      stubFetch({ register: { registration: false } });
      const response = await proxy(makeRequest('/register'));

      expect(location(response)).toBe('/login?callbackUrl=%2Fregister');
    });

    it('allows access when the registration endpoint fails', async () => {
      stubFetch({ register: { ok: false, registration: false } });
      expect((await proxy(makeRequest('/register'))).status).toBe(200);
    });
  });

  it('allows authenticated requests to protected pages', async () => {
    stubFetch();
    expect((await proxy(makeRequest('/boards'))).status).toBe(200);
  });
});
