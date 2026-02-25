import { cleanup, render, screen } from '@testing-library/react';
import { Board } from '@/prisma/generated/client';
import { NoteWithBoards } from '../(authenticated)/boards/[id]/notes/lib/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomeTabs from './HomeTabs';

const mocks = vi.hoisted(() => ({
  getBoards: vi.fn(),
  getNotes: vi.fn((boardId) =>
    mockNotes.filter((note) => note.boardsId === boardId),
  ),
  getCurrentSession: vi.fn(),
}));

vi.mock('../boards/lib/actions', () => ({
  getBoards: mocks.getBoards,
}));

vi.mock('../boards/[id]/notes/lib/actions', () => ({
  getNotes: mocks.getNotes,
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

const mockBoards = [
  { id: 1, title: 'Board 1', imageUrl: 'image1.jpg' },
  { id: 2, title: 'Board 2', imageUrl: 'image2.jpg' },
];

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
  {
    id: 3,
    boardsId: 2,
    title: 'Note 3',
    imageUrl: 'note3.jpg',
    updatedAt: currentDate,
  },
  {
    id: 4,
    boardsId: 2,
    title: 'Note 4',
    imageUrl: 'note4.jpg',
    updatedAt: currentDate,
  },
];

describe('HomeTabs', () => {
  beforeEach(() => {
    cleanup();
    mocks.getBoards.mockResolvedValue(mockBoards);
    mocks.getNotes.mockResolvedValue(mockNotes);
    mocks.getCurrentSession.mockResolvedValue({
      user: { sortBoardsBy: 'created_desc', sortNotesBy: 'created_desc' },
    });
  });

  it('renders boards and notes provided as props', () => {
    render(
      <HomeTabs
        boards={mockBoards as Board[]}
        notes={mockNotes as unknown as NoteWithBoards[]}
      />,
    );
    expect(screen.getByText('Board 1')).toBeDefined();
    expect(screen.getByText('Board 2')).toBeDefined();
    expect(screen.getByText('Note 1')).toBeDefined();
    expect(screen.getByText('Note 2')).toBeDefined();
  });

  it('renders only create board when no boards are available', () => {
    render(<HomeTabs boards={[]} notes={[]} />);
    expect(screen.getByText('Create Board')).toBeDefined();
  });

  it('renders message when no notes are available', () => {
    render(<HomeTabs boards={mockBoards as Board[]} notes={[]} />);
    expect(screen.getByText('Board 1')).toBeDefined();
    expect(screen.getByText('No notes found')).toBeDefined();
  });
});
