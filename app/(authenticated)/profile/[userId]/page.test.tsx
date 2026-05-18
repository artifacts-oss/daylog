import '@/utils/test/commonMocks';

import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Profile from './page';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getProfile: vi.fn(),
  getSettings: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('./lib/actions', () => ({
  getProfile: mocks.getProfile,
}));

vi.mock('@/app/(authenticated)/admin/lib/actions', () => ({
  getSettings: mocks.getSettings,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    if (namespace === 'Navigation') {
      return (key: string) => {
        if (key === 'home') return 'Home';
        return key;
      };
    }

    return (key: string) => {
      if (key === 'notFound') return 'No profile page found';
      if (key === 'title') return 'User data';
      if (key === 'description') return 'Manage your profile and backup your data';
      if (key === 'adminNoticeTitle') return 'Admin Notice';
      if (key === 'adminNoticeDescription') return 'You are impersonating this profile as an admin.';
      if (key === 'actionRequiredTitle') return 'Action Required';
      if (key === 'actionRequiredDescription') {
        return '2FA Authentication is not enabled for this profile. It is recommended to enable it for security reasons.';
      }
      return key;
    };
  }),
}));

vi.mock('./partials/DangerZone');
vi.mock('./partials/MultiFAAuth');
vi.mock('./partials/ProfileInfo');
vi.mock('./partials/UpdatePass');
vi.mock('./partials/Backup', () => ({
  default: () => <div>Backup</div>,
}));

describe('Profile Page', () => {
  const mockParams = { userId: '1' };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('should redirect to login if user is not authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    await Profile({ params: Promise.resolve(mockParams) });

    expect(mocks.redirect).toHaveBeenCalledWith('/login');
  });

  it('should render "No profile page found" if profile is null', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: { id: 1 } });
    mocks.getProfile.mockResolvedValue(null);

    render(await Profile({ params: Promise.resolve(mockParams) }));

    expect(screen.getByText('No profile page found')).toBeDefined();
  });

  it('should render profile information if profile is found', async () => {
    const mockProfile = { id: 1, name: 'John Doe' };
    const mockSettings = { mfa: true };

    mocks.getCurrentSession.mockResolvedValue({ user: { id: 1 } });
    mocks.getProfile.mockResolvedValue(mockProfile);
    mocks.getSettings.mockResolvedValue(mockSettings);

    render(await Profile({ params: Promise.resolve(mockParams) }));

    expect(screen.getByText('User data')).toBeDefined();
  });

  it('admin cannot be able to backup data of another user', async () => {
    const mockProfile = { id: 2, name: 'Joane Doe' };
    const mockSettings = { mfa: true };

    mocks.getCurrentSession.mockResolvedValue({ user: { id: 1 } });
    mocks.getProfile.mockResolvedValue(mockProfile);
    mocks.getSettings.mockResolvedValue(mockSettings);

    render(await Profile({ params: Promise.resolve(mockParams) }));

    expect(screen.queryByText('Backup')).not.toBeInTheDocument();
  });

  it('should render advice for impersonating a profile', async () => {
    const mockProfile = { id: 2, name: 'Joane Doe' };
    const mockSettings = { mfa: true };

    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, role: 'admin' },
    });
    mocks.getProfile.mockResolvedValue(mockProfile);
    mocks.getSettings.mockResolvedValue(mockSettings);

    render(await Profile({ params: Promise.resolve(mockParams) }));

    expect(
      screen.getByText('You are impersonating this profile as an admin.'),
    ).toBeDefined();
  });
});
