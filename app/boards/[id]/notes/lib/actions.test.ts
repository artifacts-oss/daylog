import { prisma } from '@/prisma/client';
import { Note, Picture } from '@/prisma/generated/client';
import { prismaMock } from '@/prisma/singleton';
import { removeFile, saveBase64File } from '@/utils/storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNote,
  deleteImage,
  deleteNote,
  deletePicture,
  getNote,
  getNotes,
  getNotesCount,
  getPictures,
  saveImage,
  savePicture,
  updateNote,
} from './actions';
import getSorting from '@/utils/sorting';

// Mock S3 environment variables for tests
process.env.S3_ENDPOINT = 'https://mock-s3-endpoint';
process.env.S3_REGION = 'mock-region';
process.env.S3_ACCESS_KEY_ID = 'mock-access-key-id';
process.env.S3_SECRET_ACCESS_KEY = 'mock-secret-access-key';
process.env.S3_BUCKET = 'mock-bucket';

const mocks = vi.hoisted(() => ({
  removeFile: vi.fn(),
  saveBase64File: vi.fn(),
  getCurrentSession: vi.fn(),
  getSettings: vi.fn(() => ({
    mfa: false,
    allowReg: false,
    allowUnsplash: false,
    enableS3: false,
  })),
  uploadFileS3: vi.fn(),
  existsSync: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/app/api/v1/storage/lib/s3Storage', () => ({
  uploadFileS3: mocks.uploadFileS3,
}));

