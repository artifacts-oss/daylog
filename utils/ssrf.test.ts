import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertSafeRemoteUrl } from './ssrf';

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
}));

vi.mock('dns/promises', () => ({
  default: { lookup: mocks.lookup },
  lookup: mocks.lookup,
}));

describe('assertSafeRemoteUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-http(s) protocols', async () => {
    await expect(assertSafeRemoteUrl('file:///etc/passwd')).rejects.toThrow(
      'Only http(s) URLs are allowed',
    );
    await expect(assertSafeRemoteUrl('ftp://example.com')).rejects.toThrow(
      'Only http(s) URLs are allowed',
    );
  });

  it('rejects malformed URLs', async () => {
    await expect(assertSafeRemoteUrl('not a url')).rejects.toThrow(
      'Invalid URL',
    );
  });

  it.each([
    'http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.5/',
    'http://192.168.1.1/',
    'http://172.16.0.1/',
    'http://100.64.0.1/',
    'http://0.0.0.0/',
    'http://[::1]/',
  ])('rejects internal IP literal %s', async (url) => {
    await expect(assertSafeRemoteUrl(url)).rejects.toThrow(
      'Refusing to fetch an internal address',
    );
    expect(mocks.lookup).not.toHaveBeenCalled();
  });

  it('allows a public IP literal', async () => {
    await expect(assertSafeRemoteUrl('https://1.1.1.1/')).resolves.toBeUndefined();
    expect(mocks.lookup).not.toHaveBeenCalled();
  });

  it('allows a hostname that resolves to a public address', async () => {
    mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    await expect(
      assertSafeRemoteUrl('https://images.unsplash.com/photo.jpg'),
    ).resolves.toBeUndefined();
    expect(mocks.lookup).toHaveBeenCalledWith('images.unsplash.com', {
      all: true,
    });
  });

  it('rejects a hostname that resolves to an internal address (DNS rebinding)', async () => {
    mocks.lookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
    await expect(
      assertSafeRemoteUrl('https://evil.example.com/'),
    ).rejects.toThrow('Refusing to fetch an internal address');
  });

  it('rejects when any resolved address is internal', async () => {
    mocks.lookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ]);
    await expect(
      assertSafeRemoteUrl('https://mixed.example.com/'),
    ).rejects.toThrow('Refusing to fetch an internal address');
  });
});
