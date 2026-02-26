import '@/utils/test/commonMocks';

import Home from '@/app/(authenticated)/page';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getBoardsCount: vi.fn(),
  getLatestBoardImage: vi.fn(),
  getBoards: vi.fn(),
  getNotes: vi.fn(),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('@/app/(authenticated)/lib/actions', () => ({
  getBoardsCount: mocks.getBoardsCount,
  getLatestBoardImage: mocks.getLatestBoardImage,
}));

vi.mock('@/app/(authenticated)/boards/lib/actions', () => ({
  getBoards: mocks.getBoards,
}));

vi.mock('@/app/(authenticated)/boards/[id]/notes/lib/actions', () => ({
  getNotes: mocks.getNotes,
}));

vi.mock('@/app/partials/HomeTabs', () => ({
  default: vi.fn(({ showFav }: { showFav: boolean }) => (
    <div>
      <div data-testid="HomeTabs">HomeTabs</div>
      <div>showFav: {showFav.toString()}</div>
    </div>
  )),
}));

vi.mock('@/app/(authenticated)/components/BoardFavToggle', () => ({
  default: vi.fn(() => <div>BoardFavSwitch</div>),
}));

describe('Home Page', () => {
  const defaultUser = {
    user: {
      name: 'John Doe',
      id: 0,
      email: '',
      password: '',
      secret: null,
      mfa: false,
      role: '',
      terms: '',
      sortBoardsBy: 'created_desc',
      sortNotesBy: 'created_desc',
    },
    session: {
      id: '',
      userId: 0,
      expiresAt: new Date(),
    },
  };

  beforeEach(() => {
    cleanup();
    mocks.getBoards.mockResolvedValue([]);
    mocks.getNotes.mockResolvedValue([]);
    mocks.getBoardsCount.mockResolvedValue(0);
    mocks.getLatestBoardImage.mockResolvedValue(null);
  });

  it('returns null if user is not authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: null,
      session: null,
    });

    const result = await Home({ searchParams: Promise.resolve({}) });

    expect(result).toBeNull();
  });

  it('renders the home page if user is authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue(defaultUser);

    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText('Welcome back, John Doe')).toBeInTheDocument();
  });

  it('renders BoardFavSwitch when boards count is greater than 0', async () => {
    mocks.getCurrentSession.mockResolvedValue(defaultUser);
    mocks.getBoardsCount.mockResolvedValue(5);

    render(await Home({ searchParams: Promise.resolve({ showFav: 'true' }) }));

    expect(screen.getByText('BoardFavSwitch')).toBeInTheDocument();
  });

  it('does not render BoardFavSwitch when boards count is 0', async () => {
    mocks.getCurrentSession.mockResolvedValue(defaultUser);
    mocks.getBoardsCount.mockResolvedValue(0);

    render(await Home({ searchParams: Promise.resolve({ showFav: 'false' }) }));

    expect(screen.queryByText('BoardFavSwitch')).toBeNull();
  });

  it('passes showFav parameter correctly to HomeTabs', async () => {
    mocks.getCurrentSession.mockResolvedValue(defaultUser);
    mocks.getBoardsCount.mockResolvedValue(3);

    render(await Home({ searchParams: Promise.resolve({ showFav: 'true' }) }));

    expect(screen.getByText('HomeTabs')).toBeInTheDocument();
    expect(screen.getByText('showFav: true')).toBeInTheDocument();
  });

  it('passes the latest board image to PageHeader', async () => {
    mocks.getCurrentSession.mockResolvedValue(defaultUser);
    mocks.getLatestBoardImage.mockResolvedValue('http://test.com/latest.png');

    const { container } = render(
      await Home({ searchParams: Promise.resolve({}) }),
    );

    // Check if the image style is rendered in PageHeader
    expect(container.innerHTML).toContain('http://test.com/latest.png');
  });
});
