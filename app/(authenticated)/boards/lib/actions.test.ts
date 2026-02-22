import { Board, Prisma, User } from '@/prisma/generated/client';
import { prismaMock } from '@/prisma/singleton';
import { removeFile } from '@/utils/storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBoard,
  deleteBoard,
  deleteImage,
  getBoard,
  getBoards,
  getBoardsCount,
  saveImage,
  setUserBoardsSort,
  updateBoard,
} from './actions';
import getSorting from '@/utils/sorting';

// Mock S3 environment variables for tests
process.env.S3_ENDPOINT = 'https://mock-s3-endpoint';
process.env.S3_REGION = 'mock-region';
process.env.S3_ACCESS_KEY_ID = 'mock-access-key-id';
process.env.S3_SECRET_ACCESS_KEY = 'mock-secret-access-key';
process.env.S3_BUCKET = 'mock-bucket';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  removeFile: vi.fn(),
  saveBase64File: vi.fn(),
  getSettings: vi.fn(() => ({
    mfa: false,
    allowReg: false,
    allowUnsplash: false,
    enableS3: false,
  })),
  uploadFileS3: vi.fn(),
}));

vi.mock('@/app/api/v1/storage/lib/s3Storage', () => ({
  uploadFileS3: mocks.uploadFileS3,
}));

vi.mock('@/app/(authenticated)/admin/lib/actions', () => ({
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

describe('Board Actions', () => {
  const user: Partial<User> = { id: 1 };
  const board: Partial<Board> = { id: 1, title: 'Test Board', userId: user.id };

  beforeEach(() => {
    mocks.getCurrentSession.mockResolvedValue({ user });
  });

  it('should create a board', async () => {
    prismaMock.board.create.mockResolvedValue({ id: 1 } as Board);
    const newBoard = { title: 'Test Board' };
    const result = await createBoard(newBoard as Prisma.BoardCreateInput);
    expect(result).toBe(1);
    expect(prismaMock.board.create).toHaveBeenCalledWith({
      data: { title: 'Test Board', user: { connect: { id: user.id } } },
      select: { id: true },
    });
  });

  it('should update a board', async () => {
    prismaMock.board.update.mockResolvedValue(board as Board);
    const result = await updateBoard(board as Board);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...updatedBoard } = board;
    expect(result).toEqual(board);
    expect(prismaMock.board.update).toHaveBeenCalledWith({
      where: { id: board.id, userId: user.id },
      data: { ...updatedBoard },
    });
  });

  it('should delete a board', async () => {
    prismaMock.board.delete.mockResolvedValue(board as Board);
    const result = await deleteBoard(board as Board);
    expect(result).toEqual(board);
    expect(prismaMock.board.delete).toHaveBeenCalledWith({
      where: { id: board.id, userId: user.id },
    });
  });

  it('should get boards count', async () => {
    prismaMock.board.count.mockResolvedValue(1);
    const result = await getBoardsCount();
    expect(result).toBe(1);
    expect(prismaMock.board.count).toHaveBeenCalledWith({
      where: { userId: user.id },
    });
  });

  it('should set user boards sort', async () => {
    prismaMock.user.update.mockResolvedValue(user as User);
    const result = await setUserBoardsSort('created_desc');
    expect(result).toBeUndefined();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { sortBoardsBy: 'created_desc' },
    });
  });

  it('should get all boards', async () => {
    prismaMock.board.findMany.mockResolvedValue([board as Board]);
    const result = await getBoards('created_desc');
    expect(result).toEqual([board]);
    expect(prismaMock.board.findMany).toHaveBeenCalledWith({
      where: { userId: user.id },
      take: 10,
      orderBy: [getSorting('created_desc')],
    });
  });

  it('should get a board by id', async () => {
    prismaMock.board.findFirst.mockResolvedValue(board as Board);
    const result = await getBoard(board.id!);
    expect(result).toEqual(board);
    expect(prismaMock.board.findFirst).toHaveBeenCalledWith({
      where: { id: board.id, userId: user.id },
    });
  });

  it('should save an image from file', async () => {
    const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...';
    const filepath = 'path/to/image';
    mocks.saveBase64File.mockReturnValue(filepath);
    prismaMock.board.update.mockResolvedValue(board as Board);

    const result = await saveImage(board.id!, imageBase64);
    expect(result).toBe(imageBase64);
    expect(mocks.saveBase64File).toHaveBeenCalledWith(imageBase64);
    expect(prismaMock.board.update).toHaveBeenCalledWith({
      where: { id: board.id, userId: user.id },
      data: { imageUrl: filepath },
    });
  });

  it('should upload image to S3', async () => {
    const boardId = 1;
    const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

    mocks.getSettings.mockResolvedValue({
      mfa: false,
      allowReg: false,
      allowUnsplash: false,
      enableS3: true,
    });

    const key = await saveImage(boardId, imageBase64);

    expect(mocks.uploadFileS3).toHaveBeenCalled();
    expect(key).not.toBeNull();
  });

  it('should save an image from url', async () => {
    const fileurl = 'http://example.com/image.jpg';
    prismaMock.board.update.mockResolvedValue(board as Board);

    const result = await saveImage(board.id!, fileurl);
    expect(result).toBe(fileurl);
    expect(prismaMock.board.update).toHaveBeenCalledWith({
      where: { id: board.id, userId: user.id },
      data: { imageUrl: fileurl },
    });
  });

  it('should delete an image', async () => {
    const filePath = 'path/to/image';
    mocks.removeFile.mockReturnValue(true);
    prismaMock.board.update.mockResolvedValue(board as Board);

    await deleteImage(board.id!, filePath);
    expect(removeFile).toHaveBeenCalledWith(filePath);
    expect(prismaMock.board.update).toHaveBeenCalledWith({
      where: { id: board.id, userId: user.id },
      data: { imageUrl: null },
    });
  });
});
