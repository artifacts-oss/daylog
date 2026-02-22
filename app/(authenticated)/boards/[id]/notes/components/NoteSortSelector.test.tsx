import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
}));

describe('NoteSortSelector', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders correctly', () => {
    render(<NoteSortSelector sortingParam="created_desc" boardId={1} />);

    expect(screen.getByText('Title: Z-A')).toBeInTheDocument();
  });

  it('sets the correct sorting parameter', () => {
    render(<NoteSortSelector sortingParam="updated_desc" boardId={1} />);

    expect(screen.getByText('Updated: Newest First')).toBeInTheDocument();
  });

  it('changes sorting when a different option is selected', () => {
    render(<NoteSortSelector sortingParam="created_desc" boardId={1} />);

    // Simulate changing the sorting option
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'updated_desc' },
    });

    expect(screen.getByText('Updated: Newest First')).toBeInTheDocument();
    expect(mocks.setUserNotesSort).toHaveBeenCalledWith('updated_desc');
  });
});
