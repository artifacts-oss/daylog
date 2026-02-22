import { User } from '@/prisma/generated/client';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MultiFAAuth from './MultiFAAuth';

vi.mock('@/utils/crypto');

vi.mock('@/components/OTPInputWrapper', () => ({
  default: vi.fn(),
}));

describe('MultiFAAuth', () => {
  const profileWithMFA: User = {
    id: 1,
    email: 'test@example.com',
    mfa: true,
    name: 'Test User',
    password: 'password123',
    secret: 'secret123',
    role: 'user',
    terms: 'accepted',
  };

  const profileWithoutMFA: User = {
    id: 2,
    email: 'test2@example.com',
    mfa: false,
    name: 'Test User 2',
    password: 'password123',
    secret: 'secret123',
    role: 'user',
    terms: 'accepted',
  };

  beforeEach(() => {
    cleanup();
  });

  it('renders the 2FA Authentication title', () => {
    render(<MultiFAAuth profile={profileWithMFA} />);
    expect(screen.getByText('2FA Authentication')).toBeDefined();
  });

  it('renders the configuration message', () => {
    render(<MultiFAAuth profile={profileWithMFA} />);
    expect(
      screen.getByText('Configure your Account 2FA Authentication')
    ).toBeDefined();
  });

  it('renders ModalUpdate when MFA is not configured', () => {
    render(<MultiFAAuth profile={profileWithoutMFA} />);
    expect(screen.getByText('Configure a TOTP')).toBeDefined();
  });

  it('renders ModalDelete when MFA is configured', () => {
    render(<MultiFAAuth profile={profileWithMFA} />);
    expect(screen.getByText('Delete Device')).toBeDefined();
  });
});
