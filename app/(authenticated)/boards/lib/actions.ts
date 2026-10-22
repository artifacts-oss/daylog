'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentSession } from '@/app/login/lib/actions';
import { getCurrentSessionKey } from '@/app/(authenticated)/lib/encryptionKey';
import { prisma } from '@/prisma/client';
import { Board, Prisma } from '@/prisma/generated/client';
import { saveAndGetImageFile } from '@/utils/file';
import getSorting from '@/utils/sorting';
import { removeFile } from '@/utils/storage';
import { isBase64, isUrl } from '@/utils/text';
import { encryptBoardFields, decryptBoardFields, encryptField } from '@/utils/encryption';

import fs from 'fs';

export async function createBoard(
  board: Prisma.BoardCreateInput,
): Promise<number | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  const key = user.encryptionEnabled ? await getCurrentSessionKey() : null;
  const boardData = key
    ? encryptBoardFields(board as { title: string; description?: string | null }, key)
    : board;

  const record = await prisma.board.create({
    data: { ...boardData, user: { connect: { id: user?.id } } },
    select: { id: true },
  });

  return record.id;
}

export async function updateBoard(board: Board): Promise<Board | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  const key = user.encryptionEnabled ? await getCurrentSessionKey() : null;
  const { id, ...updateData } = board;
  const encryptedData = key ? encryptBoardFields(updateData, key) : updateData;

  const updatedBoard = await prisma.board.update({
    where: { id, userId: user?.id },
    data: { ...encryptedData },
  });

  return key ? decryptBoardFields(updatedBoard, key) : updatedBoard;
}

export async function renameBoard(boardId: number, title: string): Promise<boolean> {
  const { user } = await getCurrentSession();
  const newTitle = title.trim();
  if (!user || !newTitle) return false;

  const key = user.encryptionEnabled ? await getCurrentSessionKey() : null;
  if (user.encryptionEnabled && !key) return false;
  const { count } = await prisma.board.updateMany({
    where: { id: boardId, userId: user.id },
    data: { title: key ? encryptField(newTitle, key) : newTitle },
  });
  if (count === 0) return false;

  revalidatePath(`/boards/${boardId}/notes`);
  revalidatePath('/boards');
  return true;
}

export async function deleteBoard(board: Board): Promise<Board | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  // Ownership check before touching shares: the action is callable with any board id.
  const owned = await prisma.board.findFirst({
    where: { id: board.id, userId: user.id },
    select: { id: true },
  });
  if (!owned) return null;

  // Delete shares for the board and all its notes (Share uses entityId/entityType, no DB cascade)
  const noteIds = (await prisma.note.findMany({ where: { boardsId: board.id }, select: { id: true } })).map((n) => n.id);
  await prisma.share.deleteMany({
    where: { OR: [{ entityType: 'BOARD', entityId: board.id }, { entityType: 'NOTE', entityId: { in: noteIds } }] },
  });

  const deleted = await prisma.board.delete({
    where: { id: board.id, userId: user?.id },
  });

  return deleted;
}

export async function getBoardsCount(): Promise<number> {
  const { user } = await getCurrentSession();

  if (!user) {
    return 0;
  }

  const count = await prisma.board.count({
    where: { userId: user?.id },
  });

  return count;
}

export async function getBoards(
  sort: string,
  perPage: number = 10,
  favorite = false,
  skip = 0,
): Promise<Board[] | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  const sorting = getSorting(sort);
  const boards = await prisma.board.findMany({
    where: { userId: user?.id, ...(favorite ? { favorite: true } : {}) },
    // ponytail: favorites are few, return them all instead of paginating
    take: favorite ? undefined : perPage,
    skip: favorite ? undefined : skip,
    orderBy: sorting,
  });

  if (!user.encryptionEnabled) return boards;
  const key = await getCurrentSessionKey();
  if (!key) return boards;
  return boards.map((b) => decryptBoardFields(b, key));
}

export async function setUserBoardsSort(sort: string): Promise<void> {
  const { user } = await getCurrentSession();
  await prisma.user.update({
    where: { id: user?.id },
    data: { sortBoardsBy: sort },
  });
}

export async function getBoard(boardId: number): Promise<Board | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  const board = await prisma.board.findFirst({
    where: { id: boardId, userId: user?.id },
  });
  if (!board || !user.encryptionEnabled) return board;
  const key = await getCurrentSessionKey();
  if (!key) return board;
  return decryptBoardFields(board, key);
}

export async function getBoardForNoteRecipient(noteId: number): Promise<Board | null> {
  const { user } = await getCurrentSession();
  if (!user) return null;
  const hasAccess = await prisma.share.findFirst({
    where: { entityType: 'NOTE', entityId: noteId, scope: 'SPECIFIC', recipients: { some: { userId: user.id } } },
  });
  if (!hasAccess) return null;
  const note = await prisma.note.findUnique({ where: { id: noteId }, select: { boardsId: true } });
  if (!note) return null;
  const board = await prisma.board.findUnique({ where: { id: note.boardsId ?? undefined } });
  if (!board || !user.encryptionEnabled) return board;
  const key = await getCurrentSessionKey();
  if (!key) return board;
  return decryptBoardFields(board, key);
}

export async function saveImage({
  boardId,
  imageUrl,
  existentFileName,
}: {
  boardId: number;
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

    const urlKeyOrPath = await saveAndGetImageFile(imageUrl);

    await prisma.board.update({
      where: { id: boardId, userId: user?.id },
      data: { imageUrl: urlKeyOrPath },
    });

    return imageUrl;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function deleteImage(
  boardId: number,
  filePath?: string | null,
): Promise<void> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return;
    }

    const removed = removeFile(filePath);
    if (removed) {
      await prisma.board.update({
        where: { id: boardId, userId: user?.id },
        data: { imageUrl: null },
      });
    }
  } catch (e) {
    console.error(e);
  }
}
