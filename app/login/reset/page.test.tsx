import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';

const state = { message: 'Error reseting account', success: false };

const mocks = vi.hoisted(() => ({
  reset: vi.fn(),
  useActionState: vi.fn(() => [state, vi.fn(), false]),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useActionState: mocks.useActionState,
  };
});

vi.mock('./lib/actions.ts', () => ({
  reset: mocks.reset,
}));

describe('Page', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders the page correctly', () => {
    render(<Page />);
    expect(screen.getByText('Forgot password')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Enter your email address and we will send you instructions/i,
      ),
    ).toBeInTheDocument();
  });

  it('shows success message when state.success is true', () => {
    const mockState = { message: '', success: true };
    mocks.useActionState.mockReturnValueOnce([mockState, vi.fn(), false]);

    render(<Page />);
    expect(screen.getByText('Account reset')).toBeInTheDocument();
    expect(
      screen.getByText(/Your account has been reset successfully/i),
    ).toBeInTheDocument();
  });

  it('shows error message when state.message is present', () => {
    const mockState = { message: 'Error resetting account', success: false };
    mocks.useActionState.mockReturnValueOnce([mockState, vi.fn(), false]);

    render(<Page />);
    expect(screen.getByText('Could not reset')).toBeInTheDocument();
    expect(screen.getByText('Error resetting account')).toBeInTheDocument();
  });

  it('displays validation error for email input', () => {
    const mockState = {
      message: 'Error resetting account',
      errors: { email: 'Invalid email' },
      success: false,
    };
    mocks.useActionState.mockReturnValue([mockState, vi.fn(), false]);

    render(<Page />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('disables submit button when pending is true', () => {
    mocks.useActionState.mockReturnValueOnce([
      { message: '', success: false },
      vi.fn(),
      true,
    ]);

    render(<Page />);
    const submitButton = screen.getByRole('button', { name: /Sending.../i });
    expect(submitButton).toBeDisabled();
  });

  it('submits the form', () => {
    const actionMock = vi.fn();
    mocks.useActionState.mockReturnValue([
      { message: '', success: false },
      actionMock,
      false,
    ]);

    render(<Page />);
    const submitButton = screen.getByRole('button', {
      name: /Send me a new password/i,
    });
    fireEvent.click(submitButton);
    expect(actionMock).toHaveBeenCalled();
  });
});