vi.mock('@/app/admin/lib/actions', () => ({
  getSettings: mocks.getSettings,
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

vi.mock('@/utils/storage', () => ({
  removeFile: mocks.removeFile,
  saveBase64File: mocks.saveBase64File,
  generateFileFromBase64: vi.fn().mockReturnValue({
    fileName: 'mocked.jpg',
    buffer: Buffer.from('mocked'),
    ext: 'jpg',
    contentLength: 6,
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('fs', () => {
  return {
    __esModule: true,
    default: {
      existsSync: mocks.existsSync,
    },
  };
});

describe('Note Actions', () => {
  let user: { id: number };

  beforeEach(() => {
    user = { id: 1 };
    vi.clearAllMocks();
    mocks.getCurrentSession.mockResolvedValue({ user });
  });

  it('should create a note', async () => {
    const data = { title: 'Test Note', content: 'Test Content' };
    const boardId = 1;
    const noteId = 1;

    prismaMock.note.create.mockResolvedValue({ id: noteId } as Note);

    const result = await createNote(data, boardId);

    expect(result).toBe(noteId);
    expect(prisma.note.create).toHaveBeenCalledWith({
      data: {
        title: data.title,
        content: data.content,
        boards: { connect: { id: boardId, userId: user.id } },
      },
    });
  });

  it('should update a note', async () => {
    const note: Partial<Note> = {
      id: 1,
      title: 'Updated Note',
      content: 'Updated Content',
    };

    prismaMock.note.update.mockResolvedValue(note as Note);

    const result = await updateNote(note as Note);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...updatedNote } = note;
    expect(result).toEqual(note);
    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: note.id, boards: { userId: user.id } },
      data: { ...updatedNote },
    });
  });

  it('should revalidate notes routes on update', async () => {
    const note: Partial<Note> = {
      id: 1,
      title: 'Updated Note',
      content: 'Updated Content',
      boardsId: 1,
    };

    prismaMock.note.update.mockResolvedValue(note as Note);

    await updateNote(note as Note);

    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/boards/${note.boardsId}/notes`);
  });

  it('should delete a note', async () => {
    const note: Partial<Note> = { id: 1 };

    prismaMock.note.delete.mockResolvedValue(note as Note);

    const result = await deleteNote(note as Note);

    expect(result).toEqual(note);
    expect(prisma.note.delete).toHaveBeenCalledWith({
      where: { id: note.id, boards: { userId: user.id } },
    });
  });

  it('should get notes with boards', async () => {
    const boardId = 1;
    const notes: Partial<Note>[] = [
      { id: 1, title: 'Note 1', createdAt: new Date() },
      { id: 2, title: 'Note 2', createdAt: new Date() },
    ];

    prismaMock.note.findMany.mockResolvedValue(notes as Note[]);

    const result = await getNotes('created_desc', 10, boardId);

    expect(result).toEqual(notes);
    expect(prismaMock.note.findMany).toHaveBeenCalledWith({
      where: { boardsId: boardId, boards: { userId: user.id } },
      include: { boards: true },
      orderBy: [getSorting('created_desc')],
      take: 10,
    });
  });

  it('should get a note', async () => {
    const noteId = 1;
    const note: Partial<Note> = { id: noteId, title: 'Note 1' };

    prismaMock.note.findFirst.mockResolvedValue(note as Note);

    const result = await getNote(noteId);

    expect(result).toEqual(note);
    expect(prisma.note.findFirst).toHaveBeenCalledWith({
      where: { id: noteId, boards: { userId: user.id } },
    });
  });

  it('should get notes count', async () => {
    const boardId = 1;
    const notesCount = 2;

    prismaMock.note.count.mockResolvedValue(notesCount);

    const result = await getNotesCount(boardId);

    expect(result).toBe(notesCount);
    expect(prismaMock.note.count).toHaveBeenCalledWith({
      where: { boardsId: boardId, boards: { userId: user.id } },
    });
  });

  it('should get user notes sorted', async () => {
    const boardId = 1;
    const notes: Partial<Note>[] = [
      { id: 1, title: 'Note 1', createdAt: new Date() },
      { id: 2, title: 'Note 2', createdAt: new Date() },
    ];

    prismaMock.note.findMany.mockResolvedValue(notes as Note[]);

    const result = await getNotes('created_desc', 10, boardId);

    expect(result).toEqual(notes);
    expect(prismaMock.note.findMany).toHaveBeenCalledWith({
      where: { boardsId: boardId, boards: { userId: user.id } },
      include: { boards: true },
      orderBy: [getSorting('created_desc')],
      take: 10,
    });
  });

  it('should save an image from file', async () => {
    const noteId = 1;
    const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
    const filepath = 'path/to/image';

    mocks.saveBase64File.mockReturnValue(filepath);
    prismaMock.note.update.mockResolvedValue({} as Note);

    const result = await saveImage(noteId, imageBase64);

    expect(result).toBe(imageBase64);
    expect(saveBase64File).toHaveBeenCalledWith(imageBase64);
    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: noteId, boards: { userId: user.id } },
      data: { imageUrl: filepath },
    });
  });

  it('should not save image if is not an url or base64', async () => {
    const noteId = 1;
    const fileurl = 'bad-url-or-base64';
    const result = await saveImage(noteId, fileurl);
    expect(result).toBeNull();
  });

  it('should remove existent image when updating note', async () => {
    mocks.existsSync.mockReturnValue(true);
    const noteId = 1;
    const filepath = 'http://example.com/image.jpg';
    const existentFilePath = 'path/to/existent/image.jpg';
    const result = await saveImage(noteId, filepath, existentFilePath);
    expect(result).toBe(filepath);
    expect(mocks.removeFile).toHaveBeenCalledWith(existentFilePath);
  });

  it('should save an image from url', async () => {
    const noteId = 1;
    const fileurl = 'http://example.com/image.jpg';

    prismaMock.note.update.mockResolvedValue({} as Note);

    const result = await saveImage(noteId, fileurl);

    expect(result).toBe(fileurl);
    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: noteId, boards: { userId: user.id } },
      data: { imageUrl: fileurl },
    });
  });

  it('should upload image to S3', async () => {
    const noteId = 1;
    const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

    mocks.getSettings.mockResolvedValue({
      mfa: false,
      allowReg: false,
      allowUnsplash: false,
      enableS3: true,
    });

    const key = await saveImage(noteId, imageBase64);

    expect(mocks.uploadFileS3).toHaveBeenCalled();
    expect(key).not.toBeNull();
  });

  it('should delete an image', async () => {
    const noteId = 1;
    const filePath = 'path/to/image';

    mocks.removeFile.mockReturnValue(true);
    prismaMock.note.update.mockResolvedValue({} as Note);

    await deleteImage(noteId, filePath);

    expect(removeFile).toHaveBeenCalledWith(filePath);
    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: noteId, boards: { userId: user.id } },
      data: { imageUrl: null },
    });
  });

  it('should save picture', async () => {
    const noteId = 1;
    const picture = {
      id: 1,
      notesId: noteId,
      imageUrl: 'https://example.com/image.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Picture;

    prismaMock.note.findUnique.mockResolvedValue({ id: noteId } as Note);
    prismaMock.picture.create.mockResolvedValue(picture);

    const result = await savePicture(noteId, picture.imageUrl);

    expect(result).toEqual(picture.imageUrl);
    expect(prisma.picture.create).toHaveBeenCalledWith({
      data: {
        notesId: noteId,
        imageUrl: picture.imageUrl,
      },
    });
  });

  it('should delete picture', async () => {
    const noteId = 1;
    const picture = {
      id: 1,
      notesId: noteId,
      imageUrl: 'https://example.com/image.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Picture;

    mocks.removeFile.mockReturnValue(true);
    prismaMock.note.findUnique.mockResolvedValue({ id: noteId } as Note);
    prismaMock.picture.findUnique.mockResolvedValue(picture);

    await deletePicture(noteId, picture.id);

    expect(mocks.removeFile).toHaveBeenCalledWith(picture.imageUrl);
    expect(prisma.picture.delete).toHaveBeenCalledWith({
      where: { id: picture.id },
    });
  })

  it('if picture is not removed should not delete picture', async () => {
    const noteId = 1;
    const picture = {
      id: 1,
      notesId: noteId,
      imageUrl: 'https://example.com/image.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Picture;

    mocks.removeFile.mockReturnValue(false);
    prismaMock.note.findUnique.mockResolvedValue({ id: noteId } as Note);
    prismaMock.picture.findUnique.mockResolvedValue(picture);

    await deletePicture(noteId, picture.id);

    expect(mocks.removeFile).toHaveBeenCalledWith(picture.imageUrl);
    expect(prisma.picture.delete).not.toHaveBeenCalled();
  })

  it('should get pictures', async () => {
    const noteId = 1;
    const picture = {
      id: 1,
      notesId: noteId,
      imageUrl: 'https://example.com/image.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Picture;

    prismaMock.note.findUnique.mockResolvedValue({ id: noteId } as Note);
    prismaMock.picture.findMany.mockResolvedValue([picture]);

    const result = await getPictures(noteId);

    expect(result).toEqual([picture]);
    expect(prisma.picture.findMany).toHaveBeenCalledWith({
      where: { notesId: noteId },
    });
  })
});
