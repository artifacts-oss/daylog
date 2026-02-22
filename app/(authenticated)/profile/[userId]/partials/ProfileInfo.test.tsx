import { User } from '@/prisma/generated/client';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileInfo from './ProfileInfo';

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
  updateProfile: vi.fn(),
}));

vi.mock('react', () => ({ useActionState: mocks.useActionState }));

describe('ProfileInfo', () => {
  const mockProfile: User = {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    secret: null,
    mfa: false,
    role: 'user',
    terms: 'accepted',
  };

  beforeEach(() => {
    cleanup();
  });

  it('renders profile information form', () => {
    render(<ProfileInfo profile={mockProfile} />);

    expect(screen.getByText('Profile Information')).toBeDefined();
    expect(screen.getByLabelText('Name').getAttribute('value')).toEqual(
      'John Doe'
    );
    expect(screen.getByLabelText('E-mail').getAttribute('value')).toEqual(
      'john.doe@example.com'
    );
  });

  it('displays error messages when there are errors', () => {
    mocks.useActionState.mockReturnValueOnce([
      {
        data: {},
        errors: { name: 'Name is required', email: ['Invalid email'] },
        success: false,
        message: '',
      },
      vi.fn(),
      false,
    ]);

    render(<ProfileInfo profile={mockProfile} />);

    expect(screen.getByText('Name is required')).toBeDefined();
    expect(screen.getByText('Invalid email')).toBeDefined();
  });

  it('displays a success message when the form is submitted successfully', () => {
    const successMessage = 'Profile updated successfully';
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

    render(<ProfileInfo profile={mockProfile} />);

    expect(screen.findByText(successMessage)).toBeDefined();
  });

  it('displays a loading state when the form is being submitted', () => {
    mocks.useActionState.mockReturnValueOnce([state, vi.fn(), true]);

    render(<ProfileInfo profile={mockProfile} />);

    const submitButton = screen.getByText(/Save Changes/i);
    expect(submitButton).toBeDisabled();
  });

  it('submits the form with updated profile information', () => {
    const mockAction = vi.fn();
    mocks.useActionState.mockReturnValue([state, mockAction, false]);

    render(<ProfileInfo profile={mockProfile} />);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'jane.doe@example.com' },
    });

    const submitButton = screen.getByText(/Save Changes/i);
    fireEvent.click(submitButton);

    expect(mockAction).toHaveBeenCalled();
  });
});
