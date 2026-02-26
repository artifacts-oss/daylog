import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterForm from './RegisterForm';

const state = { message: 'Error creating account', success: false };

const mocks = vi.hoisted(() => ({
  signup: vi.fn(() => state),
  useActionState: vi.fn(() => [state, vi.fn(), false]),
}));

vi.mock('../lib/actions', () => ({ signup: mocks.signup }));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useActionState: mocks.useActionState,
  };
});

describe('RegisterForm', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders form elements correctly', () => {
    render(<RegisterForm />);

    expect(
      screen.getByText('Create account', { selector: 'h3' }),
    ).toBeDefined();
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Email address')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(screen.getByLabelText(/I agree to the/i)).toBeDefined();
    expect(screen.getByText('Already have an account?')).toBeDefined();
  });

  it('shows error message when account creation fails', () => {
    render(<RegisterForm />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Account not created')).toBeDefined();
    expect(screen.getByText('Error creating account')).toBeDefined();
  });

  it('shows success message when account is created', () => {
    mocks.useActionState.mockReturnValueOnce([
      { message: '', success: true },
      vi.fn(),
      false,
    ]);

    render(<RegisterForm />);

    expect(screen.getByText('Account created')).toBeDefined();
    expect(
      screen.getByText(/Your account has been created successfully/i),
    ).toBeDefined();
    expect(screen.getByText('Go to login')).toBeDefined();
  });

  it('disables submit button when pending', async () => {
    mocks.useActionState.mockReturnValueOnce([state, vi.fn(), true]);

    render(<RegisterForm />);

    const submitButton = screen.getByRole('button', {
      name: /Creating account.../i,
    });

    expect(submitButton).toBeDisabled();
  });
});
