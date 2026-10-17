'use server';

import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { decryptBoardFields, decryptNoteFields } from '@/utils/encryption';
import { removeMarkdownTags } from '@/utils/text';
import { getNotes, getNotesCount } from '../boards/[id]/notes/lib/actions';
import { getBoardsCount } from './actions';
import { getCurrentSessionKey } from './encryptionKey';

const DAY_MS = 24 * 60 * 60 * 1000;
const FORGOTTEN_AFTER_DAYS = 90;
const EXPIRING_WITHIN_DAYS = 7;
const SNIPPET_LENGTH = 180;
const HEATMAP_DAYS = 365;

export type ContinueNote = {
  id: number;
  boardsId: number | null;
  title: string;
  snippet: string;
  boardTitle: string | null;
  imageUrl: string | null;
  updatedAt: Date;
};

export type HomeStats = {
  notesThisWeek: number;
  notesTotal: number;
  boardsTotal: number;
  editsThisWeek: number;
  shareViewsTotal: number;
  shareViewsThisWeek: number;
};

export type HeatmapData = {
  // ISO day (YYYY-MM-DD) -> edits that day
  days: Record<string, number>;
  total: number;
  streak: number;
};

export type NoteLink = {
  id: number;
  boardsId: number | null;
  title: string;
  updatedAt: Date;
};

export type OnThisDayNote = NoteLink & {
  snippet: string;
  boardTitle: string | null;
  imageUrl: string | null;
  // How far back this note is, as a count of months (12 = 1 year).
  monthsAgo: number;
};

export type ExpiringShare = {
  id: string;
  title: string;
  url: string;
  entityType: string;
  hasPassword: boolean;
  views: number;
  expiresAt: Date;
};

// Notes of encrypted users are stored encrypted; keep the key lookup in one place.
async function getKey(encryptionEnabled: boolean) {
  return encryptionEnabled ? await getCurrentSessionKey() : null;
}

// decrypt*Fields swallow bad ciphertext, unlike decryptField which throws.
function plainTitle(title: string, key: Buffer | null) {
  return key ? decryptBoardFields({ title }, key).title : title;
}

function snippetOf(content: string | null) {
  return removeMarkdownTags(content ?? '').slice(0, SNIPPET_LENGTH);
}

export async function getContinueNote(): Promise<ContinueNote | null> {
  const [note] = (await getNotes('updated_desc', 1, null)) ?? [];
  if (!note) return null;
  return {
    id: note.id,
    boardsId: note.boardsId,
    title: note.title,
    snippet: snippetOf(note.content),
    boardTitle: note.boards?.title ?? null,
    imageUrl: note.imageUrl,
    updatedAt: note.updatedAt,
  };
}

export async function getHomeStats(): Promise<HomeStats | null> {
  const { user } = await getCurrentSession();
  if (!user) return null;

  const weekAgo = new Date(Date.now() - 7 * DAY_MS);
  const mine = { sharedBy: user.id };
  const [
    notesThisWeek,
    notesTotal,
    boardsTotal,
    editsThisWeek,
    shareViews,
    shareViewsThisWeek,
  ] = await Promise.all([
    prisma.note.count({
      where: { boards: { userId: user.id }, createdAt: { gte: weekAgo } },
    }),
    getNotesCount(null),
    getBoardsCount(),
    prisma.noteChange.count({
      where: { userId: user.id, createdAt: { gte: weekAgo } },
    }),
    prisma.share.aggregate({ where: mine, _sum: { viewCount: true } }),
    prisma.shareView.count({
      where: { share: mine, createdAt: { gte: weekAgo } },
    }),
  ]);

  return {
    notesThisWeek,
    notesTotal,
    boardsTotal,
    editsThisWeek,
    shareViewsTotal: shareViews._sum.viewCount ?? 0,
    shareViewsThisWeek,
  };
}

