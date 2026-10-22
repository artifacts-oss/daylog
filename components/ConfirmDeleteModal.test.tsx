import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useRouter } from 'next/navigation';
import ConfirmDeleteModal from './ConfirmDeleteModal';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Unknown namespace: the mocked translator returns the message key.
const NAMESPACE = 'ConfirmDeleteModalTest';

describe('ConfirmDeleteModal', () => {
  const refresh = vi.fn();

  beforeEach(() => {
    (useRouter as Mock).mockReturnValue({ refresh });
  });

  async function openDialog() {
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'delete' }));
    await screen.findByRole('dialog');
    return user;
  }

  it('does not delete until confirmed and cancel closes without deleting', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmDeleteModal namespace={NAMESPACE} entityTitle="Foo" onDelete={onDelete} />);

    const user = await openDialog();
    await user.click(screen.getByRole('button', { name: 'cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onDelete).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('deletes, closes and refreshes the router when there is no onSuccess', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmDeleteModal namespace={NAMESPACE} entityTitle="Foo" onDelete={onDelete} />);

    const user = await openDialog();
    await user.click(screen.getByRole('button', { name: 'confirm' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('calls onSuccess instead of refreshing when provided', async () => {
    const onSuccess = vi.fn();
    render(
      <ConfirmDeleteModal
        namespace={NAMESPACE}
        entityTitle="Foo"
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onSuccess={onSuccess}
      />,
    );

    const user = await openDialog();
    await user.click(screen.getByRole('button', { name: 'confirm' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('re-enables the dialog without refreshing when the delete fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onDelete = vi.fn().mockRejectedValue(new Error('not found'));
    render(<ConfirmDeleteModal namespace={NAMESPACE} entityTitle="Foo" onDelete={onDelete} />);

    const user = await openDialog();
    await user.click(screen.getByRole('button', { name: 'confirm' }));

    expect(await screen.findByRole('button', { name: 'confirm' })).toBeEnabled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('disables both actions and shows the deleting label while the delete is pending', async () => {
    let resolveDelete: () => void = () => {};
    const onDelete = vi.fn(
      () => new Promise<void>((resolve) => { resolveDelete = resolve; }),
    );
    render(<ConfirmDeleteModal namespace={NAMESPACE} entityTitle="Foo" onDelete={onDelete} />);

    const user = await openDialog();
    await user.click(screen.getByRole('button', { name: 'confirm' }));

    expect(await screen.findByRole('button', { name: 'deleting' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cancel' })).toBeDisabled();

    resolveDelete();
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });
});
