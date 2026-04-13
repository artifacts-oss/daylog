'use server';

import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { revalidatePath } from 'next/cache';
import { hashPassword } from '@/utils/crypto';
import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { SharedContent } from './types';

export async function createShare(data: {
  entityType: string;
  entityId: number;
  password?: string;
  expiresAt?: Date | null;
  oneTime?: boolean;
}) {
  const { user } = await getCurrentSession();
  if (!user) throw new Error('Unauthorized');

  // Verify ownership
  if (data.entityType === 'NOTE') {
    const note = await prisma.note.findFirst({
      where: { id: data.entityId, boards: { userId: user.id } },
    });
    if (!note) throw new Error('Note not found or access denied');
  } else if (data.entityType === 'BOARD') {
    const board = await prisma.board.findFirst({
      where: { id: data.entityId, userId: user.id },
    });
    if (!board) throw new Error('Board not found or access denied');
  }

  const hashedPassword = data.password ? await hashPassword(data.password) : null;

  const share = await prisma.share.create({
    data: {
      entityType: data.entityType,
      entityId: data.entityId,
      password: hashedPassword,
      expiresAt: data.expiresAt,
      oneTime: data.oneTime || false,
    },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      expiresAt: true,
      oneTime: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  revalidatePath('/shared');
  return { ...share, hasPassword: !!hashedPassword };
}

export async function deleteShare(id: string) {
  const { user } = await getCurrentSession();
  if (!user) throw new Error('Unauthorized');

  // Verify ownership before deleting
  const share = await prisma.share.findUnique({
    where: { id },
  });

  if (!share) return;

  // Simple ownership check: can the user see the entity linked to this share?
  let isOwner = false;
  if (share.entityType === 'NOTE') {
    const note = await prisma.note.findFirst({
      where: { id: share.entityId, boards: { userId: user.id } },
    });
    isOwner = !!note;
  } else {
    const board = await prisma.board.findFirst({
      where: { id: share.entityId, userId: user.id },
    });
    isOwner = !!board;
  }

  if (!isOwner && user.role !== 'admin') {
    throw new Error('Not allowed to delete this share');
  }

  await prisma.share.delete({
    where: { id },
  });

  revalidatePath('/shared');
}

export async function getSharesWithMetrics(): Promise<SharedContent[]> {
  const { user } = await getCurrentSession();
  if (!user) return [];

  // Get notes and boards owned by user first to filter shares
  const userNotes = await prisma.note.findMany({
    where: { boards: { userId: user.id } },
    select: { id: true }
  });
  const userBoards = await prisma.board.findMany({
    where: { userId: user.id },
    select: { id: true }
  });

  const noteIds = userNotes.map(n => n.id);
  const boardIds = userBoards.map(b => b.id);

  const shares = await prisma.share.findMany({
    where: {
      OR: [
        { entityType: 'NOTE', entityId: { in: noteIds } },
        { entityType: 'BOARD', entityId: { in: boardIds } }
      ]
    },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      password: true, // We will map this to hasPassword
      expiresAt: true,
      oneTime: true,
      viewCount: true,
      createdAt: true,
      updatedAt: true,
      views: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch entity titles
  const enrichedShares = await Promise.all(shares.map(async (share) => {
    let title = 'Unknown';
    if (share.entityType === 'NOTE') {
       const note = await prisma.note.findUnique({ where: { id: share.entityId }, select: { title: true }});
       title = note?.title || 'Note not found';
    } else {
       const board = await prisma.board.findUnique({ where: { id: share.entityId }, select: { title: true }});
       title = board?.title || 'Board not found';
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklyViews = share.views.filter(v => v.createdAt >= oneWeekAgo).length;
    const monthlyViews = share.views.filter(v => v.createdAt >= oneMonthAgo).length;
    const totalViews = share.views.length;

    // Map sensitive data out
    const { password, ...safeShare } = share;

    return {
      ...safeShare,
      hasPassword: !!password,
      title,
      metrics: {
        weekly: weeklyViews,
        monthly: monthlyViews,
        total: totalViews
      }
    };
  }));

  return enrichedShares;
}

export async function trackView(shareId: string) {
  const h = await headers();
  const userAgent = h.get('user-agent') || '';
  const forwarded = h.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

  const salt = process.env.TRACKING_SALT || 'daylog-salt-fallback';
  const viewerId = createHash('sha256')
    .update(`${ip}-${userAgent}-${salt}`)
    .digest('hex');

  const existing = await prisma.shareView.findFirst({
    where: { shareId, viewerId }
  });

  if (!existing) {
    await prisma.shareView.create({
      data: {
        shareId,
        viewerId,
      }
    });
    
    await prisma.share.update({
      where: { id: shareId },
      data: { viewCount: { increment: 1 } }
    });
  }
}

export async function updateSharePassword(id: string, newPassword: string | null) {
  const { user } = await getCurrentSession();
  if (!user) throw new Error('Unauthorized');

  // Verify ownership
  const share = await prisma.share.findUnique({
    where: { id },
  });

  if (!share) throw new Error('Share not found');

  let isOwner = false;
  if (share.entityType === 'NOTE') {
    const note = await prisma.note.findFirst({
      where: { id: share.entityId, boards: { userId: user.id } },
    });
    isOwner = !!note;
  } else {
    const board = await prisma.board.findFirst({
      where: { id: share.entityId, userId: user.id },
    });
    isOwner = !!board;
  }

  if (!isOwner && user.role !== 'admin') {
    throw new Error('Not allowed to update this share');
  }

  const hashedPassword = newPassword ? await hashPassword(newPassword) : null;

  await prisma.share.update({
    where: { id },
    data: { password: hashedPassword },
  });

  revalidatePath('/shared');
}
