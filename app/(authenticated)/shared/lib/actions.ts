'use server';

import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { revalidatePath } from 'next/cache';
import { hashPassword } from '@/utils/crypto';
import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { SharedContent } from './types';

// Simple ownership check: can the user see the entity linked to this share?
async function isShareOwner(
  share: { entityType: string; entityId: number },
  user: { id: number },
): Promise<boolean> {
  if (share.entityType === 'NOTE') {
    const note = await prisma.note.findFirst({
      where: { id: share.entityId, boards: { userId: user.id } },
    });
    return !!note;
  }
  const board = await prisma.board.findFirst({
    where: { id: share.entityId, userId: user.id },
  });
  return !!board;
}

// Resolve title/image from the share snapshot, falling back to the live entity.
async function resolveShareMetadata(share: {
  entityType: string;
  entityId: number;
  snapshot: string | null;
}): Promise<{ title: string; imageUrl: string | null }> {
  let title = 'Unknown';
  let imageUrl: string | null = null;
  if (share.snapshot) {
    try {
      const snap = JSON.parse(share.snapshot) as { title?: string; imageUrl?: string | null };
      title = snap.title || 'Unknown';
      imageUrl = snap.imageUrl ?? null;
    } catch { /* fall through */ }
  }
  if (title === 'Unknown') {
    if (share.entityType === 'NOTE') {
      const note = await prisma.note.findUnique({ where: { id: share.entityId }, select: { title: true, imageUrl: true } });
      title = note?.title || 'Note not found';
      imageUrl = note?.imageUrl ?? null;
    } else {
      const board = await prisma.board.findUnique({ where: { id: share.entityId }, select: { title: true, imageUrl: true } });
      title = board?.title || 'Board not found';
      imageUrl = board?.imageUrl ?? null;
    }
  }
  return { title, imageUrl };
}

async function toCommunityShare(
  share: {
    id: string;
    entityType: string;
    entityId: number;
    createdAt: Date;
    snapshot: string | null;
    creator: { name: string | null } | null;
  },
  canEdit: boolean,
): Promise<CommunityShare> {
  const { title, imageUrl } = await resolveShareMetadata(share);
  return {
    id: share.id,
    entityType: share.entityType,
    entityId: share.entityId,
    title,
    imageUrl,
    creatorName: share.creator?.name ?? null,
    createdAt: share.createdAt,
    canEdit,
  };
}

