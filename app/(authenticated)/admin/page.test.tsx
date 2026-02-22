import '@/utils/test/commonMocks';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import Admin from './page';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getSettings: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('../login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('./lib/actions', () => ({
  getSettings: mocks.getSettings,
}));

vi.mock('./partials/AdminTabs', () => ({
  default: vi.fn(() => <div>AdminTabs</div>),
}));

vi.mock('./partials/UserModal', () => ({
  default: vi.fn(() => <div>UserModal</div>),
}));

vi.mock('./partials/UsersTable', () => ({
  default: vi.fn(({ currentUserId }: { currentUserId: number }) => (
    <div>UsersTable for user {currentUserId}</div>
  )),
}));

vi.mock('./partials/PreferencesTab', () => ({
  default: vi.fn(() => <div>PreferencesTab</div>),
}));

describe('Admin Page', () => {
  const push = vi.fn();

  beforeEach(() => {
    cleanup();
    push.mockClear();
    mocks.getCurrentSession.mockClear();
    mocks.getSettings.mockClear();
    
    (useRouter as Mock).mockReturnValue({
      push,
    });
  });

  it('should redirect to login if user is not authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });
    
    render(<Admin />);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login');
    });
  });

  it('should redirect to home if user is not an admin', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, role: 'user' },
    });

    render(<Admin />);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/');
    });
  });

  it('should render admin page if user is an admin', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, role: 'admin' },
    });
    mocks.getSettings.mockResolvedValue({});

    render(<Admin />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    expect(screen.getByText('UsersTable for user 1')).toBeInTheDocument();
  });
});
