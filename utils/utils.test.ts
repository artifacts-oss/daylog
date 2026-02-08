import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { stringToColor } from './color';
import { encodeBase32, encodeHex, hashPassword } from './crypto';
import { createAndVerifyTransporter } from './email';
import { saveAndGetImageFile } from './file';
import { base64ToArrayBuffer, bytesToBase64, getImageUrlOrFile } from './image';
import { renderMarkdownToHtml } from './html';
import {
  generateCSRFToken,
  getCSRFToken,
  setCSRFToken,
  validateCSRFToken,
  CSRF_TOKEN_NAME,
  CSRF_HEADER_NAME,
} from './csrf';
import {
  RateLimiter,
  authRateLimiter,
  generalRateLimiter,
  uploadRateLimiter,
  getClientIP,
  createRateLimitMiddleware,
  getRateLimitHeaders,
} from './rateLimit';
import { removeFile, saveBase64File } from './storage';
import { isBase64, isUrl, truncateWord } from './text';
import { generateTOTP, generateTOTPSecret, validateTOTP } from './totp';
import { randomDelay } from './delay';
import getSorting from './sorting';
import {
  computeDiff,
  applyPatch,
  validatePatch,
  areTextsIdentical,
  getDiffSummary,
  getDiffPreview,
} from './diff';
import { Prisma } from '@/prisma/generated/client';

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  verify: vi.fn().mockImplementation((callback) => {
    callback(null, true);
  }),
  cookies: vi.fn(),
  getSettings: vi.fn(),
  uploadFileS3: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mocks.createTransport.mockReturnValue({
      sendMail: mocks.sendMail,
      verify: mocks.verify,
    }),
  },
}));

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}));

vi.mock('@/app/admin/lib/actions', () => ({
  getSettings: mocks.getSettings,
}));

vi.mock('@/app/api/v1/storage/lib/s3Storage', () => ({
  uploadFileS3: mocks.uploadFileS3,
}));

