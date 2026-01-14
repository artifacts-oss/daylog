import '@/utils/test/commonMocks';

import { Note } from '@/prisma/generated/client';
import { cleanup, render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotePage from './page';

const mocks = vi.hoisted(() => ({
  getNote: vi.fn(),
  getBoard: vi.fn(),
  getCurrentSession: vi.fn(),
}));

vi.mock('@/app/boards/lib/actions', () => ({
  getBoard: mocks.getBoard,
}));

vi.mock('../lib/actions', () => ({
  getNote: mocks.getNote,
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('./components/Editor', () => ({
  default: vi.fn(({ note }: { note: Note }) => (
    <div data-testid="note">{note.title}</div>
  )),
}));

describe('Note Page', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should redirect to login if user is not authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });
    mocks.getNote.mockResolvedValue(null);

    await NotePage({ params: Promise.resolve({ id: '1', noteId: '1' }) });

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('should render note if user is authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getBoard.mockResolvedValue({ id: 1, title: 'Test Board' });
    mocks.getNote.mockResolvedValue({ id: 1, title: 'Test Note' });

    render(await NotePage({ params: Promise.resolve({ id: '1', noteId: '1' }) }));

    expect(screen.getByTestId('note')).toBeInTheDocument();
  });


  it('should redirect to all notes if note not exists', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getBoard.mockResolvedValue({ id: 1, title: 'Test Board' });
    mocks.getNote.mockResolvedValue(null);

    await NotePage({ params: Promise.resolve({ id: '1', noteId: '1' }) });

    expect(redirect).toHaveBeenCalledWith('/boards/1/notes');
  })
});
