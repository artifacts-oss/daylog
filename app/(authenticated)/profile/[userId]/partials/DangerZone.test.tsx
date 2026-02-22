import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DangerZone from './DangerZone';

const state = {
  message: '',
  success: false,
  errors: {},
  data: {},
};

const mocks = vi.hoisted(() => ({
  useActionState: vi.fn(() => [state, vi.fn(), false]),
}));

vi.mock('react', () => ({ useActionState: mocks.useActionState }));

vi.mock('../lib/actions', () => ({
  deleteAccount: vi.fn(),
}));

describe('DangerZone', () => {
  const profile = { id: 1, name: 'John Doe', email: 'john@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders DangerZone component', () => {
    render(<DangerZone profile={profile} />);
    expect(screen.getByText('Danger Zone')).toBeDefined();
    expect(
      screen.getByText(
        'Once your account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain.'
      )
    ).toBeDefined();
  });

  it('opens modal on delete button click', () => {
    render(<DangerZone profile={profile} />);

    // Firing open modal is not necessary because of Bootstrap, but in case it changes, I'll keep it.
    fireEvent.click(screen.getByText('Delete Account'));

    expect(screen.getByText('Are you sure?')).toBeDefined();
  });

  it('displays error message if state has message', () => {
    mocks.useActionState.mockReturnValue([
      {
        success: false,
        message: 'Error deleting account',
        errors: {},
        data: {},
      },
      vi.fn(),
      false,
    ]);
    render(<DangerZone profile={profile} />);
    fireEvent.click(screen.getByText('Delete Account'));
    expect(screen.getByText('Error deleting account')).toBeDefined();
  });

  it('displays password error if state has password error', () => {
    mocks.useActionState.mockReturnValue([
      {
        success: false,
        message: '',
        errors: { password: 'Password is required' },
        data: {},
      },
      vi.fn(),
      false,
    ]);
    render(<DangerZone profile={profile} />);
    fireEvent.click(screen.getByText('Delete Account'));
    expect(screen.getByText('Password is required')).toBeDefined();
  });

  it('disables submit button when pending', () => {
    mocks.useActionState.mockReturnValue([state, vi.fn(), true]);
    render(<DangerZone profile={profile} />);

    const submitButton = screen.getByText('Delete Account');
    fireEvent.click(submitButton);

    expect(screen.getByText('Yes, delete')).toBeDisabled();
  });
});
