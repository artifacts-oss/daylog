import {
  Board,
  ChangeComment,
  Note,
  NoteChange,
  Session,
  User,
} from '@/prisma/generated/client';
import { prismaMock } from '@/prisma/singleton';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  disableEncryption,
  enableEncryption,
  recoverEncryptedData,
  updatePassword,
  wipeEncryptedData,
} from './actions';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  validateSessionToken: vi.fn(),
  deleteSessionTokenCookie: vi.fn(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  revalidatePath: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue('hashed'),
  verifyPassword: vi.fn().mockResolvedValue(true),
  encodeHex: vi.fn().mockReturnValue('session-id'),
  deriveEncryptionKey: vi.fn().mockResolvedValue(Buffer.from('mockkey')),
  reEncryptAll: vi.fn(),
  decryptField: vi.fn((value: string) =>
    value.startsWith('enc:') ? value.slice(4) : value,
  ),
  decryptBoardFields: vi.fn().mockImplementation((b: Board) => b),
  decryptNoteFields: vi.fn().mockImplementation((n: Note) => n),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
  permanentRedirect: mocks.permanentRedirect,
}));

vi.mock('@/app/login/lib/cookies', () => ({
  deleteSessionTokenCookie: mocks.deleteSessionTokenCookie,
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
  validateSessionToken: mocks.validateSessionToken,
}));

vi.mock('@/utils/crypto', () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
  encodeHex: mocks.encodeHex,
}));

vi.mock('@/utils/encryption', () => ({
  generateEncryptionSalt: vi.fn().mockReturnValue('mocksalt'),
  deriveEncryptionKey: mocks.deriveEncryptionKey,
  wrapKeyWithMaster: vi.fn().mockReturnValue('wrappedkey'),
  reEncryptAll: mocks.reEncryptAll,
  isEncrypted: vi.fn(
    (value: string | null) => !!value && value.startsWith('enc:'),
  ),
  encryptField: vi.fn((value: string) => `enc:${value}`),
  decryptField: mocks.decryptField,
  encryptBoardFields: vi.fn().mockImplementation((b: Board) => b),
  encryptNoteFields: vi.fn().mockImplementation((n: Note) => n),
  decryptBoardFields: mocks.decryptBoardFields,
  decryptNoteFields: mocks.decryptNoteFields,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue({ value: 'mockToken' }),
  }),
}));

const user = { id: 1, role: 'user' };

function formDataFrom(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.encodeHex.mockReturnValue('session-id');
  mocks.getCurrentSession.mockResolvedValue({ user });
});

describe('disableEncryption', () => {
  it('decrypts all content and disables encryption', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      password: 'hashed',
      encryptionSalt: 'salt',
    } as User);
    prismaMock.board.findMany.mockResolvedValue([
      { id: 10, title: 'enc:board', description: null } as Board,
    ]);
    prismaMock.note.findMany.mockResolvedValue([
      { id: 20, title: 'enc:note', content: 'enc:content' } as Note,
    ]);
    prismaMock.noteChange.findMany.mockResolvedValue([
      { id: 30, diffPatch: 'enc:patch', previousContent: 'enc:previous' } as NoteChange,
    ]);
    prismaMock.changeComment.findMany.mockResolvedValue([
      { id: 40, content: 'enc:comment' } as ChangeComment,
    ]);
    prismaMock.$transaction.mockResolvedValue([]);

    const result = await disableEncryption(
      undefined,
      formDataFrom({ password: 'secret' }),
    );

    expect(result).toEqual({
      success: true,
      message: 'Encryption disabled successfully.',
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.noteChange.update).toHaveBeenCalledWith({
      where: { id: 30 },
      data: { diffPatch: 'patch', previousContent: 'previous' },
    });
    expect(prismaMock.changeComment.update).toHaveBeenCalledWith({
      where: { id: 40 },
      data: { content: 'comment' },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/profile/1');
  });

  it('rejects an invalid form', async () => {
    const result = await disableEncryption(undefined, formDataFrom({}));

    expect(result?.success).toBe(false);
    expect(result?.errors).toBeDefined();
  });

  it('rejects an unauthenticated user', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    const result = await disableEncryption(
      undefined,
      formDataFrom({ password: 'secret' }),
    );

    expect(result).toEqual({ message: 'Unauthorized', success: false });
  });

  it('rejects an incorrect password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 1 } as User);
    mocks.verifyPassword.mockResolvedValue(false);

    const result = await disableEncryption(
      undefined,
      formDataFrom({ password: 'wrong' }),
    );

    expect(result).toEqual({
      message: 'Current password is incorrect.',
      success: false,
    });
  });

  it('fails when no encryption salt is stored', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      encryptionSalt: null,
    } as User);

    const result = await disableEncryption(
      undefined,
      formDataFrom({ password: 'secret' }),
    );

    expect(result).toEqual({
      message: 'No encryption key found.',
      success: false,
    });
  });
});