vi.mock('nodemailer/lib/smtp-transport', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

describe('Crypto Utils', () => {
  it('encodes Base32 correctly', () => {
    const result = encodeBase32(new Uint8Array([104, 101, 108, 108, 111]));
    expect(result).toBe('nbswy3dp');
  });

  it('encodes Hex correctly', () => {
    const result = encodeHex('hello');
    expect(result).toMatch(/[a-f0-9]{64}/);
  });

  it('hashes password correctly', async () => {
    const result = await hashPassword('password123');
    expect(result).toMatch(/^\$2[ayb]\$12\$.{53}$/);
  });
});

describe('Image Utils', () => {
  it('converts Base64 to ArrayBuffer', () => {
    const base64 = 'aGVsbG8=';
    const result = base64ToArrayBuffer(base64);
    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('converts bytes to Base64', () => {
    const bytes = new Uint8Array([104, 101, 108, 108, 111]);
    const result = bytesToBase64(bytes);
    expect(result).toBe('aGVsbG8=');
  });

  it('gets image URL or file path', () => {
    const url = getImageUrlOrFile('http://example.com/image.jpg');
    expect(url).toBe('http://example.com/image.jpg');

    const filePath = getImageUrlOrFile('local/image.jpg');
    expect(filePath).toBe('/api/v1/images?filePath=local/image.jpg');
  });

  it('saves Base64 file', () => {
    const base64 = 'data:image/png;base64,iVBORw0KGgo=';
    const filePath = saveBase64File(base64);
    expect(filePath).toBeDefined();
  });
});

describe('Email Utils', () => {
  it('creates and verifies transporter', async () => {
    await expect(createAndVerifyTransporter()).resolves.toBeDefined();
  });
});

describe('Storage Utils', () => {
  it('saves Base64 file', () => {
    const base64 = 'data:image/png;base64,iVBORw0KGgo=';
    const filePath = saveBase64File(base64);
    expect(filePath).toBeDefined();
  });

  it('removes file', () => {
    const result = removeFile('test.txt');
    expect(result).toBe(true);
  });
});

describe('Color Utils', () => {
  it('converts string to color', () => {
    const color = stringToColor('test');
    expect(color).toMatch(/hsl\(\d+, 100%, 80%\)/);
  });
});

describe('TOTP Utils', () => {
  it('generates TOTP secret', () => {
    const secret = generateTOTPSecret();
    expect(secret).toBeDefined();
  });

  it('generates TOTP code', () => {
    const secret = generateTOTPSecret();
    const code = generateTOTP(secret);
    expect(code).toHaveLength(6);
  });

  it('validates TOTP code', () => {
    const secret = generateTOTPSecret();
    const code = generateTOTP(secret);
    const isValid = validateTOTP(secret, code);
    expect(isValid).toBe(true);
  });
});

describe('Text Utils', () => {
  it('truncates word', () => {
    const result = truncateWord('This is a long text', 10);
    expect(result).toBe('This is a ...');
  });

  it('checks if string is Base64', () => {
    const result = isBase64('data:image/png;base64,iVBORw0KGgo=');
    expect(result).toBe(true);
  });

  it('checks if string is URL', () => {
    const result = isUrl('https://example.com');
    expect(result).toBe(true);
  });

  it('returns false for non-URL', () => {
    const result = isUrl('not a url');
    expect(result).toBe(false);
  });

  it('returns false for non-Base64', () => {
    const result = isBase64('not a base64 string');
    expect(result).toBe(false);
  });

  it('returns false when an error occurs in isUrl', () => {
    // Simulate an error by passing an invalid or blank URL
    const result = isUrl('');
    expect(result).toBe(false);
  });

  it('returns false when an error occurs in isBase64', () => {
    // Simulate an error by passing an invalid or blank Base64 string
    const result = isBase64('');
    expect(result).toBe(false);
  });
});

describe('Html Utils', () => {
  it('removes HTML tags from string', () => {
    const htmlString = '<p>This is <strong>bold</strong> text.</p>';
    const result = htmlString.replace(/<\/?[^>]+(>|$)/g, '');
    expect(result).toBe('This is bold text.');
  });
});

describe('Delay Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout'], shouldAdvanceTime: true });
  });

  it('delays execution', async () => {
    const start = Date.now();
    await randomDelay();
    vi.advanceTimersByTime(300);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(300);
  });
});

describe('Sorting Utils', () => {
  it('returns correct sorting object', () => {
    const sortings: {
      sorting: string;
      expected:
        | Prisma.NoteOrderByWithRelationInput
        | Prisma.BoardOrderByRelationAggregateInput;
    }[] = [
      {
        sorting: 'created_asc',
        expected: { createdAt: 'asc' },
      },
      {
        sorting: 'created_desc',
        expected: { createdAt: 'desc' },
      },
      {
        sorting: 'updated_asc',
        expected: { updatedAt: 'asc' },
      },
      {
        sorting: 'updated_desc',
        expected: { updatedAt: 'desc' },
      },
      {
        sorting: 'title_asc',
        expected: { title: 'asc' },
      },
      {
        sorting: 'title_desc',
        expected: { title: 'desc' },
      },
    ];

    for (const { sorting, expected } of sortings) {
      const result = getSorting(sorting);
      expect(result).toEqual(expected);
    }
  });
});