export async function getActivityHeatmap(): Promise<HeatmapData | null> {
  const { user } = await getCurrentSession();
  if (!user) return null;

  const since = new Date(Date.now() - HEATMAP_DAYS * DAY_MS);
  const rows = await prisma.$queryRaw<{ day: Date; count: number }[]>`
    SELECT date_trunc('day', "createdAt") AS day, count(*)::int AS count
    FROM "NoteChange"
    WHERE "userId" = ${user.id} AND "createdAt" >= ${since}
    GROUP BY 1`;

  // shortcut: days are bucketed in UTC, not the user's timezone; revisit if users report off-by-one days.
  const days: Record<string, number> = {};
  let total = 0;
  for (const { day, count } of rows) {
    days[day.toISOString().slice(0, 10)] = count;
    total += count;
  }

  // The streak survives until the end of today, so start from yesterday when today is empty.
  const cursor = new Date();
  if (!days[cursor.toISOString().slice(0, 10)]) {
    cursor.setTime(cursor.getTime() - DAY_MS);
  }
  let streak = 0;
  while (days[cursor.toISOString().slice(0, 10)]) {
    streak++;
    cursor.setTime(cursor.getTime() - DAY_MS);
  }

  return { days, total, streak };
}

export async function getOnThisDay(
  monthsAgoList = [1, 6, 12],
): Promise<OnThisDayNote[]> {
  const { user } = await getCurrentSession();
  if (!user) return [];

  const key = await getKey(user.encryptionEnabled);
  const now = new Date();

  const found = await Promise.all(
    monthsAgoList.map(async (monthsAgo) => {
      const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate());
      // Skip months without this day (e.g. 31st) instead of rolling over to the next month.
      if (start.getDate() !== now.getDate()) return null;
      const end = new Date(start.getTime() + DAY_MS);

      const note = await prisma.note.findFirst({
        where: { boards: { userId: user.id }, createdAt: { gte: start, lt: end } },
        include: { boards: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!note) return null;

      const plain = key ? decryptNoteFields(note, key) : note;
      return {
        id: note.id,
        boardsId: note.boardsId,
        title: plain.title,
        snippet: snippetOf(plain.content ?? null),
        boardTitle: note.boards ? plainTitle(note.boards.title, key) : null,
        imageUrl: note.imageUrl,
        updatedAt: note.updatedAt,
        monthsAgo,
      };
    }),
  );

  return found.filter((n): n is OnThisDayNote => n !== null);
}

export async function getForgottenNotes(limit = 3): Promise<NoteLink[]> {
  const { user } = await getCurrentSession();
  if (!user) return [];

  const notes = await prisma.note.findMany({
    where: {
      boards: { userId: user.id },
      updatedAt: { lt: new Date(Date.now() - FORGOTTEN_AFTER_DAYS * DAY_MS) },
    },
    select: { id: true, boardsId: true, title: true, updatedAt: true },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });

  const key = await getKey(user.encryptionEnabled);
  return key ? notes.map((n) => decryptNoteFields(n, key)) : notes;
}

export async function getExpiringShares(limit = 3): Promise<ExpiringShare[]> {
  const { user } = await getCurrentSession();
  if (!user) return [];

  const now = new Date();
  const shares = await prisma.share.findMany({
    where: {
      sharedBy: user.id,
      expiresAt: { gt: now, lte: new Date(now.getTime() + EXPIRING_WITHIN_DAYS * DAY_MS) },
    },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      password: true,
      viewCount: true,
      expiresAt: true,
    },
    orderBy: { expiresAt: 'asc' },
    take: limit,
  });
  if (shares.length === 0) return [];

  const idsOf = (type: string) =>
    shares.filter((s) => s.entityType === type).map((s) => s.entityId);
  // Entities deleted after being shared have no match and are dropped below.
  const [notes, boards] = await Promise.all([
    prisma.note.findMany({
      where: { id: { in: idsOf('NOTE') }, boards: { userId: user.id } },
      select: { id: true, boardsId: true, title: true },
    }),
    prisma.board.findMany({
      where: { id: { in: idsOf('BOARD') }, userId: user.id },
      select: { id: true, title: true },
    }),
  ]);

  const key = await getKey(user.encryptionEnabled);

  return shares.flatMap((s) => {
    const note = s.entityType === 'NOTE' ? notes.find((n) => n.id === s.entityId) : undefined;
    const board = s.entityType === 'BOARD' ? boards.find((b) => b.id === s.entityId) : undefined;
    const target = note
      ? { title: note.title, url: `/boards/${note.boardsId}/notes/${note.id}` }
      : board
        ? { title: board.title, url: `/boards/${board.id}/notes` }
        : null;
    if (!target || !s.expiresAt) return [];
    return [
      {
        id: s.id,
        title: plainTitle(target.title, key),
        url: target.url,
        entityType: s.entityType,
        hasPassword: !!s.password,
        views: s.viewCount,
        expiresAt: s.expiresAt,
      },
    ];
  });
}
