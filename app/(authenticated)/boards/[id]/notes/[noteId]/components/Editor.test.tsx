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
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@uiw/react-md-editor', () => {
  const MDEditor = ({ value, onChange, ...props }: { value: string; onChange?: (value: string) => void }) => {
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
  const mockNote = {
    id: 1,
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
      expect(mocks.updateNote).toHaveBeenCalledWith({
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
        content: '![alt text](https://example.com/image.jpg)Second update',
      });
    });
  });
});
