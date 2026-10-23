import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChangeHistorySidebar from './ChangeHistorySidebar';
import {
  getNoteChanges,
  clearNoteHistory,
  deleteNoteChange,
  deleteChangeComment,
  restoreToVersion,
} from '../../lib/actions';
import type { NoteChangeWithUser } from '../../lib/types';

vi.mock('../../lib/actions', () => ({
  getNoteChanges: vi.fn(),
  clearNoteHistory: vi.fn(),
  deleteNoteChange: vi.fn(),
  deleteChangeComment: vi.fn(),
  restoreToVersion: vi.fn(),
}));

type ItemStubProps = {
  change: { id: number };
  onDeleteRequest: (id: number) => void;
  onRestoreRequest: (id: number) => void;
  onCommentDeleteRequest: (id: number) => void;
};

// Exposes the item callbacks so the sidebar's confirmation flows can be driven directly.
vi.mock('./ChangeHistoryItem', () => ({
  default: ({ change, onDeleteRequest, onRestoreRequest, onCommentDeleteRequest }: ItemStubProps) => (
    <div data-testid="change-item">
      <button onClick={() => onDeleteRequest(change.id)}>delete-{change.id}</button>
      <button onClick={() => onRestoreRequest(change.id)}>restore-{change.id}</button>
      <button onClick={() => onCommentDeleteRequest(change.id + 1000)}>comment-{change.id}</button>
    </div>
  ),
}));

const changes = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1 })) as unknown as NoteChangeWithUser[];

describe('ChangeHistorySidebar', () => {
  const onClose = vi.fn();
  const onRestoreSuccess = vi.fn();

  beforeEach(() => {
    vi.mocked(getNoteChanges).mockResolvedValue(changes(2));
    vi.mocked(clearNoteHistory).mockResolvedValue(true);
    vi.mocked(deleteNoteChange).mockResolvedValue(true);
    vi.mocked(deleteChangeComment).mockResolvedValue(true);
    vi.mocked(restoreToVersion).mockResolvedValue({ success: true });
  });

  const renderSidebar = (props: Partial<Parameters<typeof ChangeHistorySidebar>[0]> = {}) =>
    render(
      <ChangeHistorySidebar
        noteId={5}
        isOpen
        onClose={onClose}
        onRestoreSuccess={onRestoreSuccess}
        isOwner
        currentUserId={1}
        {...props}
      />,
    );

  it('does not fetch while closed', async () => {
    renderSidebar({ isOpen: false });
    await Promise.resolve();
    expect(getNoteChanges).not.toHaveBeenCalled();
  });

  it('fetches the note changes when opened and shows the empty state', async () => {
    vi.mocked(getNoteChanges).mockResolvedValue([]);
    renderSidebar();

    expect(await screen.findByText('No changes yet')).toBeInTheDocument();
    expect(getNoteChanges).toHaveBeenCalledWith(5);
    expect(screen.queryByTitle('Clear all history')).not.toBeInTheDocument();
  });

  it('refetches when refreshKey changes', async () => {
    const { rerender } = renderSidebar({ refreshKey: 0 });
    await screen.findAllByTestId('change-item');

    rerender(
      <ChangeHistorySidebar noteId={5} isOpen onClose={onClose} refreshKey={1} isOwner />,
    );

    await waitFor(() => expect(getNoteChanges).toHaveBeenCalledTimes(2));
  });

  it('shows four changes at a time and reveals more on demand', async () => {
    vi.mocked(getNoteChanges).mockResolvedValue(changes(6));
    const user = userEvent.setup();
    renderSidebar();

    expect(await screen.findAllByTestId('change-item')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: 'View previous changes' }));

    expect(screen.getAllByTestId('change-item')).toHaveLength(6);
    expect(screen.queryByRole('button', { name: 'View previous changes' })).not.toBeInTheDocument();
  });

  it('calls onClose from the close button', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await screen.findAllByTestId('change-item');

    await user.click(screen.getByRole('button', { name: 'Close sidebar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers "clear all" only to the owner', async () => {
    renderSidebar({ isOwner: false });
    await screen.findAllByTestId('change-item');

    expect(screen.queryByTitle('Clear all history')).not.toBeInTheDocument();
  });

  it('clears the history after confirmation and reloads', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await screen.findAllByTestId('change-item');

    await user.click(screen.getByTitle('Clear all history'));
    expect(clearNoteHistory).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Yes, clear all' }));

    await waitFor(() => expect(clearNoteHistory).toHaveBeenCalledWith(5));
    await waitFor(() => expect(getNoteChanges).toHaveBeenCalledTimes(2));
  });

  it('does not reload when clearing the history fails', async () => {
    vi.mocked(clearNoteHistory).mockResolvedValue(false);
    const user = userEvent.setup();
    renderSidebar();
    await screen.findAllByTestId('change-item');

    await user.click(screen.getByTitle('Clear all history'));
    await user.click(await screen.findByRole('button', { name: 'Yes, clear all' }));

    await waitFor(() => expect(clearNoteHistory).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(getNoteChanges).toHaveBeenCalledTimes(1);
  });

  it('deletes a single change after confirmation', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await screen.findAllByTestId('change-item');

    await user.click(screen.getByRole('button', { name: 'delete-2' }));
    await user.click(await screen.findByRole('button', { name: 'Yes, delete' }));

    await waitFor(() => expect(deleteNoteChange).toHaveBeenCalledWith(2));
    await waitFor(() => expect(getNoteChanges).toHaveBeenCalledTimes(2));
  });

  it('deletes a comment after confirmation', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await screen.findAllByTestId('change-item');

    await user.click(screen.getByRole('button', { name: 'comment-1' }));
    await user.click(await screen.findByRole('button', { name: 'Yes, delete' }));

    await waitFor(() => expect(deleteChangeComment).toHaveBeenCalledWith(1001));
    expect(deleteNoteChange).not.toHaveBeenCalled();
  });

  it('restores a version, notifies the parent and reloads', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await screen.findAllByTestId('change-item');

    await user.click(screen.getByRole('button', { name: 'restore-1' }));
    await user.click(await screen.findByRole('button', { name: 'Yes, restore' }));

    await waitFor(() => expect(restoreToVersion).toHaveBeenCalledWith(5, 1));
    await waitFor(() => expect(onRestoreSuccess).toHaveBeenCalledTimes(1));
    expect(getNoteChanges).toHaveBeenCalledTimes(2);
  });

  it('does not notify the parent when the restore fails', async () => {
    vi.mocked(restoreToVersion).mockResolvedValue({ success: false, error: 'nope' });
    const user = userEvent.setup();
    renderSidebar();
    await screen.findAllByTestId('change-item');

    await user.click(screen.getByRole('button', { name: 'restore-1' }));
    await user.click(await screen.findByRole('button', { name: 'Yes, restore' }));

    await waitFor(() => expect(restoreToVersion).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onRestoreSuccess).not.toHaveBeenCalled();
    expect(getNoteChanges).toHaveBeenCalledTimes(1);
  });
});
