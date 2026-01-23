import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stringToColor } from './color';
import { encodeBase32, encodeHex, hashPassword } from './crypto';
import { createAndVerifyTransporter } from './email';
import { base64ToArrayBuffer, bytesToBase64, getImageUrlOrFile } from './image';
import { removeFile, saveBase64File } from './storage';
import { isBase64, isUrl, truncateWord } from './text';
import { generateTOTP, generateTOTPSecret, validateTOTP } from './totp';
import { randomDelay } from './delay';
import getSorting from './sorting';
import { Prisma } from '@/prisma/generated/client';

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  verify: vi.fn().mockImplementation((callback) => {
    callback(null, true);
  }),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mocks.createTransport.mockReturnValue({
      sendMail: mocks.sendMail,
      verify: mocks.verify,
    }),
  },
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
