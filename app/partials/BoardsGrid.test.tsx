import { cleanup, screen } from '@testing-library/react';
import { Board } from '@/prisma/generated/client';
import { beforeEach, describe, expect, it } from 'vitest';
import BoardsGrid from './BoardsGrid';
import { renderWithIntl } from '@/utils/test/renderWithIntl';

const mockBoards = [
  { id: 1, title: 'Board 1', imageUrl: 'image1.jpg' },
  { id: 2, title: 'Board 2', imageUrl: 'image2.jpg' },
];

describe('BoardsGrid', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders boards provided as props', () => {
    renderWithIntl(<BoardsGrid boards={mockBoards as Board[]} />);
    expect(screen.getByText('Board 1')).toBeDefined();
    expect(screen.getByText('Board 2')).toBeDefined();
  });

  it('renders only create board when no boards are available', () => {
    renderWithIntl(<BoardsGrid boards={[]} />);
    expect(screen.getByText('Create Board')).toBeDefined();
  });
});
