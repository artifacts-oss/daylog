import { cleanup, screen } from '@testing-library/react';
import { NoteWithBoards } from '../(authenticated)/boards/[id]/notes/lib/types';
import { beforeEach, describe, expect, it } from 'vitest';
import NotesGrid from './NotesGrid';
import { renderWithIntl } from '@/utils/test/renderWithIntl';

const currentDate = new Date();

const mockNotes = [
  {
    id: 1,
    boardsId: 1,
    title: 'Note 1',
    imageUrl: 'note1.jpg',
    updatedAt: currentDate,
  },
  {
    id: 2,
    boardsId: 1,
    title: 'Note 2',
    imageUrl: 'note2.jpg',
    updatedAt: currentDate,
  },
];

describe('NotesGrid', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders notes provided as props', () => {
    renderWithIntl(<NotesGrid notes={mockNotes as unknown as NoteWithBoards[]} />);
    expect(screen.getByText('Note 1')).toBeDefined();
    expect(screen.getByText('Note 2')).toBeDefined();
  });

  it('renders empty message when no notes are available', () => {
    renderWithIntl(<NotesGrid notes={[]} />);
    expect(screen.getByText('No notes found')).toBeDefined();
  });
});
