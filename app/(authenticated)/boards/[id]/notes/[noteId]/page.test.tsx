import '@/utils/test/commonMocks';

import { Note } from '@/prisma/generated/client';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotePage from './page';
import PageHeader from '@/components/PageHeader';

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

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    if (namespace === 'Navigation') {
      return (key: string) => {
        if (key === 'home') return 'Inicio';
        if (key === 'boards') return 'Tableros';
        return key;
      };
    }

    if (namespace === 'NotesPage') {
      return (key: string) => {
        if (key === 'fallback') return 'Notas';
        return key;
      };
    }

    return (key: string, values?: Record<string, string | number>) => {
      if (key === 'updatedAt') {
        return `Actualizado el ${values?.date ?? ''} a las ${values?.time ?? ''}`;
      }

      return key;
    };
  }),
  getLocale: vi.fn(async () => 'es'),
}));

vi.mock('@/utils/image', () => ({
  getImageUrlOrFile: (url: string) => url,
}));

vi.mock('@/components/ShareDialog', () => ({
  default: vi.fn(() => <div data-testid="share-dialog" />),
}));

vi.mock('./components/Editor', () => ({
  default: vi.fn(({ note, isOwner }: { note: Note; isOwner: boolean }) => (
    <div data-testid="note" data-is-owner={isOwner.toString()}>
      {note.title}
    </div>
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
    mocks.getBoard.mockResolvedValue({
      id: 1,
      title: 'Test Board',
      userId: 1,
    });
    mocks.getNote.mockResolvedValue({
      id: 1,
      title: 'Test Note',
      updatedAt: new Date('2026-05-16T17:59:00Z'),
    });

    render(
      await NotePage({ params: Promise.resolve({ id: '1', noteId: '1' }) }),
    );

    expect(screen.getByTestId('note')).toBeInTheDocument();
    expect(screen.getByTestId('note')).toHaveAttribute('data-is-owner', 'true');

    const headerProps = vi.mocked(PageHeader).mock.calls[0][0];
    expect(headerProps.breadcrumbs).toEqual([
      { name: 'Inicio', href: '/' },
      { name: 'Tableros', href: '/boards' },
      { name: 'Test Board', href: '/boards/1/notes' },
      { name: 'Test Note', href: '/boards/1/notes/1' },
    ]);
    expect(headerProps.description).toContain('Actualizado el');
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
