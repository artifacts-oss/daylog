import { prismaMock } from '@/prisma/singleton';
import { cleanup } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reset, setPassword } from './actions';
import { User } from '@/prisma/generated/client';

const mocks = vi.hoisted(() => ({
  hashPassword: vi.fn().mockReturnValue('mocked-hash'),
  sendMail: vi.fn(),
  createAndVerifyTransporter: vi.fn().mockImplementation(() => ({
    sendMail: mocks.sendMail,
  })),
  randomBytes: vi.fn().mockReturnValue(Buffer.from('a'.repeat(32))),
}));

vi.mock('@/utils/crypto', () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/utils/email', () => ({
  createAndVerifyTransporter: mocks.createAndVerifyTransporter,
}));

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    randomBytes: mocks.randomBytes,
  };
});

const mockUser: User = {
  id: 1,
  name: 'John Doe',
  email: 'test@example.com',
  password: 'password123#',
  mfa: false,
  role: 'user',
  terms: 'accept',
  secret: null,
  sortBoardsBy: 'created_desc',
  sortNotesBy: 'created_desc',
  failedAttempts: 0,
  lockUntil: null,
  mfaCode: null,
  mfaCodeSentAt: null,
  encryptionEnabled: false,
  encryptionSalt: null,
  encryptedDataLocked: false,
  passwordResetToken: null,
  passwordResetExpires: null,
};

describe('reset', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should return errors if form data is invalid', async () => {
    const formData = new FormData();
    formData.append('email', 'invalid-email');

    const result = await reset({}, formData);

    expect(result!.errors).toBeDefined();
  });

  it('should return success even when email is not registered (no enumeration)', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');

    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await reset({}, formData);

    expect(result!.success).toBe(true);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(mocks.createAndVerifyTransporter).not.toHaveBeenCalled();
  });

  it('should store hashed token and send reset link if email is registered', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');

    prismaMock.user.findFirst.mockResolvedValue(mockUser);
    mocks.sendMail.mockResolvedValue({ messageId: '123' });

    const result = await reset({}, formData);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          passwordResetToken: expect.any(String),
          passwordResetExpires: expect.any(Date),
        }),
      }),
    );
    // The password itself must NOT be changed at this stage.
    expect(prismaMock.user.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: expect.any(String) }) }),
    );
    expect(mocks.createAndVerifyTransporter).toHaveBeenCalled();
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('/login/reset/'),
      }),
    );
    expect(result!.success).toBe(true);
  });

  it('should return error message if transporter creation fails', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');

    mocks.createAndVerifyTransporter.mockImplementationOnce(() => {
      throw new Error('Transporter creation failed');
    });
    prismaMock.user.findFirst.mockResolvedValue(mockUser);

    const result = await reset({}, formData);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(result!.message).toBe('An error occurred while resetting your account.');
  });

  it('should return error message if an exception occurs', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');

    vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.user.findFirst.mockRejectedValue(new Error('Database error'));

    const result = await reset({}, formData);

    expect(result!.message).toBe('An error occurred while resetting your account.');
  });
});

describe('setPassword', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should return errors if form data is invalid', async () => {
    const formData = new FormData();
    formData.append('token', 'sometoken');
    formData.append('password', 'short');
    formData.append('confirmPassword', 'short');

    const result = await setPassword({}, formData);

    expect(result!.errors).toBeDefined();
  });

  it('should return error when passwords do not match', async () => {
    const formData = new FormData();
    formData.append('token', 'sometoken');
    formData.append('password', 'validpassword1');
    formData.append('confirmPassword', 'differentpass1');

    const result = await setPassword({}, formData);

    expect(result!.errors?.confirmPassword).toBeDefined();
  });

  it('should return error when token is invalid or expired', async () => {
    const formData = new FormData();
    formData.append('token', 'invalidtoken');
    formData.append('password', 'newpassword1');
    formData.append('confirmPassword', 'newpassword1');

    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await setPassword({}, formData);

    expect(result!.message).toBe(
      'This reset link is invalid or has expired. Please request a new one.',
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('should update password and clear token on valid token', async () => {
    const formData = new FormData();
    formData.append('token', 'validtoken');
    formData.append('password', 'newpassword1');
    formData.append('confirmPassword', 'newpassword1');

    prismaMock.user.findFirst.mockResolvedValue(mockUser);
    prismaMock.user.update.mockResolvedValue(mockUser);

    const result = await setPassword({}, formData);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          password: 'mocked-hash',
          passwordResetToken: null,
          passwordResetExpires: null,
        }),
      }),
    );
    expect(result!.success).toBe(true);
  });

  it('should lock encrypted data and invalidate sessions on reset with encryption', async () => {
    const formData = new FormData();
    formData.append('token', 'validtoken');
    formData.append('password', 'newpassword1');
    formData.append('confirmPassword', 'newpassword1');

    const encryptedUser = { ...mockUser, encryptionEnabled: true };
    prismaMock.user.findFirst.mockResolvedValue(encryptedUser);
    prismaMock.user.update.mockResolvedValue(encryptedUser);

    await setPassword({}, formData);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          encryptedDataLocked: true,
        }),
      }),
    );
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: encryptedUser.id },
    });
  });
});
