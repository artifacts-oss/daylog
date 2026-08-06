import { prismaMock } from '@/prisma/singleton';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backupData,
  deleteAccount,
  deleteMFA,
  enableEncryption,
  getProfile,
  sendOTP,
  updateMFA,
  updatePassword,
  updateProfile,
} from './actions';
import { User } from '@/prisma/generated/client';

vi.mock('next-intl/server', async () => {
  const { default: messages } = await import('@/messages/en.json');
  return { getTranslations: async (namespace: 'ProfileActions') =>
    (key: keyof typeof messages.ProfileActions) => messages[namespace][key] };
});

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  deleteSessionTokenCookie: vi.fn(),
  getCurrentSession: vi.fn(),
  validateSessionToken: vi.fn(),
  revalidatePath: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn().mockResolvedValue(true),
  validateTOTP: vi.fn(),
  sendMail: vi.fn(),
  generateTOTP: vi.fn(),
  createAndVerifyTransporter: vi.fn().mockImplementation(() => ({
    sendMail: mocks.sendMail,
  })),
  saveBase64File: vi.fn(() => 'storage/avatar.jpeg'),
  removeFile: vi.fn(),
}));

vi.mock('@/utils/storage', () => ({
  saveBase64File: mocks.saveBase64File,
  removeFile: mocks.removeFile,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
  permanentRedirect: mocks.permanentRedirect,
}));

vi.mock('@/app/login/lib/cookies', () => ({
  deleteSessionTokenCookie: mocks.deleteSessionTokenCookie,
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
  validateSessionToken: mocks.validateSessionToken,
}));

vi.mock('@/utils/crypto', () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock('@/utils/totp', () => ({
  validateTOTP: mocks.validateTOTP,
  generateTOTP: mocks.generateTOTP,
}));

vi.mock('next/cache');
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue({ value: 'mockToken' }),
  }),
}));

vi.mock('@/utils/email', () => ({
  createAndVerifyTransporter: mocks.createAndVerifyTransporter,
}));

vi.mock('@/utils/encryption', () => ({
  generateEncryptionSalt: vi.fn().mockReturnValue('mocksalt'),
  deriveEncryptionKey: vi.fn().mockResolvedValue(Buffer.from('mockkey')),
  wrapKeyWithMaster: vi.fn().mockReturnValue('wrappedkey'),
  encryptBoardFields: vi.fn().mockImplementation((b) => b),
  encryptNoteFields: vi.fn().mockImplementation((n) => n),
  decryptBoardFields: vi.fn().mockImplementation((b) => b),
  decryptNoteFields: vi.fn().mockImplementation((n) => n),
}));

