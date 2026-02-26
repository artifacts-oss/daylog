import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Admin from './page';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getSettings: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('../../login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('./lib/actions', () => ({
  getSettings: mocks.getSettings,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('./partials/AdminTabs', () => ({
  default: vi.fn(({ currentUser }: { currentUser: { id: number } }) => (
    <div data-testid="admin-tabs">AdminTabs for user {currentUser?.id}</div>
  )),
}));

describe('Admin Page', () => {
  beforeEach(() => {
    cleanup();
    mocks.redirect.mockClear();
    mocks.getCurrentSession.mockClear();
    mocks.getSettings.mockClear();
  });

  it('should redirect to login if user is not authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });

    try {
      await Admin();
    } catch {
      // In Next.js redirect() throws an error that is caught by the framework
    }

    expect(mocks.redirect).toHaveBeenCalledWith('/login');
  });

  it('should redirect to home if user is not an admin', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, role: 'user' },
    });

    try {
      await Admin();
    } catch {}

    expect(mocks.redirect).toHaveBeenCalledWith('/');
  });

  it('should render admin page if user is an admin', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, role: 'admin' },
    });
    mocks.getSettings.mockResolvedValue({ mfa: true });

    const result = await Admin();
    render(result);

    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByTestId('admin-tabs')).toHaveTextContent(
      'AdminTabs for user 1',
    );
  });
});
