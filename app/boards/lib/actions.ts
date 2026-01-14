'use server';

import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { Board, Prisma } from '@/prisma/generated/client';
import { saveAndGetImageFile } from '@/utils/file';
import getSorting from '@/utils/sorting';
import { removeFile } from '@/utils/storage';
import { isBase64, isUrl } from '@/utils/text';

import fs from 'fs';

export async function createBoard(
  board: Prisma.BoardCreateInput
): Promise<number | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  const record = await prisma.board.create({
    data: { ...board, user: { connect: { id: user?.id } } },
    select: { id: true },
  });

  return record.id;
}

export async function updateBoard(board: Board): Promise<Board | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  const { id, ...updateBoard } = board;
  const updatedBoard = await prisma.board.update({
    where: { id, userId: user?.id },
    data: {
      ...updateBoard,
    },
  });

  return updatedBoard;
}

export async function deleteBoard(board: Board): Promise<Board | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

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

export async function getBoards(sort: string, perPage: number = 10): Promise<Board[] | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    return null;
  }

  const sorting = getSorting(sort);
  const boards = await prisma.board.findMany({
    where: { userId: user?.id },
    take: perPage,
    orderBy: [sorting]
  });

  return boards;
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
  return board;
}

export async function saveImage(
  boardId: number,
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
  filePath?: string | null
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
