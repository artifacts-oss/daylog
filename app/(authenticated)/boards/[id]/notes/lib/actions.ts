'use server';

import { getCurrentSession } from '@/app/login/lib/actions';
import { getCurrentSessionKey } from '@/app/(authenticated)/lib/encryptionKey';
import { prisma } from '@/prisma/client';
import { Note, Picture, Prisma } from '@/prisma/generated/client';
import { saveAndGetImageFile } from '@/utils/file';
import { removeFile } from '@/utils/storage';
import { isBase64, isUrl } from '@/utils/text';
import { encryptNoteFields, decryptNoteFields, decryptBoardFields, encryptField, decryptField } from '@/utils/encryption';

import fs from 'fs';
import { NoteWithBoards } from './types';
import getSorting from '@/utils/sorting';
import { revalidatePath } from 'next/cache';

export async function createNote(
  data: Prisma.NoteCreateInput,
  boardId: number,
): Promise<number | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  const key = user.encryptionEnabled ? await getCurrentSessionKey() : null;

  const note: Prisma.NoteCreateInput = {
    title: key ? encryptField(data.title as string, key) : data.title,
    content: data.content && key ? encryptField(data.content as string, key) : data.content,
    boards: { connect: { id: boardId, userId: user?.id } },
  };

  const record = await prisma.note.create({ data: { ...note } });
  return record.id;
}

export async function updateNote(note: Note): Promise<Note | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  // Allow update if user is owner OR has a canEdit share for this note
  const isOwner = !!(await prisma.note.findFirst({ where: { id: note.id, boards: { userId: user.id } } }));
  const editShare = !isOwner ? await prisma.share.findFirst({
    where: { entityType: 'NOTE', entityId: note.id, canEdit: true, scope: 'SPECIFIC', recipients: { some: { userId: user.id } } },
    select: { id: true, snapshot: true },
  }) : null;

  if (!isOwner && !editShare) return null;

  // Recipients save in plaintext to avoid corrupting the owner's encryption.
  // Owners encrypt normally with their own session key.
  const key = isOwner && user.encryptionEnabled ? await getCurrentSessionKey() : null;

  // Get the current note content before updating
  const currentNote = await prisma.note.findUnique({ where: { id: note.id } });

  // For diff: owner decrypts from DB; recipient reads from snapshot (already plaintext)
  const currentContentPlain = (() => {
    if (!currentNote?.content) return '';
    if (isOwner && key) return decryptField(currentNote.content, key);
    if (!isOwner && editShare?.snapshot) {
      try { return (JSON.parse(editShare.snapshot) as { content?: string }).content ?? currentNote.content; } catch { return currentNote.content; }
    }
    return currentNote.content;
  })();
  const newContentPlain = note.content ?? '';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, boards, boardsId, ...updateData } = note as NoteWithBoards;
  const dataToSave = key ? encryptNoteFields(updateData, key) : updateData;

  const updatedNote = await prisma.note.update({
    where: { id },
    data: { ...dataToSave },
  });

  // Track the change if content was modified
  if (currentNote && currentContentPlain !== newContentPlain) {
    const { computeDiff, areTextsIdentical } = await import('@/utils/diff');

    if (!areTextsIdentical(currentContentPlain, newContentPlain)) {
      const diffPatch = computeDiff(currentContentPlain, newContentPlain);
      const previousContentToStore = key ? encryptField(currentContentPlain, key) : currentContentPlain;

      await prisma.noteChange.create({
        data: {
          noteId: note.id,
          userId: user.id,
          diffPatch: key ? encryptField(diffPatch, key) : diffPatch,
          previousContent: previousContentToStore,
        },
      });
    }
  }

  // Keep snapshot fresh so recipients always see decrypted content
  const shareToUpdate = editShare ?? (isOwner ? await prisma.share.findFirst({
    where: { entityType: 'NOTE', entityId: note.id, canEdit: true, scope: 'SPECIFIC' },
    select: { id: true, snapshot: true },
  }) : null);
  if (shareToUpdate) {
    try {
      const existing = shareToUpdate.snapshot ? (JSON.parse(shareToUpdate.snapshot) as Record<string, unknown>) : {};
      const updatedSnapshot = JSON.stringify({ ...existing, title: updateData.title, content: newContentPlain });
      await prisma.share.update({ where: { id: shareToUpdate.id }, data: { snapshot: updatedSnapshot, snapshotUpdatedAt: new Date() } });
    } catch { /* non-critical */ }
  }

  revalidatePath(`/boards/${boardsId}/notes`);

  return updatedNote;
}

