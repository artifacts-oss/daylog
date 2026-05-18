import { prismaMock } from '@/prisma/singleton';
import { cleanup } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reset } from './actions';
import { User } from '@/prisma/generated/client';

const mocks = vi.hoisted(() => ({
  hashPassword: vi.fn().mockReturnValue('mocked-hash'),
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  ResetFormSchema: vi.fn(),
  createAndVerifyTransporter: vi.fn().mockImplementation(() => ({
    sendMail: mocks.sendMail,
  })),
}));

vi.mock('@/utils/crypto', () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock('@/utils/email', () => ({
  createAndVerifyTransporter: mocks.createAndVerifyTransporter,
}));

describe('reset', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should return errors if form data is invalid', async () => {
    const formData = new FormData();
    formData.append('email', 'invalid-email');

    const result = await reset({}, formData);

    expect(result.errors).toBeDefined();
  });

  it('should return message if email is not registered', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');

    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await reset({}, formData);

    expect(result.message).toBe('This email is not registered.');
  });

  it('should reset password and send email if email is registered', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');

    const user = {
      id: 1,
      name: 'John Doe',
      email: 'test@example.com',
      password: 'password123#',
      mfa: false,
      role: 'user',
      terms: 'accept',
      secret: '',
      sortBoardsBy: 'created_desc',
      sortNotesBy: 'created_desc',
    } as User;
    prismaMock.user.findFirst.mockResolvedValue(user);
    mocks.sendMail.mockResolvedValue({ messageId: '123' });

    const result = await reset({}, formData);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { password: 'mocked-hash' },
    });
    expect(mocks.createAndVerifyTransporter).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('should not reset password if transporter creation fails', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');

    const user = {
      id: 1,
      name: 'John Doe',
      email: 'test@example.com',
      password: 'password123#',
      mfa: false,
      role: 'user',
      terms: 'accept',
      secret: '',
      sortBoardsBy: 'created_desc',
      sortNotesBy: 'created_desc',
    } as User;
    mocks.createAndVerifyTransporter.mockImplementation(() => {
      throw new Error('Transporter creation failed');
    });
    prismaMock.user.findFirst.mockResolvedValue(user);
    mocks.sendMail.mockResolvedValue({ messageId: '123' });

    const result = await reset({}, formData);

    expect(prismaMock.user.update).not.toHaveBeenCalledWith({
      where: { id: user.id },
      data: { password: 'mocked-hash' },
    });
    expect(mocks.createAndVerifyTransporter).toHaveBeenCalled();
    expect(result.message).toBe('An error occurred while resetting your account.');
  });

  it('should return error message if an exception occurs', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');

    vi.spyOn(console, 'error').mockImplementation(() => { });
    prismaMock.user.findFirst.mockRejectedValue(new Error('Database error'));

    const result = await reset({}, formData);

    expect(result.message).toBe(
      'An error occurred while resetting your account.'
    );
  });
});
