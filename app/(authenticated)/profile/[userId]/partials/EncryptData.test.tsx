import { User } from '@/prisma/generated/client';
import { cleanup, screen } from '@testing-library/react';
import { renderWithIntl } from '@/utils/test/renderWithIntl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EncryptData from './EncryptData';

const state = { message: '', success: false, errors: {} };

const mocks = vi.hoisted(() => ({
  useActionState: vi.fn(() => [state, vi.fn(), false]),
}));

vi.mock('../lib/actions', () => ({
  enableEncryption: vi.fn(),
  disableEncryption: vi.fn(),
  recoverEncryptedData: vi.fn(),
  wipeEncryptedData: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useActionState: mocks.useActionState };
});

const baseProfile: User = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  password: '',
  secret: null,
  mfa: false,
  role: 'user',
  terms: 'accept',
  sortBoardsBy: 'created_desc',
  sortNotesBy: 'created_desc',
  encryptionEnabled: false,
  encryptionSalt: null,
  encryptedDataLocked: false,
  failedAttempts: null,
  lockUntil: null,
  mfaCode: null,
  mfaCodeSentAt: null,
  passwordResetToken: null,
  passwordResetExpires: null,
};

describe('EncryptData', () => {
  beforeEach(() => {
    cleanup();
  });

  describe('when ENCRYPTION_MASTER_KEY is not configured', () => {
    it('shows the not-configured notice and hides the enable button', () => {
      renderWithIntl(<EncryptData profile={baseProfile} masterKeyConfigured={false} />);

      expect(
        screen.getByText(/ENCRYPTION_MASTER_KEY is not configured/i),
      ).toBeDefined();
      expect(screen.queryByRole('button', { name: /enable encryption/i })).toBeNull();
    });

    it('shows the not-configured notice even when encryption is already enabled', () => {
      renderWithIntl(
        <EncryptData
          profile={{ ...baseProfile, encryptionEnabled: true }}
          masterKeyConfigured={false}
        />,
      );

      expect(
        screen.getByText(/ENCRYPTION_MASTER_KEY is not configured/i),
      ).toBeDefined();
      expect(screen.queryByRole('button', { name: /disable encryption/i })).toBeNull();
    });
  });

  describe('when ENCRYPTION_MASTER_KEY is configured', () => {
    it('shows the enable button when encryption is disabled', () => {
      renderWithIntl(<EncryptData profile={baseProfile} masterKeyConfigured={true} />);

      expect(screen.getByRole('button', { name: /enable encryption/i })).toBeDefined();
    });

    it('shows the disable button when encryption is enabled', () => {
      renderWithIntl(
        <EncryptData
          profile={{ ...baseProfile, encryptionEnabled: true }}
          masterKeyConfigured={true}
        />,
      );

      expect(screen.getByRole('button', { name: /disable encryption/i })).toBeDefined();
    });
  });

  describe('when data is locked', () => {
    it('shows the locked banner regardless of masterKeyConfigured', () => {
      renderWithIntl(
        <EncryptData
          profile={{ ...baseProfile, encryptedDataLocked: true }}
          masterKeyConfigured={false}
        />,
      );

      expect(screen.getByRole('button', { name: /recover with old password/i })).toBeDefined();
    });
  });
});