describe('enableEncryption', () => {
  it('encrypts all content and stores the session key', async () => {
    vi.stubEnv('ENCRYPTION_MASTER_KEY', 'master-key');
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      password: 'hashed',
      encryptionSalt: null,
    } as User);
    prismaMock.board.findMany.mockResolvedValue([
      { id: 10, title: 'Board', description: 'Desc' } as Board,
    ]);
    prismaMock.note.findMany.mockResolvedValue([
      { id: 20, title: 'Note', content: 'Content' } as Note,
    ]);
    prismaMock.noteChange.findMany.mockResolvedValue([
      { id: 30, diffPatch: 'patch', previousContent: 'previous' } as NoteChange,
    ]);
    prismaMock.changeComment.findMany.mockResolvedValue([
      { id: 40, content: 'comment' } as ChangeComment,
    ]);
    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.session.update.mockResolvedValue({} as Session);
    prismaMock.session.updateMany.mockResolvedValue({ count: 0 });

    const result = await enableEncryption(
      undefined,
      formDataFrom({ password: 'secret' }),
    );

    vi.unstubAllEnvs();

    expect(result).toEqual({
      success: true,
      message: 'Encryption enabled successfully.',
    });
    expect(prismaMock.noteChange.update).toHaveBeenCalledWith({
      where: { id: 30 },
      data: { diffPatch: 'enc:patch', previousContent: 'enc:previous' },
    });
    expect(prismaMock.changeComment.update).toHaveBeenCalledWith({
      where: { id: 40 },
      data: { content: 'enc:comment' },
    });
    expect(prismaMock.session.update).toHaveBeenCalledWith({
      where: { id: 'session-id' },
      data: { encryptedKey: 'wrappedkey' },
    });
    expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 1, id: { not: 'session-id' } },
      data: { encryptedKey: null },
    });
  });
});

describe('recoverEncryptedData', () => {
  it('decrypts all data to plaintext and disables encryption lock', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      encryptionSalt: 'salt',
    } as User);
    prismaMock.board.findMany.mockResolvedValue([
      { id: 10, title: 'enc:boardtitle', description: 'enc:desc' } as Board,
    ]);
    prismaMock.note.findMany.mockResolvedValue([
      { id: 20, title: 'enc:notetitle', content: 'enc:content' } as Note,
    ]);
    prismaMock.noteChange.findMany.mockResolvedValue([]);
    prismaMock.changeComment.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.user.update.mockResolvedValue({} as User);

    const result = await recoverEncryptedData(
      undefined,
      formDataFrom({ oldPassword: 'old' }),
    );

    expect(result).toEqual({
      success: true,
      message: 'Data recovered successfully. You can now re-enable encryption.',
    });
    expect(mocks.reEncryptAll).not.toHaveBeenCalled();
    expect(prismaMock.board.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { title: 'boardtitle', description: 'desc' },
    });
    expect(prismaMock.note.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { title: 'notetitle', content: 'content' },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { encryptedDataLocked: false },
    });
  });

  it('fails when the old password cannot decrypt the data', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      encryptionSalt: 'salt',
    } as User);
    prismaMock.board.findMany.mockResolvedValue([
      { id: 10, title: 'enc:boardtitle' } as Board,
    ]);
    prismaMock.note.findMany.mockResolvedValue([]);
    prismaMock.noteChange.findMany.mockResolvedValue([]);
    prismaMock.changeComment.findMany.mockResolvedValue([]);
    mocks.decryptField.mockImplementationOnce(() => {
      throw new Error('bad key');
    });

    const result = await recoverEncryptedData(
      undefined,
      formDataFrom({ oldPassword: 'wrong' }),
    );

    expect(result).toEqual({
      message: 'Old password is incorrect or data cannot be decrypted.',
      success: false,
    });
    expect(mocks.reEncryptAll).not.toHaveBeenCalled();
  });

  it('fails when no encryption salt is stored', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      encryptionSalt: null,
    } as User);

    const result = await recoverEncryptedData(
      undefined,
      formDataFrom({ oldPassword: 'old' }),
    );

    expect(result).toEqual({
      message: 'No encryption key found.',
      success: false,
    });
  });

  it('rejects an invalid form', async () => {
    const result = await recoverEncryptedData(
      undefined,
      formDataFrom({ oldPassword: '' }),
    );

    expect(result?.success).toBe(false);
    expect(result?.errors).toBeDefined();
  });

  it('rejects an unauthenticated user', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    const result = await recoverEncryptedData(
      undefined,
      formDataFrom({ oldPassword: 'old' }),
    );

    expect(result).toEqual({ message: 'Unauthorized', success: false });
  });
});

