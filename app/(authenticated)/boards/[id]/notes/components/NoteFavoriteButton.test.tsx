import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import NoteFavoriteButton from './NoteFavoriteButton';
import { Note } from '@/prisma/generated/client';
import { useRouter } from 'next/navigation';
import { updateNote } from '../lib/actions';

vi.mock('../lib/actions', () => ({
  updateNote: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('NoteFavoriteButton', () => {
  const mockRouterRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({
      refresh: mockRouterRefresh,
    });
  });

  afterEach(() => {
    cleanup();
  });

  const mockNote = {
    id: '1',
    title: 'Test Note',
    content: 'Content',
    favorite: false,
    boardId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Note;

  it('renders outline heart when note is not favorited', () => {
    render(<NoteFavoriteButton note={mockNote} />);
    expect(screen.getByText('Add to favorites')).toBeInTheDocument();
    expect(screen.queryByTestId('filled-heart')).not.toBeInTheDocument();
  });

  it('renders solid heart when note is favorited', () => {
    render(<NoteFavoriteButton note={{ ...mockNote, favorite: true }} />);
    expect(screen.getByText('Remove from favorites')).toBeInTheDocument();
    expect(screen.getByTestId('filled-heart')).toBeInTheDocument();
  });

  it('calls updateNote and router.refresh on click', async () => {
    render(<NoteFavoriteButton note={mockNote} />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith({ ...mockNote, favorite: true });
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it('fills the heart before the server responds and reverts if it fails', async () => {
    let rejectUpdate: (e: Error) => void = () => {};
    (updateNote as Mock).mockReturnValue(
      new Promise((_, reject) => {
        rejectUpdate = reject;
      }),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<NoteFavoriteButton note={mockNote} />);

    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByTestId('filled-heart')).toBeInTheDocument();

    rejectUpdate(new Error('network'));
    await waitFor(() =>
      expect(screen.queryByTestId('filled-heart')).not.toBeInTheDocument(),
    );
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });
});
