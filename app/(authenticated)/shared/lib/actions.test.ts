/* eslint-disable @typescript-eslint/no-explicit-any */
import { prismaMock } from '@/prisma/singleton';
import { describe, expect, it, vi } from 'vitest';
import { createShare, deleteShare, updateSharePassword, trackView } from './actions';
import { revalidatePath } from 'next/cache';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  hashPassword: vi.fn(),
  headers: vi.fn(),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}));

vi.mock('@/utils/crypto', () => ({
  hashPassword: mocks.hashPassword,
}));

describe('Share Actions', () => {
  const mockUser = { id: 1, name: 'John Doe', role: 'user' };

  describe('createShare', () => {
    it('should create a share for an owned note', async () => {
      mocks.getCurrentSession.mockResolvedValue({ user: mockUser });
      prismaMock.note.findFirst.mockResolvedValue({ id: 101 } as any);
      prismaMock.share.create.mockResolvedValue({ id: 'share-1' } as any);
      mocks.hashPassword.mockResolvedValue('hashed-pw');

      const result = await createShare({
        entityType: 'NOTE',
        entityId: 101,
        password: 'password123',
      });

      expect(prismaMock.note.findFirst).toHaveBeenCalledWith({
        where: { id: 101, boards: { userId: 1 } },
      });
      expect(prismaMock.share.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'NOTE',
          entityId: 101,
          password: 'hashed-pw',
        }),
        select: expect.any(Object),
      });
      expect(revalidatePath).toHaveBeenCalledWith('/shared');
      expect(result.id).toBe('share-1');
      expect(result.hasPassword).toBe(true);
    });

    it('should fail if user is not logged in', async () => {
      mocks.getCurrentSession.mockResolvedValue({ user: null });
      await expect(createShare({ entityType: 'NOTE', entityId: 1 })).rejects.toThrow('Unauthorized');
    });

    it('should fail if entity is not owned', async () => {
      mocks.getCurrentSession.mockResolvedValue({ user: mockUser });
      prismaMock.note.findFirst.mockResolvedValue(null);
      await expect(createShare({ entityType: 'NOTE', entityId: 1 })).rejects.toThrow('Note not found or access denied');
    });
  });

  describe('deleteShare', () => {
    it('should delete a share if user is the owner', async () => {
      const mockShare = { id: 's1', entityType: 'NOTE', entityId: 101 };
      mocks.getCurrentSession.mockResolvedValue({ user: mockUser });
      prismaMock.share.findUnique.mockResolvedValue(mockShare as any);
      prismaMock.note.findFirst.mockResolvedValue({ id: 101 } as any);

      await deleteShare('s1');

      expect(prismaMock.share.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
      expect(revalidatePath).toHaveBeenCalledWith('/shared');
    });

    it('should allow admin to delete any share', async () => {
      const adminUser = { id: 2, role: 'admin' };
      const mockShare = { id: 's1', entityType: 'NOTE', entityId: 101 };
      mocks.getCurrentSession.mockResolvedValue({ user: adminUser });
      prismaMock.share.findUnique.mockResolvedValue(mockShare as any);
      prismaMock.note.findFirst.mockResolvedValue(null); // Not owner

      await deleteShare('s1');

      expect(prismaMock.share.delete).toHaveBeenCalled();
    });

    it('should throw if user is not owner or admin', async () => {
      const mockShare = { id: 's1', entityType: 'NOTE', entityId: 101 };
      mocks.getCurrentSession.mockResolvedValue({ user: mockUser });
      prismaMock.share.findUnique.mockResolvedValue(mockShare as any);
      prismaMock.note.findFirst.mockResolvedValue(null);

      await expect(deleteShare('s1')).rejects.toThrow('Not allowed to delete this share');
    });
  });

  describe('updateSharePassword', () => {
    it('should update or clear the password if owner', async () => {
      const mockShare = { id: 's1', entityType: 'NOTE', entityId: 101 };
      mocks.getCurrentSession.mockResolvedValue({ user: mockUser });
      prismaMock.share.findUnique.mockResolvedValue(mockShare as any);
      prismaMock.note.findFirst.mockResolvedValue({ id: 101 } as any);
      mocks.hashPassword.mockResolvedValue('new-hash');

      await updateSharePassword('s1', 'new-password');

      expect(prismaMock.share.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { password: 'new-hash' }
      });
      expect(revalidatePath).toHaveBeenCalledWith('/shared');
    });
    
    it('should remove password if newPassword is null', async () => {
        const mockShare = { id: 's1', entityType: 'NOTE', entityId: 101 };
        mocks.getCurrentSession.mockResolvedValue({ user: mockUser });
        prismaMock.share.findUnique.mockResolvedValue(mockShare as any);
        prismaMock.note.findFirst.mockResolvedValue({ id: 101 } as any);
  
        await updateSharePassword('s1', null);
  
        expect(prismaMock.share.update).toHaveBeenCalledWith({
          where: { id: 's1' },
          data: { password: null }
        });
      });
  });

  describe('trackView', () => {
    it('should track a new unique view', async () => {
      const mockHeaders = new Map([
        ['user-agent', 'Mozilla/5.0'],
        ['x-forwarded-for', '1.1.1.1'],
      ]);
      mocks.headers.mockResolvedValue(mockHeaders as any);
      prismaMock.shareView.findFirst.mockResolvedValue(null);

      await trackView('s1');

      expect(prismaMock.shareView.create).toHaveBeenCalled();
      expect(prismaMock.share.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { viewCount: { increment: 1 } }
      });
    });

    it('should not track a duplicate view from the same viewer', async () => {
      const mockHeaders = new Map([['user-agent', 'Mozilla/5.0']]);
      mocks.headers.mockResolvedValue(mockHeaders as any);
      prismaMock.shareView.findFirst.mockResolvedValue({ id: 1 } as any);

      await trackView('s1');

      expect(prismaMock.shareView.create).not.toHaveBeenCalled();
      expect(prismaMock.share.update).not.toHaveBeenCalled();
    });
  });

  describe('getSharesWithMetrics', () => {
    it('should return sanitized shares with flags instead of passwords', async () => {
      mocks.getCurrentSession.mockResolvedValue({ user: mockUser });
      prismaMock.note.findMany.mockResolvedValue([{ id: 101 }] as any);
      prismaMock.board.findMany.mockResolvedValue([]);
      
      const mockShare = {
        id: 's1',
        entityType: 'NOTE',
        entityId: 101,
        password: 'hashed-password',
        views: [],
        createdAt: new Date()
      };
      
      prismaMock.share.findMany.mockResolvedValue([mockShare] as any);
      prismaMock.note.findUnique.mockResolvedValue({ title: 'Test Note' } as any);

      const { getSharesWithMetrics } = await import('./actions');
      const results = await getSharesWithMetrics();

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Note');
      expect(results[0].hasPassword).toBe(true);
      expect((results[0] as unknown as { password?: string }).password).toBeUndefined();
    });
  });
});
