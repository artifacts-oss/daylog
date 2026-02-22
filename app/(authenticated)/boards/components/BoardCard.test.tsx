import { stringToColor } from '@/utils/color';
import { truncateWord } from '@/utils/text';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BoardCard from './BoardCard';

const mocks = vi.hoisted(() => ({
  getBoard: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
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

    expect((await screen.findAllByText('Test Board')).length).toBeGreaterThan(
      0
    );
  });

  it('displays the favorite icon filled if the board is marked as favorite', async () => {
    mocks.getBoard.mockResolvedValue(mockBoard);

    render(await BoardCard({ boardId: 1 }));

    expect(screen.getByTestId('filled-heart')).toBeInTheDocument();
  });

  it('displays the board image if imageUrl is provided', async () => {
    mocks.getBoard.mockResolvedValue(mockBoard);

    render(await BoardCard({ boardId: 1 }));

    expect(screen.getByAltText(`Image of ${mockBoard.title}`)).toBeDefined();
  });

  it('displays a colored background if imageUrl is not provided', async () => {
    const boardWithoutImage = { ...mockBoard, imageUrl: null };
    mocks.getBoard.mockResolvedValue(boardWithoutImage);

    render(await BoardCard({ boardId: 1 }));
    const color = stringToColor(boardWithoutImage.title);
    const link = await screen.findByTestId('board-1');
    expect(link).toHaveStyle(`background-color: ${color}`);
  });

  it('displays the truncated board title', async () => {
    const boardWithLargeTitle = {
      ...mockBoard,
      title: 'Irure aute laboris eiusmod minim ad eu.',
    };
    mocks.getBoard.mockResolvedValue(boardWithLargeTitle);

    render(await BoardCard({ boardId: 1 }));

    // Currently truncated to 35 characters.
    const expected = truncateWord(boardWithLargeTitle.title, 35);
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it('displays the board description', async () => {
    mocks.getBoard.mockResolvedValue(mockBoard);

    render(await BoardCard({ boardId: 1 }));

    expect(await screen.findByText('This is a test board')).toBeInTheDocument();
  });

  it('displays the TimeDiff component with the correct updatedAt prop', async () => {
    mocks.getBoard.mockResolvedValue(mockBoard);

    render(await BoardCard({ boardId: 1 }));

    const relativeTimeElement = document.querySelector('relative-time');
    expect(relativeTimeElement).toBeInTheDocument();
  });
});
