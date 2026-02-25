import '@/utils/test/commonMocks';

import { Note } from '@/prisma/generated/client';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotePage from './page';

const mocks = vi.hoisted(() => ({
  getNote: vi.fn(),
  getBoard: vi.fn(),
  getCurrentSession: vi.fn(),
}));

vi.mock('@/app/(authenticated)/boards/lib/actions', () => ({
  getBoard: mocks.getBoard,
}));

vi.mock('../lib/actions', () => ({
  getNote: mocks.getNote,
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('@/utils/image', () => ({
  getImageUrlOrFile: (url: string) => url,
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

  it('should return null if user is not authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({ user: null });
    mocks.getNote.mockResolvedValue(null);

    const result = await NotePage({
      params: Promise.resolve({ id: '1', noteId: '1' }),
    });

    expect(result).toBeNull();
  });

  it('should render note if user is authenticated', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getBoard.mockResolvedValue({ id: 1, title: 'Test Board' });
    mocks.getNote.mockResolvedValue({ id: 1, title: 'Test Note' });

    render(
      await NotePage({ params: Promise.resolve({ id: '1', noteId: '1' }) }),
    );

    expect(screen.getByTestId('note')).toBeInTheDocument();
  });

  it('should return null if note does not exist', async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: { id: 1, name: 'Test User' },
    });
    mocks.getBoard.mockResolvedValue({ id: 1, title: 'Test Board' });
    mocks.getNote.mockResolvedValue(null);

    const result = await NotePage({
      params: Promise.resolve({ id: '1', noteId: '1' }),
    });

    expect(result).toBeNull();
  });
});
