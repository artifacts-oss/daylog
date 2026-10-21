import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NoteModalForm from './NoteModalForm';

const mocks = vi.hoisted(() => ({
  createNote: vi.fn(),
  saveImage: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/app/(authenticated)/boards/[id]/notes/lib/actions', () => ({
  createNote: mocks.createNote,
  updateNote: vi.fn(),
  deleteImage: vi.fn(),
  saveImage: mocks.saveImage,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: mocks.refresh, push: mocks.push })),
}));

type ImageSectionStubProps = { onImageUrlChange: (url: string) => void };

// Stub: selecting a remote (Unsplash) image is a single click here.
vi.mock('@/components/ImageSection', () => ({
  default: ({ onImageUrlChange }: ImageSectionStubProps) => (
    <button type="button" onClick={() => onImageUrlChange('https://img.test/a.jpg')}>
      pick image
    </button>
  ),
}));

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText('Your note title'), {
    target: { value: 'Draft title' },
  });
  fireEvent.click(screen.getByText('Create'));
}

describe('NoteModalForm create outcomes', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps the modal and draft when creation fails', async () => {
    mocks.createNote.mockResolvedValue(null);
    render(<NoteModalForm boardId={1} modalId="m" mode="create" open={true} />);

    fillAndSubmit();

    await waitFor(() => expect(mocks.createNote).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Create note')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Draft title')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('opens the created note once the cover is saved', async () => {
    mocks.createNote.mockResolvedValue(5);
    mocks.saveImage.mockResolvedValue({});
    render(<NoteModalForm boardId={1} modalId="m" mode="create" open={true} />);

    fireEvent.click(screen.getByText('pick image'));
    fillAndSubmit();

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/boards/1/notes/5'));
    expect(mocks.saveImage).toHaveBeenCalledWith({ noteId: 5, imageUrl: 'https://img.test/a.jpg' });
  });

  it('explains a failed cover upload and retries it without duplicating the note', async () => {
    mocks.createNote.mockResolvedValue(5);
    mocks.saveImage.mockResolvedValueOnce({ error: 'storage' }).mockResolvedValueOnce({});
    render(<NoteModalForm boardId={1} modalId="m" mode="create" open={true} />);

    fireEvent.click(screen.getByText('pick image'));
    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent("The server couldn't store the image");
    expect(screen.getByText('Create note')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/boards/1/notes/5'));
    expect(mocks.createNote).toHaveBeenCalledTimes(1);
    expect(mocks.saveImage).toHaveBeenCalledTimes(2);
  });

  it('refreshes the list when closed after a failed cover upload', async () => {
    mocks.createNote.mockResolvedValue(5);
    mocks.saveImage.mockResolvedValue({ error: 'unauthorized' });
    render(<NoteModalForm boardId={1} modalId="m" mode="create" open={true} />);

    fireEvent.click(screen.getByText('pick image'));
    fillAndSubmit();
    await screen.findByRole('alert');

    // Footer button and the dialog's X both read "Close"; either one closes it.
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
