import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NoteCoverDialog from './NoteCoverDialog';

type ImageSectionStubProps = {
  onImageFileChange: (file?: File) => void;
  onImageUrlChange: (url: string) => void;
  onDeleteImage?: () => Promise<void>;
};

const mocks = vi.hoisted(() => ({
  saveImage: vi.fn(),
  deleteImage: vi.fn(),
  resizeImage: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('../lib/actions', () => ({
  saveImage: mocks.saveImage,
  deleteImage: mocks.deleteImage,
}));

vi.mock('@/utils/image', () => ({
  resizeImage: mocks.resizeImage,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: mocks.refresh })),
}));

// ImageSection has its own tests; the stub only exposes the callbacks the dialog wires up.
vi.mock('@/components/ImageSection', () => ({
  default: ({ onImageFileChange, onImageUrlChange, onDeleteImage }: ImageSectionStubProps) => (
    <div>
      <button type="button" onClick={() => onImageFileChange(new File(['x'], 'cover.png', { type: 'image/png' }))}>
        pick-file
      </button>
      <button type="button" onClick={() => onImageUrlChange('https://images.unsplash.com/cover.jpg')}>
        pick-url
      </button>
      {onDeleteImage && (
        <button type="button" onClick={() => void onDeleteImage()}>
          delete-cover
        </button>
      )}
    </div>
  ),
}));

const openDialog = () => fireEvent.click(screen.getByRole('button', { name: 'Cover Image' }));
const saveButton = () => screen.getByRole('button', { name: 'Update' });

describe('NoteCoverDialog', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.saveImage.mockResolvedValue({});
    mocks.deleteImage.mockResolvedValue(undefined);
    mocks.resizeImage.mockImplementation(
      (_file: File, _w: number, _h: number, callback: (url: string) => void) =>
        callback('data:image/png;base64,resized'),
    );
  });

  it('opens from the trigger with save disabled until an image is picked', () => {
    render(<NoteCoverDialog noteId={1} noteTitle="Note" />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    openDialog();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('resizes an uploaded file and saves it, replacing the current cover', async () => {
    render(<NoteCoverDialog noteId={7} noteTitle="Note" currentImageUrl="old.jpg" />);
    openDialog();

    fireEvent.click(screen.getByText('pick-file'));
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(mocks.saveImage).toHaveBeenCalledWith({
        noteId: 7,
        imageUrl: 'data:image/png;base64,resized',
      }),
    );
    expect(mocks.resizeImage).toHaveBeenCalledWith(
      expect.any(File), 1920, 1080, expect.any(Function), expect.any(Function),
    );
    expect(mocks.refresh).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('saves a picked URL as-is without resizing', async () => {
    render(<NoteCoverDialog noteId={7} noteTitle="Note" />);
    openDialog();

    fireEvent.click(screen.getByText('pick-url'));
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(mocks.saveImage).toHaveBeenCalledWith({
        noteId: 7,
        imageUrl: 'https://images.unsplash.com/cover.jpg',
      }),
    );
    expect(mocks.resizeImage).not.toHaveBeenCalled();
  });

  it('keeps the dialog open when saving fails', async () => {
    mocks.saveImage.mockResolvedValue({ error: 'storage' });
    render(<NoteCoverDialog noteId={7} noteTitle="Note" />);
    openDialog();

    fireEvent.click(screen.getByText('pick-url'));
    fireEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent("The server couldn't store the image");
    expect(saveButton()).not.toBeDisabled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('shows the error instead of hanging when the file cannot be decoded', async () => {
    mocks.resizeImage.mockImplementation(
      (_file: File, _w: number, _h: number, _callback: (url: string) => void, onError: () => void) => onError(),
    );
    render(<NoteCoverDialog noteId={7} noteTitle="Note" />);
    openDialog();

    fireEvent.click(screen.getByText('pick-file'));
    fireEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent("This file can't be read as an image");
    expect(saveButton()).not.toBeDisabled();
    expect(mocks.saveImage).not.toHaveBeenCalled();
  });

  it('shows a generic error when the request itself fails', async () => {
    mocks.saveImage.mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<NoteCoverDialog noteId={7} noteTitle="Note" />);
    openDialog();

    fireEvent.click(screen.getByText('pick-url'));
    fireEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');
  });

  it('clears the error when the dialog is reopened', async () => {
    mocks.saveImage.mockResolvedValue({ error: 'unauthorized' });
    render(<NoteCoverDialog noteId={7} noteTitle="Note" />);
    openDialog();
    fireEvent.click(screen.getByText('pick-url'));
    fireEvent.click(saveButton());
    await screen.findByRole('alert');

    // Footer button and the dialog's X both read "Close"; either one closes it.
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    openDialog();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('deletes the current cover', async () => {
    render(<NoteCoverDialog noteId={7} noteTitle="Note" currentImageUrl="old.jpg" />);
    openDialog();

    fireEvent.click(screen.getByText('delete-cover'));

    await waitFor(() => expect(mocks.deleteImage).toHaveBeenCalledWith(7));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('offers no delete when the note has no cover', () => {
    render(<NoteCoverDialog noteId={7} noteTitle="Note" />);
    openDialog();

    expect(screen.queryByText('delete-cover')).not.toBeInTheDocument();
  });
});
