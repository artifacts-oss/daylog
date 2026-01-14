'use server';

import { redirect } from 'next/navigation';
import { prisma } from '../../prisma/client';
import { deleteSessionTokenCookie } from '../login/lib/cookies';
import { getCurrentSession } from '../login/lib/actions';

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
    select: { id: true, title: true },
    where: { title: { contains: keywords, mode: 'insensitive' }, userId: user.id },
  });

  const notes = await prisma.note.findMany({
    select: { id: true, title: true, boardsId: true },
    where: { title: { contains: keywords, mode: 'insensitive' }, boards: { userId: user.id } },
  });

  notes.forEach((n) =>
    results.push({
      type: 'note',
      title: n.title,
      matchContent: '',
      url: `/boards/${n.boardsId}/notes/${n.id}`,
    })
  );

  boards.forEach((b) => {
    results.push({
      type: 'board',
      title: b.title,
      matchContent: '',
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
