import crypto from 'crypto';
import querystring from 'querystring';
import { SECURITY_CONFIG } from '@/config/security';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Converts a given buffer to a Base32 encoded string.
 */
function toBase32(buffer: Buffer) {
  let bits = 0,
    value = 0,
    output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Decodes a Base32-encoded string into a Buffer.
 */
export function fromBase32(base32: string): Buffer {
  let bits = 0,
    value = 0;
  const output: number[] = [];

  for (let i = 0; i < base32.length; i++) {
    const index = BASE32_ALPHABET.indexOf(base32[i].toUpperCase());
    if (index === -1) continue; // Ignore invalid characters

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Generates a TOTP code based on the secret key and time.
 */
export function generateTOTP(
  secret: string,
  timeStep: number = SECURITY_CONFIG.MFA.TIME_STEP,
  digits: number = SECURITY_CONFIG.MFA.DIGITS
): string {
  const key = fromBase32(secret);
  const buffer = Buffer.alloc(8);
  let counter = Math.floor(Date.now() / 1000 / timeStep);

  for (let i = 7; i >= 0; i--) {
    buffer[i] = counter & 0xff;
    counter >>= 8;
  }

  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** digits).toString().padStart(digits, '0');
}

/**
 * Validates a user-provided OTP.
 */
export function validateTOTP(
  secret: string,
  otp: string,
  timeStep: number = SECURITY_CONFIG.MFA.TIME_STEP,
  window: number = SECURITY_CONFIG.MFA.WINDOW
): boolean {
  const currentTime = Math.floor(Date.now() / 1000 / timeStep);
  
  for (let i = -window; i <= window; i++) {
    const adjustedTime = currentTime + i;
    if (generateTOTPAtTime(secret, adjustedTime, timeStep) === otp) {
      return true;
    }
  }
  return false;
}

/**
 * Generates a TOTP code for a specific time counter.
 */
function generateTOTPAtTime(
  secret: string,
  counter: number,
  timeStep: number = 30,
  digits: number = 6
): string {
  const key = fromBase32(secret);
  const buffer = Buffer.alloc(8);
  
  for (let i = 7; i >= 0; i--) {
    buffer[i] = counter & 0xff;
    counter >>= 8;
  }

  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** digits).toString().padStart(digits, '0');
}

/**
 * Generates a TOTP URL for use with authenticator apps.
 */
export function generateTOTPUrl(
  secret: string,
  accountName: string,
  issuer: string
): string {
  const params = querystring.stringify({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: SECURITY_CONFIG.MFA.DIGITS.toString(),
    period: SECURITY_CONFIG.MFA.TIME_STEP.toString(),
  });

  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    accountName
  )}?${params}`;
}

/**
 * Generates a Time-based One-Time Password (TOTP) secret.
 */
export function generateTOTPSecret(length: number = 20) {
  const buffer = crypto.randomBytes(length);
  return toBase32(buffer);
}
