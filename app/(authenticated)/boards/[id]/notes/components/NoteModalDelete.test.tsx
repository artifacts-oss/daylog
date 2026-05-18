import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, Mock } from 'vitest';
import NoteModalDelete from './NoteModalDelete';
import { Note } from '@/prisma/generated/client';
import { useRouter } from 'next/navigation';
import { deleteNote } from '../lib/actions';

vi.mock('../lib/actions', () => ({
  deleteNote: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('NoteModalDelete', () => {
  const mockRouterRefresh = vi.fn();

  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    
    if (typeof global.ResizeObserver === 'undefined') {
      global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    }
  });

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
  } as unknown as Note;

  it('renders the delete button', () => {
    render(<NoteModalDelete note={mockNote} />);
    expect(screen.getByRole('button', { name: "Delete note" })).toBeInTheDocument();
  });

  it('opens the dialog when clicked', async () => {
    render(<NoteModalDelete note={mockNote} />);
    fireEvent.click(screen.getByRole('button', { name: "Delete note" }));
    
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Delete Note')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Are you sure you want to delete Test Note?');
  });

  it('calls deleteNote and refreshes on confirm', async () => {
    render(<NoteModalDelete note={mockNote} />);
    fireEvent.click(screen.getByRole('button', { name: "Delete note" }));
    
    const confirmButton = await screen.findByRole('button', { name: 'Confirm Delete' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteNote).toHaveBeenCalledWith(mockNote);
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });
});
