import { createCipheriv, createDecipheriv, pbkdf2, randomBytes } from 'crypto';
import { promisify } from 'util';
import { prisma } from '@/prisma/client';

const pbkdf2Async = promisify(pbkdf2);

const KDF_ITERATIONS = 100_000;
const KDF_KEYLEN = 32;
const KDF_DIGEST = 'sha256';
const ENC_ALGO = 'aes-256-gcm';
const ENC_PREFIX = 'enc:';

function getMasterKeyBuffer(): Buffer {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  if (!hex) throw new Error('ENCRYPTION_MASTER_KEY env var is not set');
  // Require a full-entropy 256-bit key. Padding a short key with zeros or
  // truncating a long one silently weakens the master key (CWE-326).
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY must be exactly 64 hexadecimal characters (32 bytes)',
    );
  }
  return Buffer.from(hex, 'hex');
}

export function generateEncryptionSalt(): string {
  return randomBytes(32).toString('hex');
}

export async function deriveEncryptionKey(
  password: string,
  saltHex: string,
): Promise<Buffer> {
  const salt = Buffer.from(saltHex, 'hex');
  return pbkdf2Async(password, salt, KDF_ITERATIONS, KDF_KEYLEN, KDF_DIGEST);
}

export function wrapKeyWithMaster(keyBuffer: Buffer): string {
  const master = getMasterKeyBuffer();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENC_ALGO, master, iv);
  const ciphertext = Buffer.concat([cipher.update(keyBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${ciphertext.toString('hex')}:${authTag.toString('hex')}`;
}

export function unwrapKeyWithMaster(wrapped: string): Buffer {
  const master = getMasterKeyBuffer();
  const parts = wrapped.split(':');
  if (parts.length !== 3) throw new Error('Invalid wrapped key format');
  const [ivHex, ciphertextHex, authTagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ENC_ALGO, master, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptField(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENC_ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('hex')}:${ciphertext.toString('hex')}:${authTag.toString('hex')}`;
}

export function decryptField(value: string, key: Buffer): string {
  if (!value.startsWith(ENC_PREFIX)) return value;
  const parts = value.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted field format');
  const [ivHex, ciphertextHex, authTagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ENC_ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

export function encryptBoardFields<T extends { title: string; description?: string | null }>(
  board: T,
  key: Buffer,
): T {
  return {
    ...board,
    title: encryptField(board.title, key),
    description: board.description != null ? encryptField(board.description, key) : board.description,
  };
}

export function decryptBoardFields<T extends { title: string; description?: string | null }>(
  board: T,
  key: Buffer,
): T {
  let title = board.title;
  let description = board.description;
  try {
    title = decryptField(board.title, key);
  } catch {
    title = '[decryption error]';
  }
  if (description != null) {
    try {
      description = decryptField(description, key);
    } catch {
      description = '[decryption error]';
    }
  }
  return { ...board, title, description };
}

export function encryptNoteFields<T extends { title: string; content?: string | null }>(
  note: T,
  key: Buffer,
): T {
  return {
    ...note,
    title: encryptField(note.title, key),
    content: note.content != null ? encryptField(note.content, key) : note.content,
  };
}

export function decryptNoteFields<T extends { title: string; content?: string | null }>(
  note: T,
  key: Buffer,
): T {
  let title = note.title;
  let content = note.content;
  try {
    title = decryptField(note.title, key);
  } catch {
    title = '[decryption error]';
  }
  if (content != null) {
    try {
      content = decryptField(content, key);
    } catch {
      content = '[decryption error]';
    }
  }
  return { ...note, title, content };
}

export async function getSessionEncryptionKey(
  sessionId: string,
): Promise<Buffer | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { encryptedKey: true },
  });
  if (!session?.encryptedKey) return null;
  try {
    return unwrapKeyWithMaster(session.encryptedKey);
  } catch {
    return null;
  }
}

export async function reEncryptAll(
  userId: number,
  oldKey: Buffer,
  newKey: Buffer,
): Promise<void> {
  const boards = await prisma.board.findMany({
    where: { userId },
    select: { id: true, title: true, description: true },
  });

  const notes = await prisma.note.findMany({
    where: { boards: { userId } },
    select: { id: true, title: true, content: true },
  });

  const noteIds = notes.map((n) => n.id);
  const noteChanges = await prisma.noteChange.findMany({
    where: { noteId: { in: noteIds } },
    select: { id: true, diffPatch: true, previousContent: true },
  });
  const changeComments = await prisma.changeComment.findMany({
    where: { change: { noteId: { in: noteIds } } },
    select: { id: true, content: true },
  });

  const reEncrypt = (value: string): string => {
    try {
      return encryptField(decryptField(value, oldKey), newKey);
    } catch {
      // leave as-is if decryption fails
      return value;
    }
  };

  await prisma.$transaction([
    ...boards.map((board) => {
      const title = reEncrypt(board.title);
      const description = board.description != null ? reEncrypt(board.description) : board.description;
      return prisma.board.update({
        where: { id: board.id },
        data: { title, description },
      });
    }),
    ...notes.map((note) => {
      const title = reEncrypt(note.title);
      const content = note.content != null ? reEncrypt(note.content) : note.content;
      return prisma.note.update({
        where: { id: note.id },
        data: { title, content },
      });
    }),
    ...noteChanges.map((nc) =>
      prisma.noteChange.update({
        where: { id: nc.id },
        data: {
          diffPatch: reEncrypt(nc.diffPatch),
          previousContent:
            nc.previousContent != null ? reEncrypt(nc.previousContent) : nc.previousContent,
        },
      }),
    ),
    ...changeComments.map((cc) =>
      prisma.changeComment.update({
        where: { id: cc.id },
        data: { content: reEncrypt(cc.content) },
      }),
    ),
  ]);
}