export async function deleteNote(note: Note): Promise<Note | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  await prisma.share.deleteMany({ where: { entityType: 'NOTE', entityId: note.id } });

  const deleted = await prisma.note.delete({
    where: { id: note.id, boards: { userId: user?.id } },
  });

  return deleted;
}

export async function getNotesCount(boardId?: number | null): Promise<number> {
  const { user } = await getCurrentSession();
  const count = await prisma.note.count({
    where:
      boardId === null
        ? { boards: { userId: user?.id } }
        : { boards: { id: boardId, userId: user?.id } },
  });
  return count;
}

export async function getNotes(
  sort: string,
  perPage = 10,
  boardId?: number | null,
): Promise<NoteWithBoards[] | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  const sorting = getSorting(sort);
  const notes = await prisma.note.findMany({
    where:
      boardId === null
        ? { boards: { userId: user?.id } }
        : { boards: { id: boardId, userId: user?.id } },
    include: { boards: true },
    take: perPage,
    orderBy: [sorting],
  });

  if (!user.encryptionEnabled) return notes;
  const key = await getCurrentSessionKey();
  if (!key) return notes;
  return notes.map((n) => {
    const decrypted = decryptNoteFields(n, key);
    if (decrypted.boards) {
      return { ...decrypted, boards: decryptBoardFields(decrypted.boards, key) };
    }
    return decrypted;
  });
}

export async function setUserNotesSort(sort: string): Promise<void> {
  const { user } = await getCurrentSession();

  if (!user) {
    return;
  }

  await prisma.user.update({
    where: { id: user?.id },
    data: { sortNotesBy: sort },
  });
}

export async function getNote(noteId: number): Promise<Note | null> {
  const { user } = await getCurrentSession();
  const note = await prisma.note.findFirst({
    where: { id: noteId, boards: { userId: user?.id } },
  });
  if (!note || !user?.encryptionEnabled) return note;
  const key = await getCurrentSessionKey();
  if (!key) return note;
  return decryptNoteFields(note, key);
}

export async function getEditShareForNote(noteId: number): Promise<{ shareId: string } | null> {
  const { user } = await getCurrentSession();
  if (!user) return null;
  const share = await prisma.share.findFirst({
    where: { entityType: 'NOTE', entityId: noteId, canEdit: true, scope: 'SPECIFIC', recipients: { some: { userId: user.id } } },
    select: { id: true },
  });
  return share ? { shareId: share.id } : null;
}

export async function getNoteForRecipient(noteId: number): Promise<Note | null> {
  const { user } = await getCurrentSession();
  if (!user) return null;
  const share = await prisma.share.findFirst({
    where: { entityType: 'NOTE', entityId: noteId, scope: 'SPECIFIC', recipients: { some: { userId: user.id } } },
    select: { snapshot: true },
  });
  if (!share) return null;
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return null;
  // Use snapshot for decrypted title/content — the note may be encrypted with the owner's key
  if (share.snapshot) {
    try {
      const snap = JSON.parse(share.snapshot) as { title?: string; content?: string };
      return { ...note, title: snap.title ?? note.title, content: snap.content ?? note.content };
    } catch { /* fall through to raw note */ }
  }
  return note;
}

export async function saveImage({
  noteId,
  imageUrl,
  existentFileName,
}: {
  noteId: number;
  imageUrl: string;
  existentFileName?: string | null;
}): Promise<string | null> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return null;
    }

    if (!isBase64(imageUrl) && !isUrl(imageUrl)) {
      throw new Error(
        'Invalid image format. Must be a valid URL or Base64 string.',
      );
    }

    if (existentFileName && fs.existsSync(existentFileName)) {
      removeFile(existentFileName);
    }

    const note = await getNoteWithAccess(noteId, user.id);
    if (!note) return null;

    const urlKeyOrPath = await saveAndGetImageFile(imageUrl);

    await prisma.note.update({
      where: { id: noteId },
      data: { imageUrl: urlKeyOrPath },
    });

    return imageUrl;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function deleteImage(
  noteId: number,
  filePath?: string | null,
): Promise<void> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return;
    }

    const note = await getNoteWithAccess(noteId, user.id);
    if (!note) return;

    const removed = removeFile(filePath);
    if (removed) {
      await prisma.note.update({
        where: { id: noteId },
        data: { imageUrl: null },
      });
    }
  } catch (e) {
    console.error(e);
  }
}

