import {
  Board,
  Note,
  Share,
  ShareRecipient,
  User,
} from '@/prisma/generated/client';
import { prismaMock } from '@/prisma/singleton';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOrUpdateSnapshot,
  createShare,
  getCommunityShares,
  getEntityPublicShare,
  getShareableUsers,
  getSharedWithMe,
  leaveShare,
} from './actions';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  hashPassword: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/utils/crypto', () => ({
  hashPassword: mocks.hashPassword,
}));

type ShareWithCreator = Share & { creator: { name: string | null } | null };
type RecipientWithShare = ShareRecipient & { share: ShareWithCreator };

const user = { id: 1, name: 'John Doe', role: 'user' };

describe('leaveShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSession.mockResolvedValue({ user });
  });

  it('removes the user from the share recipients', async () => {
    prismaMock.shareRecipient.deleteMany.mockResolvedValue({ count: 1 });

    await leaveShare('s1');

    expect(prismaMock.shareRecipient.deleteMany).toHaveBeenCalledWith({
      where: { shareId: 's1', userId: user.id },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/community');
  });

  it('throws without a user', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    await expect(leaveShare('s1')).rejects.toThrow('Unauthorized');
  });
});

describe('getCommunityShares', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSession.mockResolvedValue({ user });
  });

  it('returns shares with metadata from the snapshot', async () => {
    const createdAt = new Date();
    prismaMock.share.findMany.mockResolvedValue([
      {
        id: 's1',
        entityType: 'NOTE',
        entityId: 101,
        createdAt,
        snapshot: JSON.stringify({ title: 'Snap title', imageUrl: '/img.png' }),
        creator: { name: 'Jane' },
      } as ShareWithCreator,
    ]);

    const results = await getCommunityShares();

    expect(results).toEqual([
      {
        id: 's1',
        entityType: 'NOTE',
        entityId: 101,
        title: 'Snap title',
        imageUrl: '/img.png',
        creatorName: 'Jane',
        createdAt,
        canEdit: false,
      },
    ]);
    expect(prismaMock.note.findUnique).not.toHaveBeenCalled();
  });

  it('falls back to the note when there is no snapshot', async () => {
    prismaMock.share.findMany.mockResolvedValue([
      {
        id: 's1',
        entityType: 'NOTE',
        entityId: 101,
        createdAt: new Date(),
        snapshot: null,
        creator: null,
      } as ShareWithCreator,
    ]);
    prismaMock.note.findUnique.mockResolvedValue({
      title: 'Note title',
      imageUrl: null,
    } as Note);

    const results = await getCommunityShares();

    expect(results[0].title).toBe('Note title');
    expect(results[0].creatorName).toBeNull();
  });

  it('falls back to the board when the snapshot is invalid', async () => {
    prismaMock.share.findMany.mockResolvedValue([
      {
        id: 's1',
        entityType: 'BOARD',
        entityId: 5,
        createdAt: new Date(),
        snapshot: '{invalid',
        creator: null,
      } as ShareWithCreator,
    ]);
    prismaMock.board.findUnique.mockResolvedValue({
      title: 'Board title',
      imageUrl: '/board.png',
    } as Board);

    const results = await getCommunityShares();

    expect(results[0].title).toBe('Board title');
    expect(results[0].imageUrl).toBe('/board.png');
  });

  it('flags missing entities', async () => {
    prismaMock.share.findMany.mockResolvedValue([
      {
        id: 's1',
        entityType: 'NOTE',
        entityId: 101,
        createdAt: new Date(),
        snapshot: null,
        creator: null,
      } as ShareWithCreator,
    ]);
    prismaMock.note.findUnique.mockResolvedValue(null);

    const results = await getCommunityShares();

    expect(results[0].title).toBe('Note not found');
  });

  it('returns nothing without a user', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    const results = await getCommunityShares();

    expect(results).toEqual([]);
  });
});

