import { truncateWord } from '@/utils/text';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NoteCard from './NoteCard';

const mocks = vi.hoisted(() => ({
  getNote: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/app/(authenticated)/boards/[id]/notes/lib/actions', () => ({
  getNote: mocks.getNote,
}));

vi.mock('@/app/(authenticated)/boards/[id]/notes/components/NoteModalForm');

describe('NoteCard', () => {
  const mockNote = {
    id: 1,
    title: 'Test Note',
    content: 'This is a test note',
    favorite: true,
    imageUrl: 'test-image-url',
    updatedAt: new Date(),
  };

  beforeEach(() => {
    cleanup();
  });

  it('renders without crashing', async () => {
    mocks.getNote.mockResolvedValue(mockNote);

    render(await NoteCard({ noteId: 1 }));

    expect((await screen.findAllByText('Test Note')).length).toBeGreaterThan(0);
  });

  it('displays the favorite icon filled if the note is marked as favorite', async () => {
    mocks.getNote.mockResolvedValue(mockNote);

    render(await NoteCard({ noteId: 1 }));

    expect(screen.getByTestId('filled-heart')).toBeInTheDocument();
  });

  it('displays the note image if imageUrl is provided', async () => {
    mocks.getNote.mockResolvedValue(mockNote);

    render(await NoteCard({ noteId: 1 }));

    expect(screen.getByAltText(`Image of ${mockNote.title}`)).toBeDefined();
  });

  it('displays the truncated note title', async () => {
    const noteWithLargeTitle = {
      ...mockNote,
      title: 'Irure aute laboris eiusmod minim ad eu.',
    };
    mocks.getNote.mockResolvedValue(noteWithLargeTitle);

    render(await NoteCard({ noteId: 1 }));

    // Currently truncated to 35 characters.
    const expected = truncateWord(noteWithLargeTitle.title, 35);
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it('displays the note content', async () => {
    mocks.getNote.mockResolvedValue(mockNote);

    render(await NoteCard({ noteId: 1 }));

    expect(screen.getByText('This is a test note')).toBeInTheDocument();
  });

  it('displays the TimeDiff component with the correct updatedAt prop', async () => {
    mocks.getNote.mockResolvedValue(mockNote);

    render(await NoteCard({ noteId: 1 }));

    const relativeTimeElement = document.querySelector('relative-time');
    expect(relativeTimeElement).toBeInTheDocument();
  });
});
