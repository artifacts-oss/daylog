import '@/utils/test/commonMocks';

import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Notes from './page';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getNotesCount: vi.fn(),
  getNotes: vi.fn(),
  getBoard: vi.fn(),
  getSettings: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('@/app/(authenticated)/boards/lib/actions', () => ({
  getBoard: mocks.getBoard,
}));

vi.mock('@/app/(authenticated)/admin/lib/actions', () => ({
  getSettings: mocks.getSettings,
}));

vi.mock('./lib/actions', () => ({
  getNotes: mocks.getNotes,
  getNotesCount: mocks.getNotesCount,
}));

vi.mock('@/utils/image', () => ({
  getImageUrlOrFile: vi.fn((url) => url),
}));

vi.mock('./components/NoteModalForm', () => ({
  default: () => <div data-testid="NoteModalForm" />,
}));

vi.mock('./components/NoteSortSelector', () => ({
  default: () => <div data-testid="NoteSortSelector" />,
}));

vi.mock('./components/NoteCard', () => ({
  default: vi.fn(({ note }: { note: { id: number } }) => (
    <div>Note {note.id}</div>
  )),
}));

describe('Notes Page', () => {
  const defaultParams = {
    params: Promise.resolve({ id: '1' }),
    searchParams: Promise.resolve({
      sort: 'created_desc',
    }),
  };

  beforeEach(() => {
    cleanup();
    mocks.getSettings.mockResolvedValue({ allowUnsplash: true });
  });

  it('should return null if user is not authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });
    mocks.getNotes.mockResolvedValue([]);
    mocks.getNotesCount.mockResolvedValue(0);

    const result = await Notes(defaultParams);

    expect(result).toBeNull();
  });

  it('should render notes if user is authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getNotes.mockResolvedValue([{ id: 1 }]);
    mocks.getNotesCount.mockResolvedValue(1);
    mocks.getBoard.mockResolvedValue({
      id: 1,
      title: 'Test Board',
      updatedAt: new Date(),
    });

    render(await Notes(defaultParams));

    expect(screen.getByText('Note 1')).toBeInTheDocument();
  });

  it('should show empty notes message if no notes are available', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getNotes.mockResolvedValue([]);
    mocks.getNotesCount.mockResolvedValue(0);
    mocks.getBoard.mockResolvedValue({
      id: 1,
      title: 'Test Board',
      updatedAt: new Date(),
    });

    render(await Notes(defaultParams));

    expect(screen.getByText('No notes in this board')).toBeInTheDocument();
  });

  it('should return null if board not exists', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getNotes.mockResolvedValue([]);
    mocks.getNotesCount.mockResolvedValue(0);
    mocks.getBoard.mockResolvedValue(null);

    const result = await Notes(defaultParams);

    expect(result).toBeNull();
  });
});