describe('getSharedWithMe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSession.mockResolvedValue({ user });
  });

  it('returns the shares the user received with their edit flag', async () => {
    const createdAt = new Date();
    prismaMock.shareRecipient.findMany.mockResolvedValue([
      {
        share: {
          id: 's1',
          entityType: 'NOTE',
          entityId: 101,
          createdAt,
          snapshot: JSON.stringify({ title: 'Shared note' }),
          canEdit: true,
          creator: { name: 'Jane' },
        },
      } as RecipientWithShare,
    ]);

    const results = await getSharedWithMe();

    expect(results).toEqual([
      {
        id: 's1',
        entityType: 'NOTE',
        entityId: 101,
        title: 'Shared note',
        imageUrl: null,
        creatorName: 'Jane',
        createdAt,
        canEdit: true,
      },
    ]);
  });

  it('returns nothing without a user', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    const results = await getSharedWithMe();

    expect(results).toEqual([]);
  });
});

describe('getEntityPublicShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSession.mockResolvedValue({ user });
  });

  it('returns the public share of an entity', async () => {
    const share = { id: 's1', snapshotUpdatedAt: new Date() };
    prismaMock.share.findFirst.mockResolvedValue(share as Share);

    const result = await getEntityPublicShare('NOTE', 101);

    expect(result).toEqual(share);
    expect(prismaMock.share.findFirst).toHaveBeenCalledWith({
      where: { entityType: 'NOTE', entityId: 101, scope: 'PUBLIC' },
      select: { id: true, snapshotUpdatedAt: true },
    });
  });

  it('returns null when there is no public share', async () => {
    prismaMock.share.findFirst.mockResolvedValue(null);

    const result = await getEntityPublicShare('BOARD', 5);

    expect(result).toBeNull();
  });

  it('returns null without a user', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    const result = await getEntityPublicShare('NOTE', 101);

    expect(result).toBeNull();
  });
});

describe('createOrUpdateSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSession.mockResolvedValue({ user, session: { id: 'sess-1' } });
    // No encryption key stored for the session
    prismaMock.session.findUnique.mockResolvedValue(null);
  });

  it('stores a snapshot of a shared note', async () => {
    prismaMock.share.findUnique.mockResolvedValue({
      id: 's1',
      entityType: 'NOTE',
      entityId: 101,
    } as Share);
    prismaMock.note.findFirst.mockResolvedValue({ id: 101 } as Note);
    const note = {
      id: 101,
      title: 'Note title',
      content: 'Note content',
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      boards: { user: { name: 'John Doe' } },
    };
    prismaMock.note.findUnique.mockResolvedValue(note as unknown as Note);
    prismaMock.share.update.mockResolvedValue({} as Share);

    await createOrUpdateSnapshot('s1');

    expect(prismaMock.share.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: {
        snapshot: JSON.stringify({
          type: 'NOTE',
          title: note.title,
          content: note.content,
          imageUrl: note.imageUrl,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
          boards: { user: { name: 'John Doe' } },
        }),
        snapshotUpdatedAt: expect.any(Date),
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/shared');
  });

  it('stores a snapshot of a shared board with its notes', async () => {
    prismaMock.share.findUnique.mockResolvedValue({
      id: 's1',
      entityType: 'BOARD',
      entityId: 5,
    } as Share);
    prismaMock.board.findFirst.mockResolvedValue({ id: 5 } as Board);
    const board = {
      id: 5,
      title: 'Board title',
      description: 'Board description',
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { name: 'John Doe' },
      notes: [
        {
          id: 101,
          title: 'Note title',
          content: 'Note content',
          imageUrl: null,
          createdAt: new Date(),
          pictures: [],
        },
      ],
    };
    prismaMock.board.findUnique.mockResolvedValue(board as unknown as Board);
    prismaMock.share.update.mockResolvedValue({} as Share);

    await createOrUpdateSnapshot('s1');

    const [[updateArgs]] = prismaMock.share.update.mock.calls;
    const snapshot = JSON.parse(
      (updateArgs.data as { snapshot: string }).snapshot,
    ) as { type: string; title: string; notes: { id: number }[] };
    expect(snapshot.type).toBe('BOARD');
    expect(snapshot.title).toBe('Board title');
    expect(snapshot.notes).toHaveLength(1);
  });

  it('throws when the share does not exist', async () => {
    prismaMock.share.findUnique.mockResolvedValue(null);

    await expect(createOrUpdateSnapshot('s1')).rejects.toThrow('Share not found');
  });

  it('throws when the user does not own the entity', async () => {
    prismaMock.share.findUnique.mockResolvedValue({
      id: 's1',
      entityType: 'NOTE',
      entityId: 101,
    } as Share);
    prismaMock.note.findFirst.mockResolvedValue(null);

    await expect(createOrUpdateSnapshot('s1')).rejects.toThrow('Not allowed');
  });

  it('throws without a session', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null, session: null });

    await expect(createOrUpdateSnapshot('s1')).rejects.toThrow('Unauthorized');
  });
});