export async function createShare(data: {
  entityType: string;
  entityId: number;
  password?: string;
  expiresAt?: Date | null;
  oneTime?: boolean;
  scope?: string;
  recipientIds?: number[];
  canEdit?: boolean;
}) {
  const { session, user } = await getCurrentSession();
  if (!user || !session) throw new Error('Unauthorized');

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

  const scope = data.scope || 'PUBLIC';
  const canEdit = scope === 'SPECIFIC' && data.entityType === 'NOTE' ? (data.canEdit || false) : false;
  const hashedPassword = data.password ? await hashPassword(data.password) : null;

  const shareSelect = {
    id: true,
    entityType: true,
    entityId: true,
    expiresAt: true,
    oneTime: true,
    scope: true,
    password: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  // Check for an existing share of the same scope for this entity
  const existing = await prisma.share.findFirst({
    where: { entityType: data.entityType, entityId: data.entityId, scope },
    select: shareSelect,
  });

  let share: typeof existing & { id: string };

  if (existing) {
    // Reuse existing share — update settings and add any new recipients
    const updateData: Record<string, unknown> = { canEdit };
    if (scope === 'PUBLIC') {
      if (hashedPassword !== null) updateData.password = hashedPassword;
      if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
      if (data.oneTime !== undefined) updateData.oneTime = data.oneTime;
    }
    share = await prisma.share.update({
      where: { id: existing.id },
      data: updateData,
      select: shareSelect,
    });

    // Add new recipients without duplicating existing ones
    if (scope === 'SPECIFIC' && data.recipientIds?.length) {
      await prisma.shareRecipient.createMany({
        data: data.recipientIds.map((userId) => ({ shareId: existing.id, userId })),
        skipDuplicates: true,
      });
    }
  } else {
    share = await prisma.share.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        password: hashedPassword,
        expiresAt: data.expiresAt,
        oneTime: data.oneTime || false,
        scope,
        canEdit,
        sharedBy: user.id,
        ...(scope === 'SPECIFIC' && data.recipientIds?.length
          ? { recipients: { create: data.recipientIds.map((userId) => ({ userId })) } }
          : {}),
      },
      select: shareSelect,
    });
  }

  // Auto-create a decrypted snapshot so encrypted content is readable in share views
  if (user.encryptionEnabled) {
    try {
      const { getSessionEncryptionKey, decryptNoteFields, decryptBoardFields } = await import('@/utils/encryption');
      const encKey = await getSessionEncryptionKey(session.id);
      if (encKey) {
        let snapshot: string | null = null;
        if (data.entityType === 'NOTE') {
          const note = await prisma.note.findUnique({
            where: { id: data.entityId },
            include: { boards: { include: { user: { select: { name: true } } } } },
          });
          if (note) {
            const decrypted = decryptNoteFields(note, encKey);
            snapshot = JSON.stringify({
              type: 'NOTE',
              title: decrypted.title,
              content: decrypted.content,
              imageUrl: decrypted.imageUrl,
              createdAt: note.createdAt.toISOString(),
              updatedAt: note.updatedAt.toISOString(),
              boards: note.boards ? { user: note.boards.user } : null,
            });
          }
        } else if (data.entityType === 'BOARD') {
          const board = await prisma.board.findUnique({
            where: { id: data.entityId },
            include: { user: { select: { name: true } }, notes: { include: { pictures: true } } },
          });
          if (board) {
            const decryptedBoard = decryptBoardFields(board, encKey);
            const decryptedNotes = board.notes.map((note) => {
              const d = decryptNoteFields(note, encKey);
              return { id: note.id, title: d.title, content: d.content, imageUrl: note.imageUrl, createdAt: note.createdAt.toISOString(), pictures: note.pictures };
            });
            snapshot = JSON.stringify({
              type: 'BOARD',
              title: decryptedBoard.title,
              description: decryptedBoard.description,
              imageUrl: board.imageUrl,
              createdAt: board.createdAt.toISOString(),
              updatedAt: board.updatedAt.toISOString(),
              user: board.user,
              notes: decryptedNotes,
            });
          }
        }
        if (snapshot) {
          await prisma.share.update({ where: { id: share.id }, data: { snapshot, snapshotUpdatedAt: new Date() } });
        }
      }
    } catch (e) {
      console.error('Failed to auto-create share snapshot:', e);
    }
  }

  revalidatePath('/shared');
  revalidatePath('/community');
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

  if (!(await isShareOwner(share, user)) && user.role !== 'admin') {
    throw new Error('Not allowed to delete this share');
  }

  await prisma.share.delete({
    where: { id },
  });

  revalidatePath('/shared');
}

