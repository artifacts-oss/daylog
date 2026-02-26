import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

describe('BoardSortSelector', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders correctly', () => {
    render(<BoardSortSelector sortingParam="created_desc" />);

    // The button shows the label for 'created_desc' = 'Newest First'
    expect(screen.getByText('Newest First')).toBeInTheDocument();
  });

  it('sets the correct sorting parameter', () => {
    render(<BoardSortSelector sortingParam="updated_desc" />);

    // The button shows the label for 'updated_desc' = 'Recently Updated'
    expect(screen.getByText('Recently Updated')).toBeInTheDocument();
  });

  it('changes sorting when a different option is selected', async () => {
    const user = userEvent.setup();
    render(<BoardSortSelector sortingParam="created_desc" />);

    // Click the trigger button showing current sort
    await user.click(screen.getByRole('button', { name: /Newest First/i }));

    // Click a different sort option from the dropdown
    const newOption = await screen.findByText('Title: Z-A');
    await user.click(newOption);

    expect(mocks.setUserBoardsSort).toHaveBeenCalledWith('title_desc');
  });
});