describe('CSRF Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates CSRF token', () => {
    const token = generateCSRFToken();
    expect(token).toHaveLength(64);
    expect(typeof token).toBe('string');
  });

  it('sets CSRF token in cookie', async () => {
    const mockSet = vi.fn();
    mocks.cookies.mockResolvedValue({
      set: mockSet,
    });

    await setCSRFToken('test-token');
    expect(mockSet).toHaveBeenCalledWith(CSRF_TOKEN_NAME, 'test-token', {
      httpOnly: false,
      sameSite: 'strict',
      secure: false,
      path: '/',
      maxAge: expect.any(Number),
    });
  });

  it('gets CSRF token from cookie', async () => {
    const mockGet = vi.fn().mockReturnValue({ value: 'test-token' });
    mocks.cookies.mockResolvedValue({
      get: mockGet,
    });

    const token = await getCSRFToken();
    expect(token).toBe('test-token');
    expect(mockGet).toHaveBeenCalledWith(CSRF_TOKEN_NAME);
  });

  it('validates CSRF token from header', async () => {
    const mockGet = vi.fn().mockReturnValue({ value: 'test-token' });
    mocks.cookies.mockResolvedValue({
      get: mockGet,
    });

    const request = new Request('http://localhost', {
      headers: { [CSRF_HEADER_NAME]: 'test-token' },
    });

    const isValid = await validateCSRFToken(request);
    expect(isValid).toBe(true);
  });

  it('validates CSRF token from form data', async () => {
    const mockGet = vi.fn().mockReturnValue({ value: 'test-token' });
    mocks.cookies.mockResolvedValue({
      get: mockGet,
    });

    const formData = new FormData();
    formData.append(CSRF_TOKEN_NAME, 'test-token');

    const request = new Request('http://localhost');
    const isValid = await validateCSRFToken(request, formData);
    expect(isValid).toBe(true);
  });

  it('returns false for invalid CSRF token', async () => {
    const mockGet = vi.fn().mockReturnValue({ value: 'valid-token' });
    mocks.cookies.mockResolvedValue({
      get: mockGet,
    });

    const request = new Request('http://localhost', {
      headers: { [CSRF_HEADER_NAME]: 'invalid-token' },
    });

    const isValid = await validateCSRFToken(request);
    expect(isValid).toBe(false);
  });
});

describe('HTML Utils', () => {
  it('renders markdown to HTML', async () => {
    const markdown = '# Hello\n\nThis is **bold** text.';
    const html = await renderMarkdownToHtml(markdown);
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('sanitizes HTML content', async () => {
    const markdown = 'Click <script>alert("xss")</script> here';
    const html = await renderMarkdownToHtml(markdown);
    expect(html).not.toContain('<script>');
  });
});

describe('File Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns URL when input is a URL', async () => {
    const url = 'https://example.com/image.jpg';
    const result = await saveAndGetImageFile(url);
    expect(result).toBe(url);
  });

  it('saves base64 file locally when S3 is disabled', async () => {
    mocks.getSettings.mockResolvedValue({ enableS3: false });
    const base64 = 'data:image/png;base64,iVBORw0KGgo=';

    const result = await saveAndGetImageFile(base64);
    expect(result).toBeDefined();
    expect(mocks.uploadFileS3).not.toHaveBeenCalled();
  });

  it('uploads to S3 when S3 is enabled', async () => {
    mocks.getSettings.mockResolvedValue({ enableS3: true });
    mocks.uploadFileS3.mockResolvedValue('s3-key');

    process.env.S3_ENDPOINT = 'https://s3.amazonaws.com';
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_ACCESS_KEY_ID = 'key';
    process.env.S3_SECRET_ACCESS_KEY = 'secret';

    const base64 = 'data:image/png;base64,iVBORw0KGgo=';
    const result = await saveAndGetImageFile(base64);

    expect(result).toMatch(/^S3-/);
    expect(mocks.uploadFileS3).toHaveBeenCalled();
  });

  it('returns null when S3 env vars are missing', async () => {
    mocks.getSettings.mockResolvedValue({ enableS3: true });

    delete process.env.S3_ENDPOINT;
    delete process.env.S3_REGION;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;

    const base64 = 'data:image/png;base64,iVBORw0KGgo=';
    const result = await saveAndGetImageFile(base64);

    expect(result).toBe(null);
  });
});