export async function leaveShare(shareId: string): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) throw new Error('Unauthorized');

  await prisma.shareRecipient.deleteMany({ where: { shareId, userId: user.id } });

  revalidatePath('/community');
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
      password: true,
      expiresAt: true,
      oneTime: true,
      viewCount: true,
      scope: true,
      canEdit: true,
      snapshotUpdatedAt: true,
      createdAt: true,
      updatedAt: true,
      views: true,
      recipients: { select: { user: { select: { id: true, name: true, email: true, profileImage: true } } } },
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch entity titles
  const { getSessionEncryptionKey, decryptField } = await import('@/utils/encryption');
  const { session } = await getCurrentSession();
  const encKey = user.encryptionEnabled && session ? await getSessionEncryptionKey(session.id) : null;

  const enrichedShares = await Promise.all(shares.map(async (share) => {
    let title = 'Unknown';
    if (share.entityType === 'NOTE') {
       const note = await prisma.note.findUnique({ where: { id: share.entityId }, select: { title: true }});
       const raw = note?.title || 'Note not found';
       title = encKey ? (() => { try { return decryptField(raw, encKey); } catch { return raw; } })() : raw;
    } else {
       const board = await prisma.board.findUnique({ where: { id: share.entityId }, select: { title: true }});
       const raw = board?.title || 'Board not found';
       title = encKey ? (() => { try { return decryptField(raw, encKey); } catch { return raw; } })() : raw;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklyViews = share.views.filter(v => v.createdAt >= oneWeekAgo).length;
    const monthlyViews = share.views.filter(v => v.createdAt >= oneMonthAgo).length;
    const totalViews = share.views.length;

    const { password, recipients, ...safeShare } = share;

    return {
      ...safeShare,
      hasPassword: !!password,
      title,
      recipients: recipients.map(r => r.user),
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

  if (!(await isShareOwner(share, user)) && user.role !== 'admin') {
    throw new Error('Not allowed to update this share');
  }

  const hashedPassword = newPassword ? await hashPassword(newPassword) : null;

  await prisma.share.update({
    where: { id },
    data: { password: hashedPassword },
  });

  revalidatePath('/shared');
}

export interface CommunityShare {
  id: string;
  entityType: string;
  entityId: number;
  title: string;
  imageUrl: string | null;
  creatorName: string | null;
  createdAt: Date;
  canEdit: boolean;
}

export async function getCommunityShares(): Promise<CommunityShare[]> {
  const { user } = await getCurrentSession();
  if (!user) return [];

  const shares = await prisma.share.findMany({
    where: { scope: 'ALL' },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      snapshot: true,
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(shares.map((share) => toCommunityShare(share, false)));
}

export async function getSharedWithMe(): Promise<CommunityShare[]> {
  const { user } = await getCurrentSession();
  if (!user) return [];

  const recipients = await prisma.shareRecipient.findMany({
    where: { userId: user.id },
    select: {
      share: {
        select: {
          id: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          snapshot: true,
          canEdit: true,
          creator: { select: { name: true } },
        },
      },
    },
    orderBy: { share: { createdAt: 'desc' } },
  });

  return Promise.all(
    recipients.map(({ share }) => toCommunityShare(share, share.canEdit)),
  );
}

export async function getEntityPublicShare(
  entityType: 'NOTE' | 'BOARD',
  entityId: number,
): Promise<{ id: string; snapshotUpdatedAt: Date | null } | null> {
  const { user } = await getCurrentSession();
  if (!user) return null;

  const share = await prisma.share.findFirst({
    where: { entityType, entityId, scope: 'PUBLIC' },
    select: { id: true, snapshotUpdatedAt: true },
  });

  return share ?? null;
}

export async function createOrUpdateSnapshot(shareId: string): Promise<void> {
  const { session, user } = await getCurrentSession();
  if (!user || !session) throw new Error('Unauthorized');

  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share) throw new Error('Share not found');

  if (!(await isShareOwner(share, user)) && user.role !== 'admin')
    throw new Error('Not allowed');

  const { getSessionEncryptionKey, decryptNoteFields, decryptBoardFields } = await import('@/utils/encryption');
  const encKey = await getSessionEncryptionKey(session.id);

  let snapshot: string;

  if (share.entityType === 'NOTE') {
    const note = await prisma.note.findUnique({
      where: { id: share.entityId },
      include: { boards: { include: { user: { select: { name: true } } } } },
    });
    if (!note) throw new Error('Note not found');

    const decrypted = encKey ? decryptNoteFields(note, encKey) : note;
    snapshot = JSON.stringify({
      type: 'NOTE',
      title: decrypted.title,
      content: decrypted.content,
      imageUrl: decrypted.imageUrl,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      boards: note.boards ? { user: note.boards.user } : null,
    });
  } else {
    const board = await prisma.board.findUnique({
      where: { id: share.entityId },
      include: {
        user: { select: { name: true } },
        notes: { include: { pictures: true } },
      },
    });
    if (!board) throw new Error('Board not found');

    const decryptedBoard = encKey ? decryptBoardFields(board, encKey) : board;
    const decryptedNotes = board.notes.map((note) => {
      const d = encKey ? decryptNoteFields(note, encKey) : note;
      return {
        id: note.id,
        title: d.title,
        content: d.content,
        imageUrl: note.imageUrl,
        createdAt: note.createdAt.toISOString(),
        pictures: note.pictures,
      };
    });

    snapshot = JSON.stringify({
      type: 'BOARD',
      title: decryptedBoard.title,
      description: decryptedBoard.description,
      imageUrl: board.imageUrl,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
      user: board.user,
      notes: decryptedNotes,
    });
  }

  await prisma.share.update({
    where: { id: shareId },
    data: { snapshot, snapshotUpdatedAt: new Date() },
  });

  revalidatePath('/shared');
}

export async function getShareableUsers(): Promise<{ id: number; name: string | null; email: string; profileImage: string | null }[]> {
  const { user } = await getCurrentSession();
  if (!user) return [];

  const users = await prisma.user.findMany({
    where: { id: { not: user.id } },
    select: { id: true, name: true, email: true, profileImage: true },
    orderBy: { name: 'asc' },
  });

  return users;
}
