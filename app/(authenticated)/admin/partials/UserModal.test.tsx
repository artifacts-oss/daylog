import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserModal from './UserModal'; // Adjust the import path as needed

const mocks = vi.hoisted(() => ({
  useActionState: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useActionState: mocks.useActionState,
  };
});

vi.mock('@/app/login/lib/actions');

describe('UserModal', () => {
  beforeEach(() => {
    mocks.useActionState.mockReturnValue([
      { data: {}, errors: {}, success: false },
      vi.fn(),
      false,
    ]);
    cleanup();
  });

  it('renders the modal button', () => {
    render(<UserModal />);
    const button = screen.getByRole('button', { name: /create new user/i });
    expect(button).toBeInTheDocument();
  });

  it('opens the modal when the button is clicked', () => {
    render(<UserModal />);
    const button = screen.getByRole('button', { name: /create new user/i });
    fireEvent.click(button);
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
  });

  it('renders the form inside the modal', () => {
    render(<UserModal />);
    const button = screen.getByRole('button', { name: /create new user/i });
    fireEvent.click(button);
    const form = screen.getByText('New user');
    expect(form).toBeInTheDocument();
  });

  it('displays validation errors', () => {
    mocks.useActionState.mockReturnValue([
      {
        data: {},
        errors: { name: 'Name is required', email: ['Email is invalid'] },
        success: false,
      },
      vi.fn(),
      false,
    ]);
    render(<UserModal />);
    const button = screen.getByRole('button', { name: /create new user/i });
    fireEvent.click(button);
    const nameError = screen.getByText(/name is required/i);
    const emailError = screen.getByText(/email is invalid/i);
    expect(nameError).toBeInTheDocument();
    expect(emailError).toBeInTheDocument();
  });

  it('displays password validation error', () => {
    mocks.useActionState.mockReturnValue([
      {
        data: {},
        errors: { password: ['Password is required'] },
        success: false,
      },
      vi.fn(),
      false,
    ]);
    render(<UserModal />);
    const button = screen.getByRole('button', { name: /create new user/i });
    fireEvent.click(button);
    const passwordError = screen.getByText(/password is required/i);
    expect(passwordError).toBeInTheDocument();
  })
});