describe('wipeEncryptedData', () => {
  it('replaces encrypted content and disables encryption', async () => {
    prismaMock.board.findMany.mockResolvedValue([
      { id: 10, title: 'enc:board', description: 'plain desc' } as Board,
    ]);
    prismaMock.note.findMany.mockResolvedValue([
      { id: 20, title: 'plain note', content: 'enc:content' } as Note,
    ]);
    prismaMock.noteChange.findMany.mockResolvedValue([
      { id: 30, diffPatch: 'enc:patch', previousContent: 'enc:previous' } as NoteChange,
      { id: 31, diffPatch: 'plain patch', previousContent: null } as NoteChange,
    ]);
    prismaMock.changeComment.findMany.mockResolvedValue([
      { id: 40, content: 'enc:comment' } as ChangeComment,
      { id: 41, content: 'plain comment' } as ChangeComment,
    ]);
    prismaMock.$transaction.mockResolvedValue([]);

    const result = await wipeEncryptedData(undefined, formDataFrom({}));

    expect(result).toEqual({
      success: true,
      message: 'Encrypted data wiped successfully.',
    });
    expect(prismaMock.board.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { title: '[content removed]', description: 'plain desc' },
    });
    expect(prismaMock.note.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { title: 'plain note', content: null },
    });
    expect(prismaMock.noteChange.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [30] } },
    });
    expect(prismaMock.changeComment.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [40] } },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/profile/1');
  });

  it('rejects an unauthenticated user', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    const result = await wipeEncryptedData(undefined, formDataFrom({}));

    expect(result).toEqual({ message: 'Unauthorized', success: false });
  });

  it('reports an error when the wipe fails', async () => {
    prismaMock.board.findMany.mockRejectedValue(new Error('db down'));

    const result = await wipeEncryptedData(undefined, formDataFrom({}));

    expect(result).toEqual({
      message: 'An error occurred while wiping data.',
      success: false,
    });
  });
});

describe('updatePassword encryption handling', () => {
  it('re-encrypts data when a user with encryption changes their password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      password: 'hashed',
      encryptionEnabled: true,
      encryptionSalt: 'salt',
    } as User);
    prismaMock.user.update.mockResolvedValue({} as User);
    prismaMock.session.update.mockResolvedValue({} as Session);
    prismaMock.session.updateMany.mockResolvedValue({ count: 0 });

    const result = await updatePassword(
      undefined,
      formDataFrom({
        id: '1',
        current: 'old-pass',
        password: 'new-pass',
        confirm: 'new-pass',
      }),
    );

    expect(result).toEqual({
      success: true,
      message: 'Password updated successfully.',
    });
    expect(mocks.reEncryptAll).toHaveBeenCalledWith(
      1,
      expect.any(Buffer),
      expect.any(Buffer),
    );
    expect(prismaMock.session.update).toHaveBeenCalledWith({
      where: { id: 'session-id' },
      data: { encryptedKey: 'wrappedkey' },
    });
  });

  it('locks encrypted data when an admin resets another user password', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 99, role: 'admin' },
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      password: 'hashed',
      encryptionEnabled: true,
    } as User);
    prismaMock.user.update.mockResolvedValue({} as User);
    prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });

    const result = await updatePassword(
      undefined,
      formDataFrom({ id: '1', password: 'new-pass', confirm: 'new-pass' }),
    );

    expect(result).toEqual({
      success: true,
      message: 'Password updated successfully.',
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { encryptedDataLocked: true, encryptionEnabled: false },
    });
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
  });
});
