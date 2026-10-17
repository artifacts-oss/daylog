import { Note, Share } from '@/prisma/generated/client';
import { prismaMock } from '@/prisma/singleton';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActivityHeatmap,
  getContinueNote,
  getExpiringShares,
  getForgottenNotes,
  getHomeStats,
  getOnThisDay,
} from './home';
import { NoteWithBoards } from '../boards/[id]/notes/lib/types';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getNotes: vi.fn(),
  getNotesCount: vi.fn(),
  getBoardsCount: vi.fn(),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('../boards/[id]/notes/lib/actions', () => ({
  getNotes: mocks.getNotes,
  getNotesCount: mocks.getNotesCount,
}));

vi.mock('./actions', () => ({ getBoardsCount: mocks.getBoardsCount }));

vi.mock('./encryptionKey', () => ({ getCurrentSessionKey: vi.fn(async () => null) }));

const NOW = new Date('2026-10-16T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  mocks.getCurrentSession.mockResolvedValue({ user: { id: 1, encryptionEnabled: false } });
});

afterEach(() => vi.useRealTimers());

describe('home actions without a session', () => {
  it('return empty results', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    expect(await getHomeStats()).toBeNull();
    expect(await getActivityHeatmap()).toBeNull();
    expect(await getOnThisDay()).toEqual([]);
    expect(await getForgottenNotes()).toEqual([]);
    expect(await getExpiringShares()).toEqual([]);
  });
});

describe('getContinueNote', () => {
  it('returns the latest edited note with a markdown-free snippet', async () => {
    mocks.getNotes.mockResolvedValue([
      {
        id: 3,
        boardsId: 2,
        title: 'Plan',
        content: '# Heading\n\nSome **bold** text',
        imageUrl: null,
        updatedAt: NOW,
        boards: { title: 'Work' },
      },
    ] as NoteWithBoards[]);

    const note = await getContinueNote();

    expect(mocks.getNotes).toHaveBeenCalledWith('updated_desc', 1, null);
    expect(note).toMatchObject({ id: 3, boardTitle: 'Work', snippet: 'Heading Some bold text' });
  });

  it('returns null when there are no notes', async () => {
    mocks.getNotes.mockResolvedValue([]);
    expect(await getContinueNote()).toBeNull();
  });
});

describe('getHomeStats', () => {
  it('aggregates counts and share views', async () => {
    prismaMock.note.count.mockResolvedValue(4);
    prismaMock.noteChange.count.mockResolvedValue(9);
    prismaMock.share.aggregate.mockResolvedValue({ _sum: { viewCount: 40 } } as never);
    prismaMock.shareView.count.mockResolvedValue(6);
    mocks.getNotesCount.mockResolvedValue(100);
    mocks.getBoardsCount.mockResolvedValue(5);

    expect(await getHomeStats()).toEqual({
      notesThisWeek: 4,
      notesTotal: 100,
      boardsTotal: 5,
      editsThisWeek: 9,
      shareViewsTotal: 40,
      shareViewsThisWeek: 6,
    });
  });
});

describe('getActivityHeatmap', () => {
  const rows = (days: string[]) => days.map((d) => ({ day: new Date(d), count: 2 }));

  it('counts the streak ending today', async () => {
    prismaMock.$queryRaw.mockResolvedValue(
      rows(['2026-10-16', '2026-10-15', '2026-10-14', '2026-10-12']),
    );

    expect(await getActivityHeatmap()).toMatchObject({ total: 8, streak: 3 });
  });

  it('keeps the streak alive when today is still empty', async () => {
    prismaMock.$queryRaw.mockResolvedValue(rows(['2026-10-15', '2026-10-14']));

    expect((await getActivityHeatmap())?.streak).toBe(2);
  });

  it('has no streak after a gap', async () => {
    prismaMock.$queryRaw.mockResolvedValue(rows(['2026-10-10']));

    expect((await getActivityHeatmap())?.streak).toBe(0);
  });
});

describe('getOnThisDay', () => {
  it('returns one note per matching offset', async () => {
    prismaMock.note.findFirst
      .mockResolvedValueOnce({ id: 1, boardsId: 1, title: 'A', content: 'x', updatedAt: NOW, boards: { title: 'B' } } as NoteWithBoards)
      .mockResolvedValue(null);

    const notes = await getOnThisDay();

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ id: 1, monthsAgo: 1, boardTitle: 'B' });
  });

  it('skips months that do not have today’s day number', async () => {
    vi.setSystemTime(new Date('2026-10-31T12:00:00Z')); // September has no 31st
    prismaMock.note.findFirst.mockResolvedValue(null);

    await getOnThisDay([1]);

    expect(prismaMock.note.findFirst).not.toHaveBeenCalled();
  });
});

describe('getForgottenNotes', () => {
  it('queries notes untouched for 90+ days, oldest first', async () => {
    prismaMock.note.findMany.mockResolvedValue([
      { id: 1, boardsId: 1, title: 'Old', updatedAt: new Date('2026-01-01') },
    ] as Note[]);

    const notes = await getForgottenNotes();

    expect(notes).toHaveLength(1);
    const args = prismaMock.note.findMany.mock.calls[0][0];
    expect(args?.orderBy).toEqual({ updatedAt: 'asc' });
    expect(args?.where?.updatedAt).toEqual({ lt: new Date('2026-07-18T12:00:00Z') });
  });
});

describe('getExpiringShares', () => {
  it('resolves titles and drops shares whose entity no longer exists', async () => {
    const expiresAt = new Date('2026-10-17T12:00:00Z');
    prismaMock.share.findMany.mockResolvedValue([
      { id: 's1', entityType: 'NOTE', entityId: 7, password: 'hash', viewCount: 3, expiresAt },
      { id: 's2', entityType: 'BOARD', entityId: 9, password: null, viewCount: 0, expiresAt },
      { id: 's3', entityType: 'NOTE', entityId: 99, password: null, viewCount: 0, expiresAt },
    ] as Share[]);
    prismaMock.note.findMany.mockResolvedValue([{ id: 7, boardsId: 2, title: 'Budget' }] as Note[]);
    prismaMock.board.findMany.mockResolvedValue([{ id: 9, title: 'Team' }] as never);

    const shares = await getExpiringShares();

    expect(shares).toEqual([
      { id: 's1', title: 'Budget', url: '/boards/2/notes/7', entityType: 'NOTE', hasPassword: true, views: 3, expiresAt },
      { id: 's2', title: 'Team', url: '/boards/9/notes', entityType: 'BOARD', hasPassword: false, views: 0, expiresAt },
    ]);
  });

  it('returns nothing when no share is about to expire', async () => {
    prismaMock.share.findMany.mockResolvedValue([]);
    expect(await getExpiringShares()).toEqual([]);
  });
});
