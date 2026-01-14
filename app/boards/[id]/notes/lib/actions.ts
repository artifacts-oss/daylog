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
  boardId: number
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

  const { id, ...updateNote } = note;
  const updatedNote = await prisma.note.update({
    where: { id, boards: { id: note.boardsId!, userId: user?.id } },
    data: {
      ...updateNote,
    },
  });

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
  boardId?: number | null
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
  existentFileName?: string | null
): Promise<string | null> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return null;
    }

    if (!isBase64(imageUrl) && !isUrl(imageUrl)) {
      throw new Error(
        'Invalid image format. Must be a valid URL or Base64 string.'
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
  filePath?: string | null
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
  imageUrl: string
): Promise<string | null> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return null;
    }

    if (!isBase64(imageUrl) && !isUrl(imageUrl)) {
      throw new Error(
        'Invalid image format. Must be a valid URL or Base64 string.'
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
  pictureId: number
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
