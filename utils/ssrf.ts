import { lookup } from 'dns/promises';
import { isIP } from 'net';

function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
  ) {
    return true; // malformed → block
  }
  const [a, b] = parts;
  if (a === 0) return true; // "this" network
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isBlockedIP(ip: string): boolean {
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') return true; // unspecified / loopback
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (mapped) return isBlockedIPv4(mapped[1]);
    return false;
  }
  return isBlockedIPv4(ip);
}

/**
 * Guards against SSRF (CWE-918) by ensuring a URL is http(s) and does not
 * resolve to an internal, loopback, link-local or otherwise reserved address.
 * Throws when the URL is unsafe to fetch from the server.
 */
export async function assertSafeRemoteUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed');
  }

  // WHATWG URL keeps brackets around IPv6 literals (e.g. "[::1]"); strip them
  // so the address can be parsed and checked.
  const host = url.hostname.replace(/^\[|\]$/g, '');

  if (isIP(host)) {
    if (isBlockedIP(host)) {
      throw new Error('Refusing to fetch an internal address');
    }
    return;
  }

  const results = await lookup(host, { all: true });
  if (results.length === 0) {
    throw new Error('Could not resolve host');
  }
  for (const { address } of results) {
    if (isBlockedIP(address)) {
      throw new Error('Refusing to fetch an internal address');
    }
  }
}
