import { truncateWord } from '@/utils/text';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BoardCard from './BoardCard';

const mocks = vi.hoisted(() => ({
  getBoard: vi.fn(),
}));

vi.mock('@/app/(authenticated)/admin/lib/actions', () => ({
  getSettings: vi.fn(() => Promise.resolve({ allowUnsplash: true })),
}));

vi.mock('@/utils/image', () => ({
  getImageUrlOrFile: vi.fn((url) => `/api/v1/images?filePath=${url}`),
}));

vi.mock('./BoardModalForm', () => ({
  default: () => <div data-testid="BoardModalForm" />,
}));

vi.mock('./BoardModalDelete', () => ({
  default: () => <div data-testid="BoardModalDelete" />,
}));

vi.mock('./BoardFavoriteButton', () => ({
  default: () => <div data-testid="BoardFavoriteButton" />,
}));

vi.mock('@/app/(authenticated)/boards/lib/actions', () => ({
  getBoard: mocks.getBoard,
}));

describe('BoardCard', () => {
  const mockBoard = {
    id: 1,
    title: 'Test Board',
    description: 'This is a test board',
    favorite: true,
    imageUrl: 'test-image-url',
    updatedAt: new Date(),
  };

  beforeEach(() => {
    cleanup();
  });

  it('renders without crashing', async () => {
    mocks.getBoard.mockResolvedValue(mockBoard);

    render(await BoardCard({ boardId: 1 }));

    expect(screen.getByText('Test Board')).toBeInTheDocument();
  });

  it('displays the favorite indicator if the board is marked as favorite', async () => {
    mocks.getBoard.mockResolvedValue(mockBoard);

    const { container } = render(await BoardCard({ boardId: 1 }));

    // The favorite indicator is a yellow dot div
    const indicator = container.querySelector('.bg-yellow-400');
    expect(indicator).toBeInTheDocument();
  });

  it('displays the board image if imageUrl is provided', async () => {
    mocks.getBoard.mockResolvedValue(mockBoard);

    const { container } = render(await BoardCard({ boardId: 1 }));

    const link = container.querySelector('a[href="/boards/1/notes"]');
    const bgDiv = link?.firstChild as HTMLElement;
    expect(bgDiv.style.backgroundImage).toContain(
      '/api/v1/images?filePath=test-image-url',
    );
  });

  it('displays a colored background if imageUrl is not provided', async () => {
    const boardWithoutImage = { ...mockBoard, imageUrl: null };
    mocks.getBoard.mockResolvedValue(boardWithoutImage);

    const { container } = render(await BoardCard({ boardId: 1 }));

    const link = container.querySelector('a[href="/boards/1/notes"]');
    const bgDiv = link?.firstChild as HTMLElement;

    // JSDOM normalizes colors to rgb(), so we just check it has a background color
    expect(bgDiv.style.backgroundColor).not.toBe('');
  });

  it('displays the truncated board title', async () => {
    const boardWithLargeTitle = {
      ...mockBoard,
      title: 'Irure aute laboris eiusmod minim ad eu deserte.',
    };
    mocks.getBoard.mockResolvedValue(boardWithLargeTitle);

    render(await BoardCard({ boardId: 1 }));

    // Component truncates to 40 characters
    const expected = truncateWord(boardWithLargeTitle.title, 40);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      expected,
    );
  });

  it('displays the board description', async () => {
    mocks.getBoard.mockResolvedValue(mockBoard);

    render(await BoardCard({ boardId: 1 }));

    expect(screen.getByText('This is a test board')).toBeInTheDocument();
  });

  it('renders a relative-time element', async () => {
    mocks.getBoard.mockResolvedValue(mockBoard);

    const { container } = render(await BoardCard({ boardId: 1 }));

    const relativeTimeElement = container.querySelector('relative-time');
    expect(relativeTimeElement).toBeInTheDocument();
  });
});