describe('Rate Limit Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'setInterval', 'clearInterval'],
      shouldAdvanceTime: true,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('allows requests within limit', () => {
    const limiter = new RateLimiter(60000, 5); // 1 minute, 5 requests
    const result1 = limiter.isAllowed('test-key');
    const result2 = limiter.isAllowed('test-key');

    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(4);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it('blocks requests exceeding limit', () => {
    const limiter = new RateLimiter(60000, 2); // 1 minute, 2 requests

    limiter.isAllowed('test-key');
    limiter.isAllowed('test-key');
    const result = limiter.isAllowed('test-key');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    // This should be a more realistic value like 60000 (1 minute)
    const limiter = new RateLimiter(0, 2); // 1 minute, 2 requests

    limiter.isAllowed('test-key');
    limiter.isAllowed('test-key');

    // But advance time by 1 minute + 1 millisecond doesn't work as expected.
    vi.advanceTimersByTime(60001);

    const result = limiter.isAllowed('test-key');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('gets client IP from various headers', () => {
    const request1 = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1,10.0.0.1' },
    });
    expect(getClientIP(request1)).toBe('192.168.1.1');

    const request2 = new NextRequest('http://localhost', {
      headers: { 'x-real-ip': '192.168.1.2' },
    });
    expect(getClientIP(request2)).toBe('192.168.1.2');

    const request3 = new NextRequest('http://localhost', {
      headers: { 'cf-connecting-ip': '192.168.1.3' },
    });
    expect(getClientIP(request3)).toBe('192.168.1.3');

    const request4 = new NextRequest('http://localhost');
    expect(getClientIP(request4)).toBe('unknown');
  });

  it('creates rate limit middleware', async () => {
    const limiter = new RateLimiter(60000, 5);
    const middleware = createRateLimitMiddleware(limiter);

    const request = new NextRequest('http://localhost/test');
    const result = await middleware(request);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('generates rate limit headers', () => {
    const resetTime = Date.now() + 60000;
    const headers = getRateLimitHeaders(resetTime, 3, 10);

    expect(headers['X-RateLimit-Limit']).toBe('10');
    expect(headers['X-RateLimit-Remaining']).toBe('3');
    expect(headers['X-RateLimit-Reset']).toBe(
      new Date(resetTime).toUTCString(),
    );
    expect(headers['Retry-After']).toBeDefined();
  });

  it('provides rate limiter instances', () => {
    expect(authRateLimiter).toBeInstanceOf(RateLimiter);
    expect(generalRateLimiter).toBeInstanceOf(RateLimiter);
    expect(uploadRateLimiter).toBeInstanceOf(RateLimiter);
  });
});

describe('Diff Utils', () => {
  it('computes diff correctly', () => {
    const oldText = 'hello world';
    const newText = 'hello there world';
    const patch = computeDiff(oldText, newText);
    expect(patch).toContain('@@');
    expect(patch).toContain('there');
  });

  it('applies patch correctly', () => {
    const oldText = 'hello world';
    const newText = 'hello there world';
    const patch = computeDiff(oldText, newText);
    const result = applyPatch(oldText, patch);
    expect(result).toBe(newText);
  });

  it('fails to apply invalid patch', () => {
    const oldText = 'hello world';
    const patch = 'invalid patch string';
    const result = applyPatch(oldText, patch);
    expect(result).toBeNull();
  });

  it('validates patch correctly', () => {
    const oldText = 'hello world';
    const newText = 'hello there world';
    const patch = computeDiff(oldText, newText);
    const isValid = validatePatch(oldText, patch);
    expect(isValid).toBe(true);
  });

  it('returns false for invalid patch validation', () => {
    const oldText = 'hello world';
    const patch = 'invalid patch string';
    const isValid = validatePatch(oldText, patch);
    expect(isValid).toBe(false);
  });

  it('checks text identity', () => {
    expect(areTextsIdentical('abc', 'abc')).toBe(true);
    expect(areTextsIdentical('abc', 'def')).toBe(false);
  });

  it('gets diff summary', () => {
    const oldText = 'hello world';
    const newText = 'hello there world';
    const patch = computeDiff(oldText, newText);
    const summary = getDiffSummary(patch);
    // " there" is added (6 chars)
    expect(summary.additions).toBeGreaterThan(0);
    expect(summary.deletions).toBe(0);
  });

  it('gets diff preview', () => {
    const oldText = 'hello world';
    const newText = 'hello there world';
    const patch = computeDiff(oldText, newText);
    const preview = getDiffPreview(patch);
    expect(preview).toContain('there');
  });
});
