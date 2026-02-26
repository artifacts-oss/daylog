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
  deleteImage: vi.fn(),
  savePicture: vi.fn(),
  deletePicture: vi.fn(),
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
  deleteImage: mocks.deleteImage,
  savePicture: mocks.savePicture,
  deletePicture: mocks.deletePicture,
  getNoteChanges: mocks.getNoteChanges,
  clearNoteHistory: mocks.clearNoteHistory,
  restoreToVersion: mocks.restoreToVersion,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img alt="" {...(props as Record<string, unknown>)} />;
  },
}));

vi.mock('@/utils/image', () => ({
  getImageUrlOrFile: (url: string) => url,
  resizeImage: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...restProps }: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, layout, ...rest } = restProps;
      return (
        <div {...(rest as Record<string, unknown>)}>
          {children as React.ReactNode}
        </div>
      );
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@uiw/react-md-editor', () => {
  const MDEditor = ({
    value,
    onChange,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    className,
    ...props
  }: {
    value: string;
    onChange?: (value: string) => void;
    className?: string;
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

describe('Editor', () => {
  let mockNote: Note;

  const mockPicture = {
    id: 1,
    notesId: 1,
    imageUrl: 'https://example.com/image.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Picture;

  beforeEach(() => {
    // Recreate mockNote each test to prevent cross-test mutation
    // (updateNoteHandler does `note.content = content` directly)
    mockNote = {
      id: 1,
      content: 'Initial content',
      createdAt: new Date(),
      updatedAt: new Date(),
      boardsId: 1,
    } as Note;
    localStorage.clear();
    cleanup();
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
      target: { value: 'Updated contentt' },
    });

    expect(screen.getByText('Saving')).toBeInTheDocument();
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
    vi.useFakeTimers({ toFake: ['setTimeout'], shouldAdvanceTime: true });
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
    const noteWithContent = { ...mockNote, content: 'Hello world' };
    render(<Editor note={noteWithContent} />);

    await waitFor(() => {
      expect(mocks.getPictures).toHaveBeenCalledWith(mockNote.id);
    });

    // Open the gallery sidebar so pictures become visible
    const galleryButton = screen.getByRole('button', {
      name: /Open Gallery/i,
    });
    fireEvent.click(galleryButton);

    const picture = await screen.findByTestId('picture-preview-1');

    // Enable fake timers only AFTER async DOM lookups are done
    // (findByTestId uses real setTimeout internally for polling)
    vi.useFakeTimers({ toFake: ['setTimeout'], shouldAdvanceTime: true });

    fireEvent.click(picture);
    // skip 1s debounce time
    vi.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(mocks.updateNote).toHaveBeenCalledWith({
        ...noteWithContent,
        content: '![alt text](https://example.com/image.jpg)Hello world',
      });
    });
  });

  describe('Change History Integration', () => {
    const mockNote = {
      id: 1,
      content: 'Initial content',
      createdAt: new Date(),
      updatedAt: new Date(),
      boardsId: 1,
    } as Note;

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
      render(<Editor note={mockNote} isOwner={true} />);

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

    it('shows delete comment button only to owner or comment author', async () => {
      const mockChangeWithComment = {
        ...mockChange,
        comments: [
          {
            id: 1,
            changeId: 101,
            userId: 2,
            content: 'Other user comment',
            createdAt: new Date(),
            user: { id: 2, name: 'Other User', email: 'other@example.com' },
          },
          {
            id: 2,
            changeId: 101,
            userId: 1,
            content: 'Current user comment',
            createdAt: new Date(),
            user: { id: 1, name: 'Current User', email: 'current@example.com' },
          },
        ],
      };
      mocks.getNoteChanges.mockResolvedValue([mockChangeWithComment]);

      // 1. Render as NOT note owner (userId 1)
      render(<Editor note={mockNote} isOwner={false} currentUserId={1} />);
      fireEvent.click(screen.getByTitle('Toggle change history'));
      fireEvent.click(await screen.findByTitle('Toggle comments'));

      // Should see delete button for own comment (id 2) but NOT for other's (id 1)
      const deleteButtons = screen.getAllByTitle('Delete comment');
      expect(deleteButtons).toHaveLength(1);

      // 2. Render as Note Owner
      cleanup();
      render(<Editor note={mockNote} isOwner={true} currentUserId={3} />);
      fireEvent.click(screen.getByTitle('Toggle change history'));
      fireEvent.click(await screen.findByTitle('Toggle comments'));

      // Note owner should see BOTH delete buttons
      expect(screen.getAllByTitle('Delete comment')).toHaveLength(2);
    });
  });
});
