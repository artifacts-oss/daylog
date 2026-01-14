import { prismaMock } from '@/prisma/singleton';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signup, validateAllowRegistration } from './actions';
import { User } from '@/prisma/generated/client';

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  hashPassword: vi.fn().mockReturnValue('mocked-hash'),
  SignupFormSchema: vi.fn(),
  redirect: vi.fn(),
  getCurrentSession: vi.fn(),
}));

vi.mock('@/app/admin/lib/actions', () => ({
  getSettings: mocks.getSettings,
}));

vi.mock('@/utils/crypto', async () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

describe('signup', () => {
  const securePassword = 'SecurePassword123#';
  const unsecurePassword = 'UnsecurePassword';
  const mockFormData = (data: Record<string, string>) => {
    const formData = new FormData();
    for (const key in data) {
      formData.append(key, data[key]);
    }
    return formData;
  };

  beforeEach(() => {
    mocks.getSettings.mockResolvedValue({ allowReg: true });
    mocks.getCurrentSession.mockResolvedValue({ user: null });
  });

  it('should return errors if form data is invalid', async () => {
    const formData = mockFormData({
      name: '',
      email: '',
      password: '',
      terms: '',
    });

    const result = await signup({}, formData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should return errors if password is insecure', async () => {
    const formData = mockFormData({
      name: 'John',
      email: 'john@example.com',
      password: unsecurePassword,
      terms: 'on',
    });

    const result = await signup({}, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.password).toBeDefined();
  });

  it('should return error if user already exists', async () => {
    const formData = mockFormData({
      name: 'John',
      email: 'john@example.com',
      password: securePassword,
      terms: 'on',
    });

    mocks.SignupFormSchema.mockReturnValue({
      data: formData,
    });

    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      name: null,
      email: '',
      password: '',
      terms: '',
      secret: null,
      mfa: false,
      role: '',
      sortBoardsBy: 'created_desc',
      sortNotesBy: 'created_desc',
    } as User);

    const result = await signup({}, formData);

    expect(result.success).toEqual(false);
    expect(result.message).toBe('User already exists.');
  });

  it('should create a new user if data is valid and user does not exist', async () => {
    const data = {
      name: 'John',
      email: 'john@example.com',
      password: securePassword,
      terms: 'on',
    };
    const formData = mockFormData(data);
    mocks.SignupFormSchema.mockReturnValue({
      success: true,
      data: formData,
    });
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await signup({}, formData);

    expect(result.success).toBe(true);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { ...data, password: 'mocked-hash', terms: 'accept' },
    });
  });

  it('should return error if an exception occurs', async () => {
    const formData = mockFormData({
      name: 'John',
      email: 'john@example.com',
      password: securePassword,
      terms: 'on',
    });
    mocks.SignupFormSchema.mockReturnValue({
      success: true,
      data: formData,
    });
    prismaMock.user.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await signup({}, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      'An error occurred while creating your account.'
    );
  });

  it('should return not allowed message if registration allowed configuration is false', async () => {
    mocks.getSettings.mockResolvedValue({ allowReg: false });
    const formData = mockFormData({
      name: 'John',
      email: 'john@example.com',
      password: securePassword,
      terms: 'on',
    });
    const result = await signup({}, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Registration is not allowed.');
  })

  it('admin can registrate user even if registration is not allowed', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: { role: 'admin' } });
    mocks.getSettings.mockResolvedValue({ allowReg: false });
    const formData = mockFormData({
      name: 'John',
      email: 'john@example.com',
      password: securePassword,
      terms: 'on',
    });
    const result = await signup({}, formData);

    expect(result.success).toBe(true);
  })
});

describe('validateAllowRegistration', () => {
  it('should return false if registration is not allowed', async () => {
    mocks.getSettings.mockResolvedValue({ allowReg: false });

    const result = await validateAllowRegistration();

    expect(result).toBe(false);
  });

  it('should return true if registration is allowed', async () => {
    mocks.getSettings.mockResolvedValue({ allowReg: true });

    const result = await validateAllowRegistration();

    expect(result).toBe(true);
  });
});
