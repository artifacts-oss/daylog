import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BoardSortSelector from './BoardSortSelector';

const mocks = vi.hoisted(() => ({
  setUserBoardsSort: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('../lib/actions', () => ({
  setUserBoardsSort: mocks.setUserBoardsSort,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

describe('BoardSortSelector', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders correctly', () => {
    render(<BoardSortSelector sortingParam="created_desc" />);

    expect(screen.getByText('Title: Z-A')).toBeInTheDocument();
  });

  it('sets the correct sorting parameter', () => {
    render(<BoardSortSelector sortingParam="updated_desc" />);

    expect(screen.getByText('Updated: Newest First')).toBeInTheDocument();
  });

  it('changes sorting when a different option is selected', () => {
    render(<BoardSortSelector sortingParam="created_desc" />);

    // Simulate changing the sorting option
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'updated_desc' },
    });

    expect(screen.getByText('Updated: Newest First')).toBeInTheDocument();
    expect(mocks.setUserBoardsSort).toHaveBeenCalledWith('updated_desc');
  });
});