describe('getShareableUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSession.mockResolvedValue({ user });
  });

  it('lists other users that content can be shared with', async () => {
    const users = [{ id: 2, name: 'Jane', email: 'jane@example.com' }];
    prismaMock.user.findMany.mockResolvedValue(users as User[]);

    const result = await getShareableUsers();

    expect(result).toEqual(users);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { id: { not: user.id } },
      select: { id: true, name: true, email: true, profileImage: true },
      orderBy: { name: 'asc' },
    });
  });

  it('returns nothing without a user', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    const result = await getShareableUsers();

    expect(result).toEqual([]);
  });
});

describe('createShare with an existing share', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSession.mockResolvedValue({ user, session: { id: 'sess-1' } });
  });

  it('reuses the existing share and adds new recipients', async () => {
    prismaMock.note.findFirst.mockResolvedValue({ id: 101 } as Note);
    const existing = { id: 's1', entityType: 'NOTE', entityId: 101 } as Share;
    prismaMock.share.findFirst.mockResolvedValue(existing);
    prismaMock.share.update.mockResolvedValue(existing);
    prismaMock.shareRecipient.createMany.mockResolvedValue({ count: 2 });

    const result = await createShare({
      entityType: 'NOTE',
      entityId: 101,
      scope: 'SPECIFIC',
      recipientIds: [2, 3],
      canEdit: true,
    });

    expect(prismaMock.share.create).not.toHaveBeenCalled();
    expect(prismaMock.share.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { canEdit: true },
      select: expect.any(Object),
    });
    expect(prismaMock.shareRecipient.createMany).toHaveBeenCalledWith({
      data: [
        { shareId: 's1', userId: 2 },
        { shareId: 's1', userId: 3 },
      ],
      skipDuplicates: true,
    });
    expect(result.hasPassword).toBe(false);
  });

  it('updates public share settings when reusing it', async () => {
    mocks.hashPassword.mockResolvedValue('hashed-pw');
    prismaMock.board.findFirst.mockResolvedValue({ id: 5 } as Board);
    const existing = { id: 's1', entityType: 'BOARD', entityId: 5 } as Share;
    prismaMock.share.findFirst.mockResolvedValue(existing);
    prismaMock.share.update.mockResolvedValue(existing);

    const expiresAt = new Date();
    await createShare({
      entityType: 'BOARD',
      entityId: 5,
      password: 'secret',
      expiresAt,
      oneTime: true,
    });

    expect(prismaMock.share.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: {
        canEdit: false,
        password: 'hashed-pw',
        expiresAt,
        oneTime: true,
      },
      select: expect.any(Object),
    });
  });

  it('rejects sharing a board the user does not own', async () => {
    prismaMock.board.findFirst.mockResolvedValue(null);

    await expect(
      createShare({ entityType: 'BOARD', entityId: 5 }),
    ).rejects.toThrow('Board not found or access denied');
  });
});