export async function savePicture({
  noteId,
  imageUrl,
}: {
  noteId: number;
  imageUrl: string;
}): Promise<string | null> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return null;
    }

    if (!isBase64(imageUrl) && !isUrl(imageUrl)) {
      throw new Error(
        'Invalid image format. Must be a valid URL or Base64 string.',
      );
    }

    const urlKeyOrPath = await saveAndGetImageFile(imageUrl);

    if (!urlKeyOrPath) {
      throw new Error('Failed to save image');
    }

    const note = await getNoteWithAccess(noteId, user.id);
    if (!note) throw new Error('Note not found');

    await prisma.picture.create({
      data: { notesId: note.id, imageUrl: urlKeyOrPath },
    });

    return urlKeyOrPath;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function deletePicture(
  noteId: number,
  pictureId: number,
): Promise<void> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return;
    }

    const note = await getNoteWithAccess(noteId, user.id);
    if (!note) throw new Error('Note not found');

    const picture = await prisma.picture.findFirst({
      where: { id: pictureId, notesId: noteId },
    });

    if (!picture) {
      throw new Error('Picture not found');
    }

    const removed = removeFile(picture.imageUrl);
    if (removed) {
      await prisma.picture.delete({
        where: { id: pictureId },
      });
    }
  } catch (e) {
    console.error(e);
  }
}

export async function getPictures(noteId: number): Promise<Picture[]> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return [];
    }

    const note = await getNoteWithAccess(noteId, user.id);
    if (!note) throw new Error('Note not found');

    const pictures = await prisma.picture.findMany({
      where: { notesId: noteId },
    });

    return pictures;
  } catch (e) {
    console.error(e);
    return [];
  }
}

// Returns the note if the user is the owner OR a canEdit share recipient
async function getNoteWithAccess(noteId: number, userId: number) {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return null;
  const isOwner = await prisma.board.findFirst({ where: { id: note.boardsId ?? undefined, userId } });
  if (isOwner) return note;
  const hasEditShare = await prisma.share.findFirst({
    where: { entityType: 'NOTE', entityId: noteId, canEdit: true, scope: 'SPECIFIC', recipients: { some: { userId } } },
  });
  return hasEditShare ? note : null;
}

// ============ Change History Management ============

/**
 * Get all changes for a note with user information
 */
