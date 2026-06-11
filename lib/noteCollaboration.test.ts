import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadNoteRoomContent } from './noteCollaboration';

vi.mock('./redis', () => ({ redis: {}, createSubscriber: vi.fn() }));
import {
  deriveEncryptionKey,
  encryptField,
  generateEncryptionSalt,
  wrapKeyWithMaster,
} from '@/utils/encryption';

// Provide a 64-char hex master key for tests
process.env.ENCRYPTION_MASTER_KEY = 'a'.repeat(64);

vi.mock('@/prisma/client', () => ({
  prisma: {
    note: {
      findUnique: vi.fn(),
    },
    share: {
      findFirst: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
    },
  },
}));

describe('loadNoteRoomContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns plaintext content unchanged', async () => {
    const { prisma } = await import('@/prisma/client');
    vi.mocked(prisma.note.findUnique).mockResolvedValue({
      content: 'plain content',
    } as never);

    expect(await loadNoteRoomContent(1, 'token')).toBe('plain content');
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it('returns empty string when the note has no content', async () => {
    const { prisma } = await import('@/prisma/client');
    vi.mocked(prisma.note.findUnique).mockResolvedValue(null as never);

    expect(await loadNoteRoomContent(1, 'token')).toBe('');
  });

  it('decrypts encrypted content with the session key', async () => {
    const { prisma } = await import('@/prisma/client');
    const key = await deriveEncryptionKey('pw', generateEncryptionSalt());
    const encrypted = encryptField('secret note body', key);

    vi.mocked(prisma.note.findUnique).mockResolvedValue({
      content: encrypted,
    } as never);
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      encryptedKey: wrapKeyWithMaster(key),
    } as never);

    expect(await loadNoteRoomContent(1, 'token')).toBe('secret note body');
  });

  it('falls back to the share snapshot when no session key is available', async () => {
    const { prisma } = await import('@/prisma/client');
    const key = await deriveEncryptionKey('pw', generateEncryptionSalt());
    const encrypted = encryptField('secret note body', key);

    vi.mocked(prisma.note.findUnique).mockResolvedValue({
      content: encrypted,
    } as never);
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      encryptedKey: null,
    } as never);
    vi.mocked(prisma.share.findFirst).mockResolvedValue({
      snapshot: JSON.stringify({ title: 'T', content: 'snapshot body' }),
    } as never);

    expect(await loadNoteRoomContent(1, 'token')).toBe('snapshot body');
  });

  it('returns the raw ciphertext when neither key nor snapshot exist', async () => {
    const { prisma } = await import('@/prisma/client');
    const key = await deriveEncryptionKey('pw', generateEncryptionSalt());
    const encrypted = encryptField('secret note body', key);

    vi.mocked(prisma.note.findUnique).mockResolvedValue({
      content: encrypted,
    } as never);
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.share.findFirst).mockResolvedValue(null as never);

    expect(await loadNoteRoomContent(1, undefined)).toBe(encrypted);
  });
});
