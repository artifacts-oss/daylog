import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareDialog from './ShareDialog';
import { createShare, getShareableUsers } from '@/app/(authenticated)/shared/lib/actions';

vi.mock('@/app/(authenticated)/shared/lib/actions', () => ({
  createShare: vi.fn(),
  getShareableUsers: vi.fn(),
}));

const users = [
  { id: 2, name: 'Alice', email: 'alice@x.com', profileImage: null },
  { id: 3, name: null, email: 'bob@x.com', profileImage: null },
];

describe('ShareDialog', () => {
  beforeEach(() => {
    vi.mocked(createShare).mockResolvedValue({ id: 'tok123' } as Awaited<ReturnType<typeof createShare>>);
    vi.mocked(getShareableUsers).mockResolvedValue(users);
  });

  async function openDialog(entityType: 'NOTE' | 'BOARD' = 'NOTE') {
    const user = userEvent.setup();
    render(<ShareDialog entityType={entityType} entityId={5} />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    return { user, dialog: await screen.findByRole('dialog') };
  }

  it('creates a public link, sending an empty password as undefined, and shows it', async () => {
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByRole('button', { name: 'Create Secure Link' }));

    await waitFor(() =>
      expect(createShare).toHaveBeenCalledWith({
        entityType: 'NOTE',
        entityId: 5,
        password: undefined,
        expiresAt: null,
        oneTime: false,
        scope: 'PUBLIC',
        recipientIds: undefined,
        canEdit: false,
      }),
    );
    expect(await within(dialog).findByText('Link Shared Successfully')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue(`${window.location.origin}/share/tok123`)).toBeInTheDocument();
  });

  it('sends password, expiration and one-time for public shares', async () => {
    const { user, dialog } = await openDialog();

    await user.type(within(dialog).getByPlaceholderText('Leave empty for public'), 'secret');
    await user.click(within(dialog).getByText('One-time view'));
    const expiry = dialog.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
    fireEvent.change(expiry, { target: { value: '2030-01-02T03:04' } });
    await user.click(within(dialog).getByRole('button', { name: 'Create Secure Link' }));

    await waitFor(() => expect(createShare).toHaveBeenCalled());
    const arg = vi.mocked(createShare).mock.calls[0][0];
    expect(arg).toMatchObject({ password: 'secret', oneTime: true, scope: 'PUBLIC' });
    expect(arg.expiresAt).toEqual(new Date('2030-01-02T03:04'));
  });

  it('shares with all members without a link or recipients', async () => {
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByText('All members'));
    await user.click(within(dialog).getByRole('button', { name: 'Share' }));

    await waitFor(() =>
      expect(createShare).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'ALL',
          password: undefined,
          oneTime: false,
          recipientIds: undefined,
          canEdit: false,
        }),
      ),
    );
    expect(await within(dialog).findByText('Shared with All Members')).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('requires at least one recipient for specific users and sends the selection with edit permission', async () => {
    const { user, dialog } = await openDialog('NOTE');

    await user.click(within(dialog).getByText('Specific users'));
    const submit = within(dialog).getByRole('button', { name: 'Share' });
    expect(submit).toBeDisabled();
    expect(getShareableUsers).toHaveBeenCalledTimes(1);

    await user.click(await within(dialog).findByText('Alice'));
    await user.click(within(dialog).getByText('bob@x.com'));
    await user.click(within(dialog).getByText('bob@x.com'));
    expect(within(dialog).getByText('1 user selected')).toBeInTheDocument();

    await user.click(within(dialog).getByText('Allow editing'));
    await user.click(submit);

    await waitFor(() =>
      expect(createShare).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'SPECIFIC', recipientIds: [2], canEdit: true }),
      ),
    );
    expect(await within(dialog).findByText('Shared with Selected Users')).toBeInTheDocument();
  });

  it('never grants edit permission on boards', async () => {
    const { user, dialog } = await openDialog('BOARD');

    await user.click(within(dialog).getByText('Specific users'));
    await user.click(await within(dialog).findByText('Alice'));

    expect(within(dialog).queryByText('Allow editing')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Share' }));

    await waitFor(() =>
      expect(createShare).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'BOARD', canEdit: false, recipientIds: [2] }),
      ),
    );
  });

  it('filters recipients by name or email', async () => {
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByText('Specific users'));
    await within(dialog).findByText('Alice');
    const search = within(dialog).getByRole('textbox');
    await user.type(search, 'bob');

    expect(within(dialog).queryByText('Alice')).not.toBeInTheDocument();
    expect(within(dialog).getByText('bob@x.com')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'zzz');
    expect(within(dialog).getByText('No users found')).toBeInTheDocument();
  });

  it('stays on the form and re-enables the submit button when creation fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(createShare).mockRejectedValue(new Error('boom'));
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByRole('button', { name: 'Create Secure Link' }));

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(within(dialog).queryByText('Link Shared Successfully')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create Secure Link' })).toBeEnabled();
    consoleError.mockRestore();
  });

  it('copies the public link to the clipboard', async () => {
    const { user, dialog } = await openDialog();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');

    await user.click(within(dialog).getByRole('button', { name: 'Create Secure Link' }));
    const link = await within(dialog).findByDisplayValue(`${window.location.origin}/share/tok123`);
    await user.click(link.parentElement!.querySelector('button')!);

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/share/tok123`);
  });

  it('resets all options when closed and reopened', async () => {
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByText('All members'));
    await user.click(within(dialog).getByRole('button', { name: 'Share' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Close Dialog' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Share' }));
    const reopened = await screen.findByRole('dialog');

    expect(within(reopened).getByRole('button', { name: 'Create Secure Link' })).toBeInTheDocument();
    expect(within(reopened).getByPlaceholderText('Leave empty for public')).toHaveValue('');
  });
});
