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
    tr: ({ children, ...restProps }: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, layout, ...rest } = restProps;
      return (
        <tr {...(rest as Record<string, unknown>)}>
          {children as React.ReactNode}
        </tr>
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
      expect(mocks.updateNote).toHaveBeenCalledWith({
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
});
