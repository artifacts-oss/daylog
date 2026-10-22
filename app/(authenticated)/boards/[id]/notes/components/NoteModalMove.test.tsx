import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, Mock, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Note } from '@/prisma/generated/client';
import { getBoards } from '@/app/(authenticated)/boards/lib/actions';
import { moveNote } from '../lib/actions';
import NoteModalMove from './NoteModalMove';

vi.mock('@/app/(authenticated)/boards/lib/actions', () => ({
  getBoards: vi.fn(),
}));

vi.mock('../lib/actions', () => ({
  moveNote: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Radix Select needs layout APIs jsdom lacks; a native select keeps the value logic under test.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: ReactNode;
  }) => (
    <select aria-label="board" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({
    value,
    disabled,
    children,
  }: {
    value: string;
    disabled?: boolean;
    children: ReactNode;
  }) => (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  ),
}));

const note = { id: 10, boardsId: 1 } as unknown as Note;

const boardsPage = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: from + i, title: `Board ${from + i}` }));

afterEach(cleanup);

describe('NoteModalMove', () => {
  const refresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({ refresh });
    vi.mocked(getBoards).mockResolvedValue(boardsPage(1, 3) as never);
    vi.mocked(moveNote).mockResolvedValue(true as never);
  });

  async function openDialog() {
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Move note' }));
    await screen.findByRole('option', { name: 'Board 1' });
    return user;
  }

  it('loads boards on open, disables the current board and the confirm button until a target is chosen', async () => {
    render(<NoteModalMove note={note} />);
    await openDialog();

    expect(getBoards).toHaveBeenCalledWith('title_asc', 100, false, 0);
    expect(screen.getByRole('option', { name: 'Board 1' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Board 2' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
  });

  it('pages through all boards until a short page is returned', async () => {
    vi.mocked(getBoards)
      .mockResolvedValueOnce(boardsPage(1, 100) as never)
      .mockResolvedValueOnce(boardsPage(101, 5) as never);
    render(<NoteModalMove note={note} />);
    await openDialog();

    expect(getBoards).toHaveBeenCalledTimes(2);
    expect(getBoards).toHaveBeenLastCalledWith('title_asc', 100, false, 100);
    expect(screen.getAllByRole('option')).toHaveLength(105 + 1);
  });

  it('moves the note to the selected board, closes and refreshes', async () => {
    render(<NoteModalMove note={note} />);
    const user = await openDialog();

    await user.selectOptions(screen.getByLabelText('board'), 'Board 2');
    await user.click(screen.getByRole('button', { name: 'Move' }));

    await waitFor(() => expect(moveNote).toHaveBeenCalledWith(10, 2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open and does not refresh when the move fails', async () => {
    vi.mocked(moveNote).mockResolvedValue(false as never);
    render(<NoteModalMove note={note} />);
    const user = await openDialog();

    await user.selectOptions(screen.getByLabelText('board'), 'Board 3');
    await user.click(screen.getByRole('button', { name: 'Move' }));

    await waitFor(() => expect(moveNote).toHaveBeenCalledWith(10, 3));
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move' })).toBeEnabled();
  });

  it('resets the previous selection when reopened', async () => {
    render(<NoteModalMove note={note} />);
    const user = await openDialog();
    await user.selectOptions(screen.getByLabelText('board'), 'Board 2');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await openDialog();

    expect(screen.getByLabelText('board')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
  });
});
