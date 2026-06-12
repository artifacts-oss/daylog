import { User } from '@/prisma/generated/client';
import { prismaMock } from '@/prisma/singleton';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteUser,
  getSettings,
  getUsers,
  saveSettings,
  setRole,
} from './actions';

const formSettings = ['mfa', 'allowReg', 'allowUnsplash', 'enableS3'];

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

describe('actions', () => {
  const mockSession = { user: { id: 1, name: 'John Doe', role: 'user' } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return users from the database for an admin', async () => {
      mocks.getCurrentSession.mockResolvedValue({
        user: { id: 1, name: 'Admin', role: 'admin' },
      });
      const mockUsers: [Partial<User>] = [{ id: 1, name: 'John Doe' }];
      prismaMock.user.findMany.mockResolvedValue(mockUsers as [User]);

      const users = await getUsers();
      expect(users).toEqual(mockUsers);
    });

    it('should reject a non-admin user', async () => {
      mocks.getCurrentSession.mockResolvedValue({
        user: { id: 2, name: 'Regular', role: 'user' },
      });

      await expect(getUsers()).rejects.toThrow('Forbidden');
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });

    it('should reject an unauthenticated request', async () => {
      mocks.getCurrentSession.mockResolvedValue({ user: null });

      await expect(getUsers()).rejects.toThrow('Unauthorized');
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('setAdmin', () => {
    it('should update user role', async () => {
      mockSession.user.role = 'admin';
      const mockUser: Partial<User> = {
        id: 2,
        name: 'Max Doe',
        role: 'admin',
      };
      mocks.getCurrentSession.mockResolvedValue(mockSession);
      prismaMock.user.update.mockResolvedValue(mockUser as User);

      await expect(setRole(999, 'admin')).rejects.toThrow('User not found');

      expect(prismaMock.user.findUnique).toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe('loadSettings', () => {
    it('should load settings from database', async () => {
      const mockSettings = {
        mfa: true,
        allowReg: false,
        allowUnsplash: false,
        enableS3: false,
      };

      prismaMock.setting.findMany.mockResolvedValue([
        { key: 'mfa', value: mockSettings.mfa.toString() },
        { key: 'allowReg', value: mockSettings.allowReg.toString() },
        { key: 'allowUnsplash', value: mockSettings.allowUnsplash.toString() },
        { key: 'enableS3', value: mockSettings.enableS3.toString() },
      ]);

      const settings = await getSettings();
      expect(settings).toEqual(mockSettings);
    });

    it('should return null if settings does not exist', async () => {
      prismaMock.setting.findMany.mockResolvedValue([]);

      const settings = await getSettings();
      expect(settings).toBeNull();
    });
  });

  describe('saveSettings', () => {
    it('should save settings to database', async () => {
      mockSession.user.role = 'admin';
      const formData = new FormData();
      formSettings.forEach((item) => {
        formData.append(`settings`, item);
      });

      prismaMock.setting.findMany.mockResolvedValue(
        formSettings.map((key) => ({ key, value: 'true' })),
      );

      mocks.getCurrentSession.mockResolvedValue(mockSession);

      const result = await saveSettings({}, formData);

      expect(prismaMock.setting.upsert).toBeCalledTimes(formSettings.length);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        mfa: true,
        allowReg: true,
        allowUnsplash: true,
        enableS3: true,
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user if not current session user', async () => {
      mockSession.user.role = 'admin';
      mocks.getCurrentSession.mockResolvedValue(mockSession);
      const mockUser: Partial<User> = { id: 2, name: 'Max Doe' };
      prismaMock.user.findUnique.mockResolvedValue(mockUser as User);

      const user = await deleteUser(2);
      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(user).toEqual(mockUser);
    });

    it('should not delete user if it is the current session user', async () => {
      mockSession.user.role = 'admin';
      mocks.getCurrentSession.mockResolvedValue(mockSession);
      const mockUser: Partial<User> = { id: 1, name: 'John Doe' };
      prismaMock.user.findUnique.mockResolvedValue(mockUser as User);

      await expect(deleteUser(1)).rejects.toThrow(
        'Cannot delete your own account',
      );

      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });
  });
});