describe('Profile Actions', () => {
  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');
      formData.append('profileImage', 'data:image/jpeg;base64,YQ==');
      formData.append('profileImageChanged', 'true');

      prismaMock.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ profileImage: 'storage/old.jpeg' } as User);
      prismaMock.user.update.mockResolvedValue({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);

      mocks.getCurrentSession.mockResolvedValue({ user: { id: 1 } });
      mocks.validateSessionToken.mockResolvedValue(true);

      const result = await updateProfile({}, formData);

      expect(result).toEqual({
        success: true,
        message: 'Profile updated successfully.',
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          profileImage: 'storage/avatar.jpeg',
        },
      });
      expect(mocks.saveBase64File).toHaveBeenCalledWith('data:image/jpeg;base64,YQ==');
      expect(mocks.removeFile).toHaveBeenCalledWith('storage/old.jpeg');
    });

    it('should return error if form data is invalid', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      // Testing incomplete form data - missing name and email

      const result = await updateProfile({}, formData);

      expect(result?.errors).not.toBeNull();
    });

    it('should return error if email already exists', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');

      prismaMock.user.findUnique.mockResolvedValue({
        id: 2,
        name: null,
        email: '',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);

      const result = await updateProfile({}, formData);

      expect(result).toEqual({
        message: 'Email already exists.',
        success: false,
      });
    });

    it('cannot update profile if user is not authorized', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');

      mocks.getCurrentSession.mockResolvedValue({
        user: null,
        session: null,
      });
      mocks.validateSessionToken.mockResolvedValue(false);

      const result = await updateProfile({}, formData);

      expect(result).toEqual({
        message: 'Not allowed',
        success: false,
      });
    });

    it('cannot update profile if user is not the owner and is not admin', async () => {
      const formData = new FormData();
      formData.append('id', '2');
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');

      mocks.getCurrentSession.mockResolvedValue({
        user: {
          id: 1,
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'user',
        },
        session: null,
      });
      mocks.validateSessionToken.mockResolvedValue(true);

      const result = await updateProfile({}, formData);

      expect(result).toEqual({
        message: 'Not allowed',
        success: false,
      });
    });
  });

  describe('updatePassword', () => {
    const hashedPassword = 'hashedCurrentPassword';
    it('should update password successfully', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      formData.append('current', 'currentPassword');
      formData.append('password', 'newPassword');
      formData.append('confirm', 'newPassword');

      mocks.getCurrentSession.mockResolvedValue({
        user: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'user',
        },
        session: null,
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        password: hashedPassword,
        name: null,
        email: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);
      prismaMock.user.update.mockResolvedValue({
        id: 1,
        name: null,
        email: '',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
      } as User);
      mocks.hashPassword.mockReturnValue(hashedPassword);

      const result = await updatePassword({}, formData);

      expect(result).toEqual({
        success: true,
        message: 'Password updated successfully.',
      });
    });

    it('should return error if passwords do not match', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      formData.append('current', 'currentPassword');
      formData.append('password', 'newPassword');
      formData.append('confirm', 'differentPassword');

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        password: hashedPassword,
        name: null,
        email: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);
      mocks.hashPassword.mockReturnValue(hashedPassword);
      const result = await updatePassword({}, formData);

      expect(result).toEqual({
        message: 'Passwords do not match.',
        data: { password: 'newPassword' },
        success: false,
      });
    });
  });

  describe('backupData', () => {
    it('should backup data successfully', async () => {
      const formData = new FormData();
      formData.append('userId', '1');

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);

      const result = await backupData({}, formData);

      expect(result.data).toBeDefined();
    });

    it('should return error if user not found', async () => {
      const formData = new FormData();
      formData.append('userId', '1');

      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await backupData({}, formData);

      expect(result).toEqual({
        message: 'User not found.',
        success: false,
      });
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      const formData = new FormData();
      formData.append('userId', '1');
      formData.append('password', 'password');

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'john@example.com',
        name: null,
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
      } as User);
      prismaMock.user.delete.mockResolvedValue({
        id: 1,
        name: null,
        email: '',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);

      const result = await deleteAccount({}, formData);

      expect(result).toBeUndefined();
      expect(mocks.deleteSessionTokenCookie).toHaveBeenCalled();
      expect(mocks.permanentRedirect).toHaveBeenCalledWith('/login');
    });

    it('should return error if user not found', async () => {
      const formData = new FormData();
      formData.append('userId', '1');
      formData.append('password', 'password');

      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await deleteAccount({}, formData);

      expect(result).toEqual({
        message: 'You are not allowed to perform this action.',
        success: false,
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile if user is admin', async () => {
      mocks.getCurrentSession.mockResolvedValue({
        user: { id: 1, role: 'admin' },
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 2,
        name: null,
        email: '',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);

      const result = await getProfile(2);

      expect(result).toMatchObject({ id: 2 });
    });

    it('should return null if user is not admin and not the owner', async () => {
      mocks.getCurrentSession.mockResolvedValue({
        user: { id: 1, role: 'user' },
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 2,
        name: null,
        email: '',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);

      const result = await getProfile(2);

      expect(result).toBeNull();
    });
  });

  describe('updateMFA', () => {
    it('should update MFA successfully', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      formData.append('secret', 'secret');
      formData.append('password', 'password');

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        name: null,
        email: '',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);
      prismaMock.user.update.mockResolvedValue({
        id: 1,
        name: null,
        email: '',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);
      mocks.validateTOTP.mockReturnValue(true);

      const result = await updateMFA({}, formData);

      expect(result).toMatchObject({
        success: true,
        message:
          'MFA device has been updated successfully you can refresh this page.',
      });
    });

    it('should return error if OTP is not valid', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      formData.append('secret', 'secret');
      formData.append('password', 'invalidPassword');
      mocks.validateTOTP.mockReturnValue(false);

      const result = await updateMFA({}, formData);

      expect(result).toEqual({
        data: { secret: 'secret', password: 'invalidPassword' },
        message: 'OTP is not valid.',
      });
    });
  });

  describe('deleteMFA', () => {
    beforeEach(() => {
      mocks.getCurrentSession.mockResolvedValue({
        user: { id: 1, role: 'user' },
      });
    });

    it('should delete MFA successfully', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      formData.append('password', 'password');

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        secret: 'secret',
        name: null,
        email: '',
        password: '',
        mfa: false,
        role: '',
        terms: '',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
      } as User);
      prismaMock.user.update.mockResolvedValue({
        id: 1,
        name: null,
        email: '',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);
      mocks.validateTOTP.mockReturnValue(true);

      const result = await deleteMFA({}, formData);

      expect(result).toEqual({
        success: true,
        message: 'Your device has been deleted you can refresh this page.',
      });
    });

    it('should return error if OTP is not valid', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      formData.append('password', 'invalidPassword');

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        secret: 'secret',
        name: null,
        email: '',
        password: '',
        mfa: false,
        role: '',
        terms: '',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
      } as User);
      mocks.validateTOTP.mockReturnValue(false);

      const result = await deleteMFA({}, formData);

      expect(result).toEqual({
        data: { password: 'invalidPassword' },
        message: 'OTP is not valid.',
      });
    });

    it('should delete MFA using email code', async () => {
      const formData = new FormData();
      formData.append('id', '1');
      formData.append('password', '123456');

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        secret: 'secret',
        name: null,
        email: '',
        password: '',
        mfa: false,
        role: '',
        terms: '',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        mfaCode: '123456',
        mfaCodeSentAt: new Date(),
      } as User);
      prismaMock.user.update.mockResolvedValue({
        id: 1,
        name: null,
        email: '',
        password: '',
        secret: null,
        role: 'user',
        terms: 'accept',
        sortBoardsBy: 'created_desc',
        sortNotesBy: 'created_desc',
        failedAttempts: null,
        lockUntil: null,
        mfaCode: null,
        mfaCodeSentAt: null,
        mfa: false,
      } as User);
      mocks.validateTOTP.mockReturnValue(false);

      const result = await deleteMFA({}, formData);

      expect(result).toEqual({
        success: true,
        message: 'Your device has been deleted you can refresh this page.',
      });
    });

    it('should send email with code for deletion', async () => {
      mocks.sendMail.mockResolvedValue({ messageId: '123' });
      mocks.generateTOTP.mockReturnValue('123456');
      prismaMock.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        secret: 'secret',
        mfaCode: null,
        mfaCodeSentAt: null,
      } as User);
      prismaMock.user.update.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        secret: 'secret',
        mfaCode: '123456',
        mfaCodeSentAt: new Date(),
      } as User);

      await sendOTP();

      expect(prismaMock.user.update).toBeCalledWith({
        where: { id: 1 },
        data: {
          mfaCode: '123456',
          mfaCodeSentAt: expect.any(Date),
        },
      });
      expect(mocks.createAndVerifyTransporter).toBeCalled();
    });
  });

  describe('enableEncryption', () => {
    const formData = new FormData();
    formData.append('userId', '1');
    formData.append('password', 'password');

    it('returns error when ENCRYPTION_MASTER_KEY is not set', async () => {
      const original = process.env.ENCRYPTION_MASTER_KEY;
      delete process.env.ENCRYPTION_MASTER_KEY;

      const result = await enableEncryption(undefined, formData);

      expect(result).toEqual({
        message: 'Encryption is not configured on this server.',
        success: false,
      });

      process.env.ENCRYPTION_MASTER_KEY = original;
    });

    it('returns error when user is not authenticated', async () => {
      process.env.ENCRYPTION_MASTER_KEY = 'a'.repeat(64);
      mocks.getCurrentSession.mockResolvedValue({ user: null, session: null });

      const result = await enableEncryption(undefined, formData);

      expect(result).toEqual({ message: 'Unauthorized', success: false });

      delete process.env.ENCRYPTION_MASTER_KEY;
    });

    it('returns error when password is incorrect', async () => {
      process.env.ENCRYPTION_MASTER_KEY = 'a'.repeat(64);
      mocks.getCurrentSession.mockResolvedValue({ user: { id: 1 }, session: null });
      mocks.verifyPassword.mockResolvedValueOnce(false);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        password: 'hashed',
        encryptionSalt: null,
        encryptionEnabled: false,
      } as User);

      const result = await enableEncryption(undefined, formData);

      expect(result).toEqual({
        message: 'Current password is incorrect.',
        success: false,
      });

      delete process.env.ENCRYPTION_MASTER_KEY;
    });
  });
});