export async function getNoteChanges(
  noteId: number,
): Promise<import('./types').NoteChangeWithUser[]> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return [];
    }

    const note = await getNoteWithAccess(noteId, user.id);
    if (!note) throw new Error('Note not found');

    const changes = await prisma.noteChange.findMany({
      where: { noteId },
      include: {
        user: true,
        comments: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const key = user.encryptionEnabled ? await getCurrentSessionKey() : null;
    if (!key) return changes;

    // History entries created by share recipients are stored in plaintext
    // (decryptField passes them through); entries we cannot decrypt are
    // returned untouched.
    const tryDecrypt = (value: string): string => {
      try {
        return decryptField(value, key);
      } catch {
        return value;
      }
    };

    return changes.map((change) => ({
      ...change,
      diffPatch: tryDecrypt(change.diffPatch),
      previousContent:
        change.previousContent != null ? tryDecrypt(change.previousContent) : change.previousContent,
      comments: change.comments.map((comment) => ({
        ...comment,
        content: tryDecrypt(comment.content),
      })),
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

/**
 * Delete a change from history
 */
export async function deleteNoteChange(changeId: number): Promise<boolean> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return false;
    }

    const change = await prisma.noteChange.findUnique({
      where: { id: changeId },
      include: { note: true },
    });

    if (!change) return false;
    const noteAccess = await prisma.note.findFirst({ where: { id: change.noteId, boards: { userId: user.id } } });
    if (!noteAccess) return false;

    await prisma.noteChange.delete({
      where: { id: changeId },
    });

    revalidatePath(`/boards/${noteAccess.boardsId}/notes/${change.noteId}`);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
/**
 * Delete all changes for a note
 */
export async function clearNoteHistory(noteId: number): Promise<boolean> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return false;
    }

    const note = await prisma.note.findFirst({ where: { id: noteId, boards: { userId: user.id } } });
    if (!note) return false;

    await prisma.noteChange.deleteMany({
      where: { noteId },
    });

    revalidatePath(`/boards/${note.boardsId}/notes/${noteId}`);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
/**
 * Restore note to a specific version from history
 * This does NOT create a new history entry - the restore is only saved to the note
 * A new history entry will be created when the user makes their next edit
 */
export async function restoreToVersion(
  noteId: number,
  changeId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const note = await getNoteWithAccess(noteId, user.id);
    if (!note) return { success: false, error: 'Note not found' };

    const change = await prisma.noteChange.findUnique({
      where: { id: changeId },
    });

    if (!change || change.noteId !== noteId) {
      return { success: false, error: 'Change not found' };
    }

    // Only the owner's key matches the stored ciphertext; a share recipient
    // with their own encryption enabled must not use their key here.
    let key: Buffer | null = null;
    if (user.encryptionEnabled) {
      const ownerBoard = await prisma.board.findFirst({
        where: { id: note.boardsId ?? undefined, userId: user.id },
      });
      key = ownerBoard ? await getCurrentSessionKey() : null;
    }

    // Decrypt stored content for comparison and diff computation
    const targetContentPlain = key && change.previousContent
      ? decryptField(change.previousContent, key)
      : (change.previousContent ?? '');
    const currentContentPlain = key && note.content
      ? decryptField(note.content, key)
      : (note.content ?? '');

    // If already identical, nothing to do
    if (targetContentPlain === currentContentPlain) {
      return { success: true };
    }

    // Capture the current state as a history entry before we overwrite it
    const { computeDiff } = await import('@/utils/diff');
    const diffPatch = computeDiff(targetContentPlain, currentContentPlain);
    const previousContentToStore = key
      ? encryptField(currentContentPlain, key)
      : currentContentPlain;

    await prisma.noteChange.create({
      data: {
        noteId: noteId,
        userId: user.id,
        diffPatch: key ? encryptField(diffPatch, key) : diffPatch,
        previousContent: previousContentToStore,
      },
    });

    // Update the note with the restored content (encrypted if needed)
    const contentToStore = key ? encryptField(targetContentPlain, key) : targetContentPlain;
    await prisma.note.update({
      where: { id: noteId },
      data: { content: contentToStore },
    });

    revalidatePath(`/boards/${note.boardsId}/notes/${noteId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      error: 'An error occurred while restoring the version',
    };
  }
}

/**
 * Add a comment to a change
 */
export async function addChangeComment(
  changeId: number,
  content: string,
): Promise<import('./types').ChangeCommentWithUser | null> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return null;
    }

    const change = await prisma.noteChange.findUnique({
      where: { id: changeId },
      select: { noteId: true, note: { select: { boardsId: true } } },
    });

    if (!change) return null;
    const noteAccess = await getNoteWithAccess(change.noteId, user.id);
    if (!noteAccess) return null;

    // Encrypt only when commenting on an owned note; recipients store
    // plaintext to avoid mixing keys on someone else's data.
    let key: Buffer | null = null;
    if (user.encryptionEnabled) {
      const ownerNote = await prisma.note.findFirst({
        where: { id: change.noteId, boards: { userId: user.id } },
      });
      key = ownerNote ? await getCurrentSessionKey() : null;
    }

    const comment = await prisma.changeComment.create({
      data: {
        changeId,
        userId: user.id,
        content: key ? encryptField(content, key) : content,
      },
      include: {
        user: true,
      },
    });

    revalidatePath(`/boards/${change.note.boardsId}/notes/${change.noteId}`);
    return { ...comment, content };
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * Delete a comment
 */
export async function deleteChangeComment(commentId: number): Promise<boolean> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return false;
    }

    const comment = await prisma.changeComment.findUnique({
      where: { id: commentId },
      include: {
        change: {
          include: {
            note: {
              include: {
                boards: true,
              },
            },
          },
        },
      },
    });

    if (!comment || comment.userId !== user.id) {
      return false;
    }

    await prisma.changeComment.delete({
      where: { id: commentId },
    });

    revalidatePath(
      `/boards/${comment.change.note.boardsId}/notes/${comment.change.noteId}`,
    );
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
