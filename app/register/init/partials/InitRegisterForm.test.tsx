import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InitRegisterForm from './InitRegisterForm';

const state = {
  message: '',
  success: false,
  errors: {},
  data: {},
};

const mocks = vi.hoisted(() => {
  return {
    signupInit: vi.fn(() => state),
    useActionState: vi.fn(() => [state, mocks.signupInit, false]),
    useState: vi.fn(() => [false, vi.fn()]),
  };
});

vi.mock('../lib/actions', () => ({ signupInit: mocks.signupInit }));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useActionState: mocks.useActionState,
    useState: mocks.useState,
  };
});

describe('InitRegisterForm', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders the form correctly', () => {
    mocks.useActionState.mockReturnValueOnce([
      { data: {}, errors: {}, message: '', success: false },
      vi.fn(),
      false,
    ]);

    render(<InitRegisterForm />);
    expect(screen.getByText('Admin registration')).toBeDefined();
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Email address')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(
      screen.getByRole('button', { name: /create admin account/i }),
    ).toBeDefined();
  });

  it('displays error messages when state has errors', () => {
    mocks.useActionState.mockReturnValueOnce([
      {
        data: {},
        errors: {
          name: 'Name is required',
          email: ['Email is required', 'Email is invalid'],
          password: ['Password is required'],
        },
        success: false,
        message: '',
      },
      vi.fn(),
      false,
    ]);

    render(<InitRegisterForm />);

    expect(screen.getByText('Name is required')).toBeDefined();
    expect(screen.getByText(/Email is required/i)).toBeDefined();
    expect(screen.getByText(/Email is invalid/i)).toBeDefined();
    expect(screen.getByText('Password is required')).toBeDefined();
  });

  it('displays a message when account creation fails', () => {
    mocks.useActionState.mockReturnValueOnce([
      {
        data: {},
        errors: {},
        success: false,
        message: 'Account creation failed',
      },
      vi.fn(),
      false,
    ]);

    render(<InitRegisterForm />);

    expect(screen.getByText('Account not created')).toBeDefined();
    expect(screen.getByText('Account creation failed')).toBeDefined();
  });

  it('submits the form with correct data', () => {
    const mockAction = vi.fn();
    mocks.useActionState.mockReturnValueOnce([
      {
        data: {},
        errors: {},
        success: true,
        message: '',
      },
      mockAction,
      false,
    ]);

    render(<InitRegisterForm />);

    fireEvent.change(screen.getByPlaceholderText('Enter name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter email'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'SecurePassword123#' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /create admin account/i }),
    );

    expect(mockAction).toHaveBeenCalled();
  });

  it('disables the submit button when pending', () => {
    mocks.useActionState.mockReturnValueOnce([state, vi.fn(), true]);
    render(<InitRegisterForm />);

    const submitButton = screen.getByText('Creating account...');
    expect(submitButton).toBeDisabled();
  });
});
