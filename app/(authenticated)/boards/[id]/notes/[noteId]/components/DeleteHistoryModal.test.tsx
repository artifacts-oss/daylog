import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DeleteHistoryModal from './DeleteHistoryModal';

type Props = Parameters<typeof DeleteHistoryModal>[0];

const baseProps: Props = {
  isOpen: true,
  onOpenChange: vi.fn(),
  title: 'Title',
  description: 'Description',
  actionLabel: 'Do it',
  onConfirm: vi.fn(),
  isLoading: false,
};

function setup(overrides: Partial<Props> = {}) {
  const props = { ...baseProps, onOpenChange: vi.fn(), onConfirm: vi.fn(), ...overrides };
  render(<DeleteHistoryModal {...props} />);
  return { props, user: userEvent.setup() };
}

describe('DeleteHistoryModal', () => {
  it('renders nothing while closed', () => {
    setup({ isOpen: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm without closing the dialog itself', async () => {
    const { props, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Do it' }));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('requests close on cancel without confirming', async () => {
    const { props, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons and shows the processing label while loading', () => {
    setup({ isLoading: true });

    expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('shows the permanent-deletion warning for danger and the restore warning for primary', () => {
    const { unmount } = render(<DeleteHistoryModal {...baseProps} />);
    expect(screen.getByText(/permanent/i)).toBeInTheDocument();
    unmount();

    render(<DeleteHistoryModal {...baseProps} variant="primary" />);
    expect(screen.getByText(/restore the note content/i)).toBeInTheDocument();
    expect(screen.queryByText(/permanent/i)).not.toBeInTheDocument();
  });
});
