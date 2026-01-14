import '@/utils/test/commonMocks';

import { cleanup, render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Notes from './page';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getNotesCount: vi.fn(),
  getNotes: vi.fn(),
  getBoard: vi.fn(),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('@/app/boards/lib/actions', () => ({
  getBoard: mocks.getBoard,
}));

vi.mock('./lib/actions', () => ({
  getNotes: mocks.getNotes,
  getNotesCount: mocks.getNotesCount,
}));

vi.mock('./components/NoteModalForm');
vi.mock('./components/NoteCard', () => ({
  default: vi.fn(({ noteId }: { noteId: number }) => <div>Note {noteId}</div>),
}));

describe('Home Page', () => {
  const defaultParams = {
    params: Promise.resolve({ id: '1' }),
    searchParams: Promise.resolve({
      sort: 'created_desc',
    }),
  };

  beforeEach(() => {
    cleanup();
  });

  it('should redirect to login if user is not authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });
    mocks.getNotes.mockResolvedValue([]);
    mocks.getNotesCount.mockResolvedValue(0);

    await Notes(defaultParams);

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('should render notes if user is authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getNotes.mockResolvedValue([{ id: 1 }]);
    mocks.getNotesCount.mockResolvedValue(1);
    mocks.getBoard.mockResolvedValue({ id: 1, title: 'Test Board' });

    render(await Notes(defaultParams));

    expect(screen.getByText('Note 1')).toBeInTheDocument();
  });

  it('should show empty notes message if no notes are available', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getNotes.mockResolvedValue([]);
    mocks.getNotesCount.mockResolvedValue(0);
    mocks.getBoard.mockResolvedValue({ id: 1, title: 'Test Board' });

    render(await Notes(defaultParams));

    expect(screen.getByText('Your notes are empty')).toBeInTheDocument();
  });

  it('should redirect to all boards if board not exists', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getNotes.mockResolvedValue([]);
    mocks.getNotesCount.mockResolvedValue(0);
    mocks.getBoard.mockResolvedValue(null);

    await Notes(defaultParams);

    expect(redirect).toHaveBeenCalledWith('/boards');
  })
});
