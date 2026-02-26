import '@/utils/test/commonMocks';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardCardType } from './components/BoardCard';
import Boards from './page';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getBoardsCount: vi.fn(),
  getBoards: vi.fn(),
  getSettings: vi.fn(),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('./lib/actions', () => ({
  getBoardsCount: mocks.getBoardsCount,
  getBoards: mocks.getBoards,
}));

vi.mock('@/app/(authenticated)/admin/lib/actions', () => ({
  getSettings: mocks.getSettings,
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock('@/app/(authenticated)/boards/components/BoardCard', () => ({
  default: vi.fn(({ boardId }: BoardCardType) => (
    <div data-testid={boardId}>{boardId}</div>
  )),
}));

describe('Boards Page', () => {
  const defaultSearchParams = {
    searchParams: Promise.resolve({
      sort: 'created_desc',
    }),
  };

  beforeEach(() => {
    cleanup();
    mocks.getSettings.mockResolvedValue({ allowUnsplash: true });
  });

  it('returns null if user is not authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });
    const result = await Boards(defaultSearchParams);

    expect(result).toBeNull();
  });

  it('renders boards if user is authenticated', async () => {
    const mockBoards = [{ id: 1, name: 'Test Board' }];
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getBoardsCount.mockResolvedValue(1);
    mocks.getBoards.mockResolvedValue(mockBoards);

    render(await Boards(defaultSearchParams));

    await waitFor(() => {
      expect(screen.getByTestId(mockBoards[0].id)).toBeInTheDocument();
    });
  });

  it('shows empty state if no boards are available', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getBoardsCount.mockResolvedValue(0);
    mocks.getBoards.mockResolvedValue([]);

    render(await Boards(defaultSearchParams));

    await waitFor(() => {
      expect(screen.getByText('No boards found')).toBeInTheDocument();
    });
  });
});
