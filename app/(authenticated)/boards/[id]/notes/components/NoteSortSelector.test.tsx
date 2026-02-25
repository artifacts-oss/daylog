import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NoteSortSelector from './NoteSortSelector';

const mocks = vi.hoisted(() => ({
  setUserNotesSort: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('../lib/actions', () => ({
  setUserNotesSort: mocks.setUserNotesSort,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('NoteSortSelector', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders correctly', () => {
    render(<NoteSortSelector sortingParam="created_desc" boardId={1} />);

    // The button shows the label for 'created_desc' = 'Newest First'
    expect(screen.getByText('Newest First')).toBeInTheDocument();
  });

  it('sets the correct sorting parameter', () => {
    render(<NoteSortSelector sortingParam="updated_desc" boardId={1} />);

    // The button shows the label for 'updated_desc' = 'Recently Updated'
    expect(screen.getByText('Recently Updated')).toBeInTheDocument();
  });

  it('changes sorting when a different option is selected', async () => {
    const user = userEvent.setup();
    render(<NoteSortSelector sortingParam="created_desc" boardId={1} />);

    // Click the trigger button showing current sort
    await user.click(screen.getByRole('button', { name: /Newest First/i }));

    // Click a different sort option from the dropdown
    const newOption = await screen.findByText('Title: Z-A');
    await user.click(newOption);

    expect(mocks.setUserNotesSort).toHaveBeenCalledWith('title_desc');
  });
});
