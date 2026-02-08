'use server';

import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { Note, Picture, Prisma } from '@/prisma/generated/client';
import { saveAndGetImageFile } from '@/utils/file';
import { removeFile } from '@/utils/storage';
import { isBase64, isUrl } from '@/utils/text';

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

  const note: Prisma.NoteCreateInput = {
    title: data.title,
    content: data.content,
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

  // Get the current note content before updating
  const currentNote = await prisma.note.findUnique({
    where: { id: note.id },
  });

  const { id, ...updateNote } = note;
  const updatedNote = await prisma.note.update({
    where: { id, boards: { id: note.boardsId!, userId: user?.id } },
    data: {
      ...updateNote,
    },
  });

  // Track the change if content was modified
  if (currentNote && currentNote.content !== note.content) {
    const { computeDiff, areTextsIdentical } = await import('@/utils/diff');
    const oldContent = currentNote.content ?? '';
    const newContent = note.content ?? '';

    // Only save if there's an actual change
    if (!areTextsIdentical(oldContent, newContent)) {
      const diffPatch = computeDiff(oldContent, newContent);

      await prisma.noteChange.create({
        data: {
          noteId: note.id,
          userId: user.id,
          diffPatch,
          previousContent: oldContent,
        },
      });
    }
  }

  revalidatePath(`/boards/${note.boardsId}/notes`);

  return updatedNote;
}

export async function deleteNote(note: Note): Promise<Note | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

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
        : { boardsId: boardId, boards: { userId: user?.id } },
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
        : { boardsId: boardId, boards: { userId: user?.id } },
    include: { boards: true },
    take: perPage,
    orderBy: [sorting],
  });

  return notes;
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
  return note;
}

export async function saveImage(
  noteId: number,
  imageUrl: string,
  existentFileName?: string | null,
): Promise<string | null> {
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

    const urlKeyOrPath = await saveAndGetImageFile(imageUrl);

    await prisma.note.update({
      where: { id: noteId, boards: { userId: user?.id } },
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

    const removed = removeFile(filePath);
    if (removed) {
      await prisma.note.update({
        where: { id: noteId, boards: { userId: user?.id } },
        data: { imageUrl: null },
      });
    }
  } catch (e) {
    console.error(e);
  }
}

export async function savePicture(
  noteId: number,
  imageUrl: string,
): Promise<string | null> {
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

    const note = await prisma.note.findUnique({
      where: { id: noteId, boards: { userId: user?.id } },
    });

    if (!note) {
      throw new Error('Note not found');
    }

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

    const note = await prisma.note.findUnique({
      where: { id: noteId, boards: { userId: user?.id } },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    const picture = await prisma.picture.findUnique({
      where: { id: pictureId },
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

    const note = await prisma.note.findUnique({
      where: { id: noteId, boards: { userId: user?.id } },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    const pictures = await prisma.picture.findMany({
      where: { notesId: noteId },
    });

    return pictures;
  } catch (e) {
    console.error(e);
    return [];
  }
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

    const note = await prisma.note.findUnique({
      where: { id: noteId, boards: { userId: user?.id } },
    });

    if (!note) {
      throw new Error('Note not found');
    }

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

    return changes;
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
      include: { note: { include: { boards: true } } },
    });

    if (!change || change.note.boards?.userId !== user.id) {
      return false;
    }

    await prisma.noteChange.delete({
      where: { id: changeId },
    });

    revalidatePath(`/boards/${change.note.boardsId}/notes/${change.noteId}`);
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

    const note = await prisma.note.findUnique({
      where: { id: noteId, boards: { userId: user?.id } },
    });

    if (!note) {
      return false;
    }

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

    const note = await prisma.note.findUnique({
      where: { id: noteId, boards: { userId: user?.id } },
    });

    if (!note) {
      return { success: false, error: 'Note not found' };
    }

    const change = await prisma.noteChange.findUnique({
      where: { id: changeId },
    });

    if (!change || change.noteId !== noteId) {
      return { success: false, error: 'Change not found' };
    }

    // The previousContent field contains the content before this change was applied
    // So restoring to this version means using the previousContent
    const targetContent = change.previousContent ?? '';
    const currentContent = note.content ?? '';

    // If already identical, nothing to do
    if (targetContent === currentContent) {
      return { success: true };
    }

    // Capture the current state as a history entry before we overwrite it
    // This allows the user to restore back to this state if they want to undo the restore
    const { computeDiff } = await import('@/utils/diff');
    const diffPatch = computeDiff(targetContent, currentContent);

    await prisma.noteChange.create({
      data: {
        noteId: noteId,
        userId: user.id,
        diffPatch,
        previousContent: currentContent,
      },
    });

    // Update the note with the restored content
    await prisma.note.update({
      where: { id: noteId },
      data: { content: targetContent },
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
      include: { note: { include: { boards: true } } },
    });

    if (!change || change.note.boards?.userId !== user.id) {
      return null;
    }

    const comment = await prisma.changeComment.create({
      data: {
        changeId,
        userId: user.id,
        content,
      },
      include: {
        user: true,
      },
    });

    revalidatePath(`/boards/${change.note.boardsId}/notes/${change.noteId}`);
    return comment;
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
