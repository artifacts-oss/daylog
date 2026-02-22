import { Note } from '@/prisma/generated/client';
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NoteModalForm from './NoteModalForm';

const mocks = vi.hoisted(() => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteImage: vi.fn(),
  saveImage: vi.fn(),
  resizeImage: vi.fn(),
  refresh: vi.fn(),
  getImageUrlOrFile: vi.fn(() => 'https://dummy.com/test.jpg'),
}));

vi.mock('@/app/(authenticated)/boards/[id]/notes/lib/actions', () => ({
  createNote: mocks.createNote,
  updateNote: mocks.updateNote,
  deleteImage: mocks.deleteImage,
  saveImage: mocks.saveImage,
}));

vi.mock('@/utils/image', () => ({
  resizeImage: mocks.resizeImage,
  getImageUrlOrFile: mocks.getImageUrlOrFile,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
  })),
}));

describe('NoteModalForm', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders create note form', () => {
    render(<NoteModalForm boardId={1} modalId="testModal" mode="create" />);

    expect(screen.getByText('Create note')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your note title')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Type any simple content')
    ).toBeInTheDocument();
  });

  it('renders update note form', () => {
    const note: Partial<Note> = {
      id: 1,
      title: 'Test Note',
      content: 'Test Content',
      imageUrl: 'test.jpg',
    };
    render(
      <NoteModalForm
        boardId={1}
        modalId="testModal"
        mode="update"
        note={note as Note}
      />
    );

    expect(screen.getByText('Update note')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Note')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Content')).toBeInTheDocument();
  });

  it('submits create note form', async () => {
    mocks.createNote.mockResolvedValue(1);

    render(<NoteModalForm boardId={1} modalId="testModal" mode="create" />);

    fireEvent.change(screen.getByPlaceholderText('Your note title'), {
      target: { value: 'New Note' },
    });
    fireEvent.change(screen.getByPlaceholderText('Type any simple content'), {
      target: { value: 'New Content' },
    });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(mocks.createNote).toHaveBeenCalledWith(
        {
          title: 'New Note',
          content: 'New Content',
        },
        1
      );
    });
  });

  it('submits update note form', async () => {
    const note: Partial<Note> = {
      id: 1,
      title: 'Test Note',
      content: 'Test Content',
      imageUrl: 'test.jpg',
    };

    render(
      <NoteModalForm
        boardId={1}
        modalId="testModal"
        mode="update"
        note={note as Note}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Your note title'), {
      target: { value: 'Updated Note' },
    });
    fireEvent.change(screen.getByPlaceholderText('Type any simple content'), {
      target: { value: 'Updated Content' },
    });

    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(mocks.updateNote).toHaveBeenCalledWith({
        id: 1,
        title: 'Updated Note',
        content: 'Updated Content',
      });
    });
  });

  it('handles image upload', async () => {
    mocks.resizeImage.mockImplementation((file, width, height, callback) => {
      callback('resizedDataUrl');
    });

    const note: Partial<Note> = {
      id: 1,
      title: 'Test Note',
      content: 'Test Content',
      imageUrl: 'test.jpg',
    };

    render(
      <NoteModalForm
        boardId={1}
        modalId="testModal"
        mode="update"
        note={note as Note}
      />
    );

    const file = new File(['dummy content'], 'example.png', {
      type: 'image/png',
    });
    fireEvent.change(screen.getByLabelText('Select image from your device (optional)'), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(mocks.saveImage).toHaveBeenCalledWith(
        1,
        'resizedDataUrl',
        'test.jpg'
      );
    });
  });

  it('handles image removal', async () => {
    const note: Partial<Note> = {
      id: 1,
      title: 'Test Note',
      content: 'Test Content',
      imageUrl: 'test.jpg',
    };

    render(
      <NoteModalForm
        boardId={1}
        modalId="testModal"
        mode="update"
        note={note as Note}
      />
    );

    fireEvent.click(screen.getByText('Remove image'));
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(mocks.deleteImage).toHaveBeenCalledWith(1, 'test.jpg');
    });
  });
});
