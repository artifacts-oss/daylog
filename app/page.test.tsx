import '@/utils/test/commonMocks';

import Home from '@/app/(authenticated)/page';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getBoardsCount: vi.fn(),
  getLatestBoardImage: vi.fn(),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('@/app/(authenticated)/lib/actions', () => ({
  getBoardsCount: mocks.getBoardsCount,
  getLatestBoardImage: mocks.getLatestBoardImage,
}));

const { sectionNames } = vi.hoisted(() => ({
  sectionNames: [
    'ContinueSection',
    'StatsSection',
    'ActivitySection',
    'OnThisDaySection',
    'ForgottenSection',
    'ExpiringSharesSection',
  ],
}));

vi.mock('@/app/(authenticated)/components/HomeSections', () =>
  Object.fromEntries(
    sectionNames.map((name) => [name, () => <div data-testid={name}>{name}</div>]),
  ),
);

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => {
    return (key: string, values?: Record<string, string | number>) => {
      if (key === 'breadcrumb') return 'Home';
      if (key === 'recentActivity') return 'recent activity';
      if (key === 'title') return `Welcome back, ${values?.name ?? ''}`;
      if (key === 'description') {
        return `You have ${values?.count ?? 0} active boards. Here is your ${values?.activity ?? 'recent activity'}.`;
      }

      return key;
    };
  }),
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
    mocks.getBoardsCount.mockResolvedValue(0);
    mocks.getLatestBoardImage.mockResolvedValue(null);
  });

  it('returns null if user is not authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: null,
      session: null,
    });

    const result = await Home();

    expect(result).toBeNull();
  });

  it('renders the home page if user is authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue(defaultUser);

    render(await Home());

    expect(screen.getByText('Welcome back, John Doe')).toBeInTheDocument();
  });

  it('renders every dashboard section', async () => {
    mocks.getCurrentSession.mockResolvedValue(defaultUser);
    mocks.getBoardsCount.mockResolvedValue(3);

    render(await Home());

    sectionNames.forEach((name) => expect(screen.getByTestId(name)).toBeInTheDocument());
  });

  it('passes the latest board image to PageHeader', async () => {
    mocks.getCurrentSession.mockResolvedValue(defaultUser);
    mocks.getLatestBoardImage.mockResolvedValue('http://test.com/latest.png');

    const { container } = render(
      await Home(),
    );

    // Check if the image style is rendered in PageHeader
    expect(container.innerHTML).toContain('http://test.com/latest.png');
  });
});
