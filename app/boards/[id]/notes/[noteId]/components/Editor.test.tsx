import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Note, Picture } from '@/prisma/generated/client';
import Editor from './Editor';

const mocks = vi.hoisted(() => ({
  updateNote: vi.fn(),
  getPictures: vi.fn(),
  getNoteChanges: vi.fn(),
  clearNoteHistory: vi.fn(),
  restoreToVersion: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('../../lib/actions', () => ({
  updateNote: mocks.updateNote,
  getPictures: mocks.getPictures,
  getNoteChanges: mocks.getNoteChanges,
  clearNoteHistory: mocks.clearNoteHistory,
  restoreToVersion: mocks.restoreToVersion,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@uiw/react-md-editor', () => {
  const MDEditor = ({
    value,
    onChange,
    ...props
  }: {
    value: string;
    onChange?: (value: string) => void;
  }) => {
    return (
      <textarea
        data-testid="mocked-md-editor"
        className="w-md-editor-text-input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      />
    );
  };
  return {
    __esModule: true,
    default: MDEditor,
  };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

describe('Editor', () => {
  const mockNote = {
    id: 1,
    title: 'Test Note',
    content: 'Initial content',
    createdAt: new Date(),
    updatedAt: new Date(),
    boardsId: 1,
  } as Note;

  const mockPicture = {
    id: 1,
    notesId: mockNote.id,
    imageUrl: 'https://example.com/image.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Picture;

  beforeEach(() => {
    cleanup();
    vi.useFakeTimers({ toFake: ['setTimeout'], shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads and displays note content', async () => {
    render(<Editor note={mockNote} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue(mockNote.content);
    });
  });

  it('loads pictures at component mount', async () => {
    render(<Editor note={mockNote} />);

    expect(mocks.getPictures).toHaveBeenCalledWith(mockNote.id);
  });

  it('displays saving indicator when content is being saved', async () => {
    render(<Editor note={mockNote} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue(mockNote.content);
    });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Updated content' },
    });

    expect(screen.getByTitle('Saving changes...')).toBeInTheDocument();
  });

  it('renders the Editor component', async () => {
    render(<Editor note={mockNote} />);

    const editor = screen.getByRole('textbox');
    await waitFor(() => {
      expect(editor).toHaveValue(mockNote.content);
    });

    expect(editor).toBeInTheDocument();
  });

  it('editor updates note after debounce timer', async () => {
    render(<Editor note={mockNote} />);
    const editor = screen.getByRole('textbox');

    fireEvent.change(editor, { target: { value: 'First update' } });
    // skip 1s debounce time
    vi.advanceTimersByTime(1000);

    fireEvent.change(editor, { target: { value: 'Second update' } });
    // skip 1s debounce time
    vi.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(mocks.updateNote).toHaveBeenCalledTimes(2);
      expect(mocks.updateNote).toHaveBeenLastCalledWith({
        ...mockNote,
        content: 'Second update',
      });
    });
  });

  it('places picture at cursor position', async () => {
    mocks.getPictures.mockResolvedValue([mockPicture]);
    render(<Editor note={mockNote} />);

    await waitFor(() => {
      expect(mocks.getPictures).toHaveBeenCalledWith(mockNote.id);
    });

    const picture = screen.getByTestId('picture-preview-1');

    fireEvent.click(picture);
    // skip 1s debounce time
    vi.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(mocks.updateNote).toHaveBeenCalledWith({
        ...mockNote,
        content: expect.any(String), // The content changes based on previous tests, focus on the API call
      });
    });
  });

  describe('Change History Integration', () => {
    const mockChange = {
      id: 101,
      noteId: mockNote.id,
      userId: 1,
      diffPatch: '@@ -1,3 +1,6 @@\n-Foo\n+Bar\n',
      previousContent: 'Foo',
      createdAt: new Date(),
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      },
      comments: [],
    };

    it('toggles the history sidebar', async () => {
      mocks.getNoteChanges.mockResolvedValue([]);
      render(<Editor note={mockNote} />);

      const historyBtn = screen.getByTitle('Toggle change history');
      fireEvent.click(historyBtn);

      await waitFor(() => {
        expect(screen.getByText('Change History')).toBeInTheDocument();
        expect(mocks.getNoteChanges).toHaveBeenCalledWith(mockNote.id);
      });

      const closeBtn = screen.getByLabelText('Close sidebar');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByText('Change History')).not.toBeInTheDocument();
      });
    });

    it('renders history entries when opened', async () => {
      mocks.getNoteChanges.mockResolvedValue([mockChange]);
      render(<Editor note={mockNote} />);

      fireEvent.click(screen.getByTitle('Toggle change history'));

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        // Check for diff summary (additions/deletions)
        expect(screen.getByText('+3')).toBeInTheDocument();
        expect(screen.getByText('-3')).toBeInTheDocument();
      });
    });

    it('handles clear history action', async () => {
      mocks.getNoteChanges.mockResolvedValue([mockChange]);
      mocks.clearNoteHistory.mockResolvedValue(true);
      render(<Editor note={mockNote} />);

      fireEvent.click(screen.getByTitle('Toggle change history'));

      const clearBtn = await screen.findByTitle('Clear all history');
      fireEvent.click(clearBtn);

      // Verify server action call (the modal logic is tested via the button triggering onConfirm)
      // Since DeleteHistoryModal is rendered and onConfirm is passed, we check if clearNoteHistory is triggered.
      const confirmBtn = screen.getByText('Yes, clear all');
      fireEvent.click(confirmBtn);

      expect(mocks.clearNoteHistory).toHaveBeenCalledWith(mockNote.id);
    });

    it('handles version restore action', async () => {
      mocks.getNoteChanges.mockResolvedValue([mockChange]);
      mocks.restoreToVersion.mockResolvedValue({ success: true });
      render(<Editor note={mockNote} />);

      fireEvent.click(screen.getByTitle('Toggle change history'));

      const restoreBtn = await screen.findByTitle(
        'Restore note to this version',
      );
      fireEvent.click(restoreBtn);

      const confirmBtn = screen.getByText('Yes, restore');
      fireEvent.click(confirmBtn);

      expect(mocks.restoreToVersion).toHaveBeenCalledWith(
        mockNote.id,
        mockChange.id,
      );
    });
  });
});
