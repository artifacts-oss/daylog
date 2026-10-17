import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InlineTitleEditor from './InlineTitleEditor';
import { renderWithIntl } from '@/utils/test/renderWithIntl';

const mocks = vi.hoisted(() => ({
  renameNote: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

describe('InlineTitleEditor', () => {
  afterEach(cleanup);

  it('renames on blur and refreshes; ignores empty titles', async () => {
    mocks.renameNote.mockResolvedValue(true);
    renderWithIntl(<InlineTitleEditor title="Old" onRename={mocks.renameNote} />);
    const input = screen.getByLabelText('Title');

    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.blur(input);
    expect(mocks.renameNote).not.toHaveBeenCalled();
    expect(input).toHaveValue('Old');

    fireEvent.change(input, { target: { value: 'New' } });
    fireEvent.blur(input);
    await waitFor(() => expect(mocks.renameNote).toHaveBeenCalledWith('New'));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it('restores the saved title when the rename rejects', async () => {
    mocks.renameNote.mockRejectedValue(new Error('network'));
    renderWithIntl(<InlineTitleEditor title="Old" onRename={mocks.renameNote} />);
    const input = screen.getByLabelText('Title');

    fireEvent.change(input, { target: { value: 'New' } });
    fireEvent.blur(input);

    await waitFor(() => expect(input).toHaveValue('Old'));
  });
});
