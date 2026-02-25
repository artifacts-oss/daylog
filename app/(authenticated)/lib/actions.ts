'use server';

import { redirect } from 'next/navigation';
import { prisma } from '../../../prisma/client';
import { deleteSessionTokenCookie } from '../../login/lib/cookies';
import { getCurrentSession } from '../../login/lib/actions';

export async function signout() {
  const { user } = await getCurrentSession();
  if (!user) {
    return Response.json({ error: 'Session not found' });
  }
  await deleteSessionTokenCookie();
  redirect('/login');
}

export type SearchResult = {
  type: 'note' | 'board';
  title: string;
  matchContent: string;
  url: string;
};

export async function search(keywords: string): Promise<SearchResult[]> {
  const { user } = await getCurrentSession();
  if (!user) {
    return [];
  }

  const results: SearchResult[] = [];

  if (keywords.length <= 0) return [];

  const boards = await prisma.board.findMany({
    select: { id: true, title: true, description: true },
    where: {
      OR: [
        { title: { contains: keywords, mode: 'insensitive' } },
        { description: { contains: keywords, mode: 'insensitive' } },
      ],
      userId: user.id,
    },
    take: 5,
  });

  const notes = await prisma.note.findMany({
    select: { id: true, title: true, content: true, boardsId: true },
    where: {
      OR: [
        { title: { contains: keywords, mode: 'insensitive' } },
        { content: { contains: keywords, mode: 'insensitive' } },
      ],
      boards: { userId: user.id },
    },
    take: 10,
  });

  notes.forEach((n) => {
    let matchContent = '';
    if (n.content && n.content.toLowerCase().includes(keywords.toLowerCase())) {
      const index = n.content.toLowerCase().indexOf(keywords.toLowerCase());
      const start = Math.max(0, index - 40);
      const end = Math.min(n.content.length, index + 60);
      matchContent =
        (start > 0 ? '...' : '') +
        n.content.slice(start, end).replace(/\n/g, ' ') +
        (end < n.content.length ? '...' : '');
    }

    results.push({
      type: 'note',
      title: n.title,
      matchContent,
      url: `/boards/${n.boardsId}/notes/${n.id}`,
    });
  });

  boards.forEach((b) => {
    let matchContent = '';
    if (
      b.description &&
      b.description.toLowerCase().includes(keywords.toLowerCase())
    ) {
      const index = b.description.toLowerCase().indexOf(keywords.toLowerCase());
      const start = Math.max(0, index - 40);
      const end = Math.min(b.description.length, index + 60);
      matchContent =
        (start > 0 ? '...' : '') +
        b.description.slice(start, end).replace(/\n/g, ' ') +
        (end < b.description.length ? '...' : '');
    }

    results.push({
      type: 'board',
      title: b.title,
      matchContent,
      url: `/boards/${b.id}/notes`,
    });
  });

  return results;
}

export async function getBoardsCount() {
  const { user } = await getCurrentSession();
  if (!user) {
    return 0;
  }
  const count = await prisma.board.count({ where: { userId: user.id } });
  return count;
}

export async function getLatestBoardImage(): Promise<string | null> {
  const { user } = await getCurrentSession();
  if (!user) {
    return null;
  }
  const board = await prisma.board.findFirst({
    where: { userId: user.id, imageUrl: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: { imageUrl: true },
  });
  return board?.imageUrl || null;
}
