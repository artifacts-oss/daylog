import { Board } from '@/prisma/generated/client';
import { prismaMock } from '@/prisma/singleton';
import { redirect } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import { deleteSessionTokenCookie } from '../login/lib/cookies';
import { search, SearchResult, signout } from './actions';
import { NoteWithBoards } from '../boards/[id]/notes/lib/types';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
}));

vi.mock('../login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('../login/lib/cookies', () => ({
  deleteSessionTokenCookie: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('signout', () => {
  it('should delete session token cookie and redirect to login', async () => {
    const mockSession = { user: { id: 1, name: 'John Doe', role: 'user' } };
    mocks.getCurrentSession.mockResolvedValue(mockSession);
    await signout();
    expect(deleteSessionTokenCookie).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});

describe('search', () => {
  const mockSession = { user: { id: 1, name: 'John Doe', role: 'user' } };

  it('should return an empty array if keywords are empty', async () => {
    mocks.getCurrentSession.mockResolvedValue(mockSession);
    const results = await search('');
    expect(results).toEqual([]);
  });

  it('should return search results for boards and notes', async () => {
    const mockBoards: Partial<Board>[] = [
      { id: 1, title: 'Board 1', userId: 1 },
      { id: 2, title: 'Board 2', userId: 1 },
    ];
    const mockNotes: Partial<NoteWithBoards>[] = [
      { id: 1, title: 'Note 1', boardsId: 1, boards: { userId: 1 } as Board },
      { id: 2, title: 'Note 2', boardsId: 2, boards: { userId: 1 } as Board },
    ];

    mocks.getCurrentSession.mockResolvedValue(mockSession);
    prismaMock.board.findMany.mockResolvedValue(mockBoards as Board[]);
    prismaMock.note.findMany.mockResolvedValue(mockNotes as NoteWithBoards[]);

    const keywords = 'Note';
    const results: SearchResult[] = await search(keywords);

    expect(prismaMock.board.findMany).toHaveBeenCalledWith({
      select: { id: true, title: true },
      where: { title: { contains: keywords, mode: 'insensitive' }, userId: 1 },
    });
    expect(prismaMock.note.findMany).toHaveBeenCalledWith({
      select: { id: true, title: true, boardsId: true },
      where: { title: { contains: keywords, mode: 'insensitive' }, boards: { userId: 1 } },
    });
    expect(results).toEqual([
      {
        type: 'note',
        title: 'Note 1',
        matchContent: '',
        url: '/boards/1/notes/1',
      },
      {
        type: 'note',
        title: 'Note 2',
        matchContent: '',
        url: '/boards/2/notes/2',
      },
      {
        type: 'board',
        title: 'Board 1',
        matchContent: '',
        url: '/boards/1/notes',
      },
      {
        type: 'board',
        title: 'Board 2',
        matchContent: '',
        url: '/boards/2/notes',
      },
    ]);
  });
});
