import { Board } from '@/prisma/generated/client';
import { prismaMock } from '@/prisma/singleton';
import { redirect } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import { deleteSessionTokenCookie } from '../../login/lib/cookies';
import {
  getBoardsCount,
  getTopItems,
  search,
  SearchResult,
  signout,
} from './actions';
import { NoteWithBoards } from '../boards/[id]/notes/lib/types';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('@/app/login/lib/cookies', () => ({
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
      select: { id: true, title: true, description: true },
      take: 5,
      where: {
        OR: [
          { title: { contains: keywords, mode: 'insensitive' } },
          { description: { contains: keywords, mode: 'insensitive' } },
        ],
        userId: 1,
      },
    });
    expect(prismaMock.note.findMany).toHaveBeenCalledWith({
      select: { id: true, title: true, content: true, boardsId: true },
      take: 10,
      where: {
        OR: [
          { title: { contains: keywords, mode: 'insensitive' } },
          { content: { contains: keywords, mode: 'insensitive' } },
        ],
        boards: { userId: 1 },
      },
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

  it('should return empty array if no user session', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });
    const results = await search('test');
    expect(results).toEqual([]);
  });
});

describe('getBoardsCount', () => {
  it('should return 0 if no user session', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });
    const count = await getBoardsCount();
    expect(count).toBe(0);
  });

  it('should return the count of boards for the current user', async () => {
    const mockSession = { user: { id: 1, name: 'John Doe', role: 'user' } };
    mocks.getCurrentSession.mockResolvedValue(mockSession);
    prismaMock.board.count.mockResolvedValue(5);

    const count = await getBoardsCount();

    expect(prismaMock.board.count).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
    expect(count).toBe(5);
  });
});

describe('getTopItems', () => {
  it('merges favorite boards and notes, newest first, up to the limit', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: { id: 1, role: 'user' } });
    prismaMock.board.findMany.mockResolvedValue([
      { id: 1, title: 'Old board', updatedAt: new Date('2026-01-01') },
      { id: 2, title: 'New board', updatedAt: new Date('2026-03-01') },
    ] as Board[]);
    prismaMock.note.findMany.mockResolvedValue([
      { id: 7, title: 'Mid note', boardsId: 1, updatedAt: new Date('2026-02-01') },
    ] as NoteWithBoards[]);

    const result = await getTopItems(true, 2);

    expect(result).toEqual([
      { type: 'board', title: 'New board', url: '/boards/2/notes' },
      { type: 'note', title: 'Mid note', url: '/boards/1/notes/7' },
    ]);
  });
});
