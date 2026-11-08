import { Attachment, Board, Note, Picture, Share } from '@/prisma/generated/client';
import { prismaMock } from '@/prisma/singleton';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canAccessFile,
  findAttachment,
  isImageMimeType,
  sanitizeDispositionFilename,
} from './fileAccess';

const REF = 'files/report.pdf';

function noOwnership() {
  prismaMock.board.findFirst.mockResolvedValue(null);
  prismaMock.picture.findFirst.mockResolvedValue(null);
  prismaMock.attachment.findFirst.mockResolvedValue(null);
  prismaMock.note.findMany.mockResolvedValue([]);
  prismaMock.board.findMany.mockResolvedValue([]);
  prismaMock.share.findFirst.mockResolvedValue(null);
}

describe('canAccessFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noOwnership();
  });

  it('grants access when the user owns a board referencing the file', async () => {
    prismaMock.board.findFirst.mockResolvedValue({ id: 1 } as Board);

    expect(await canAccessFile(1, REF)).toBe(true);
  });

  it('grants access when the user owns the picture', async () => {
    prismaMock.picture.findFirst.mockResolvedValue({ id: 1 } as Picture);

    expect(await canAccessFile(1, REF)).toBe(true);
  });

  it('grants access when the user owns the attachment', async () => {
    prismaMock.attachment.findFirst.mockResolvedValue({ id: 1 } as Attachment);

    expect(await canAccessFile(1, REF)).toBe(true);
  });

  it('denies access when nothing references the file', async () => {
    expect(await canAccessFile(1, REF)).toBe(false);
    expect(prismaMock.share.findFirst).not.toHaveBeenCalled();
  });

  it('grants access to a SPECIFIC share recipient of the note', async () => {
    prismaMock.note.findMany.mockResolvedValue([{ id: 7 }] as Note[]);
    prismaMock.share.findFirst.mockResolvedValue({ id: 1 } as unknown as Share);

    expect(await canAccessFile(2, REF)).toBe(true);
    expect(prismaMock.share.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scope: 'SPECIFIC',
          recipients: { some: { userId: 2 } },
        }),
      }),
    );
  });

  it('denies access when the file is referenced but not shared with the user', async () => {
    prismaMock.note.findMany.mockResolvedValue([{ id: 7 }] as Note[]);
    prismaMock.share.findFirst.mockResolvedValue(null);

    expect(await canAccessFile(2, REF)).toBe(false);
  });
});

describe('findAttachment', () => {
  it('looks up an attachment by its file reference', async () => {
    vi.clearAllMocks();
    const row = { id: 3, fileUrl: REF } as Attachment;
    prismaMock.attachment.findFirst.mockResolvedValue(row);

    expect(await findAttachment(REF)).toBe(row);
    expect(prismaMock.attachment.findFirst).toHaveBeenCalledWith({
      where: { fileUrl: REF },
    });
  });
});

describe('isImageMimeType', () => {
  it('is true for image types', () => {
    expect(isImageMimeType('image/png')).toBe(true);
  });

  it('is false for non-image types', () => {
    expect(isImageMimeType('application/pdf')).toBe(false);
  });
});

describe('sanitizeDispositionFilename', () => {
  it('replaces path separators with underscores', () => {
    expect(sanitizeDispositionFilename('a/b\\c.txt')).toBe('a_b_c.txt');
  });

  it('strips characters outside the safe set', () => {
    expect(sanitizeDispositionFilename('rép"ort;(1).pdf')).toBe('rport1.pdf');
  });

  it('keeps letters, digits, dots, hyphens and spaces', () => {
    expect(sanitizeDispositionFilename('My File-2.tar.gz')).toBe('My File-2.tar.gz');
  });
});
