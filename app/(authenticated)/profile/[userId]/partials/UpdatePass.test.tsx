import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UpdatePass from './UpdatePass';

const state = {
  message: '',
  success: false,
  errors: {},
  data: {},
};

const mocks = vi.hoisted(() => ({
  useActionState: vi.fn(() => [state, vi.fn(), false]),
}));

vi.mock('../lib/actions', () => ({
  updatePassword: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useActionState: mocks.useActionState,
  };
});

describe('UpdatePass Component', () => {
  const mockProfile = {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
  };

  beforeEach(() => {
    cleanup();
  });

  it('renders the UpdatePass component', () => {
    render(<UpdatePass userId={1} profile={mockProfile} />);
    expect(screen.getByText('Update Password')).toBeDefined();
  });

  it('shows current password input if profile id matches user id', () => {
    render(<UpdatePass userId={1} profile={mockProfile} />);
    expect(screen.getByLabelText('Current Password')).toBeDefined();
  });

  it('does not show current password input if profile id does not match user id', () => {
    render(<UpdatePass userId={2} profile={mockProfile} />);
    expect(screen.queryAllByLabelText('Current Password')).toEqual([]);
  });

  it('shows error messages when there are errors in the state', () => {
    mocks.useActionState.mockReturnValueOnce([
      {
        data: {},
        errors: {
          current: 'Current password is required',
          password: 'Password is too short',
          confirm: 'Passwords do not match',
        },
        success: false,
        message: '',
      },
      vi.fn(),
      false,
    ]);
    render(<UpdatePass userId={1} profile={mockProfile} />);
    expect(screen.getByText('Current password is required')).toBeDefined();
    expect(screen.getByText('Password is too short')).toBeDefined();
    expect(screen.getByText('Passwords do not match')).toBeDefined();
  });

  it('shows success message when password is updated successfully', () => {
    const successMessage = 'Password updated successfully';
    mocks.useActionState.mockReturnValueOnce([
      {
        data: {},
        errors: {},
        success: true,
        message: successMessage,
      },
      vi.fn(),
      false,
    ]);
    render(<UpdatePass userId={1} profile={mockProfile} />);
    expect(screen.getByText(successMessage)).toBeDefined();
  });

  it('disables the submit button when pending is true', () => {
    mocks.useActionState.mockReturnValueOnce([state, vi.fn(), true]);
    render(<UpdatePass userId={1} profile={mockProfile} />);
    const submitButton = screen.getByText(/Updating.../i);
    expect(submitButton).toBeDisabled();
  });

  it('calls the action function when form is submitted', () => {
    const mockAction = vi.fn();
    mocks.useActionState.mockReturnValue([state, mockAction, false]);
    render(<UpdatePass userId={1} profile={mockProfile} />);

    const submitButton = screen.getByText(/Change Password/i);
    fireEvent.click(submitButton);
    expect(mockAction).toHaveBeenCalled();
  });
});
