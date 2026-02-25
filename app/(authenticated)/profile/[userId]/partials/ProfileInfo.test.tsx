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

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useActionState: mocks.useActionState,
  };
});

describe('ProfileInfo', () => {
  const mockProfile = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    secret: null,
    mfa: false,
    role: 'user',
    terms: 'accepted',
  } as User;

  beforeEach(() => {
    cleanup();
  });

  it('renders profile information form', () => {
    render(<ProfileInfo profile={mockProfile} />);

    expect(screen.getByText('Profile Information')).toBeDefined();
    expect(screen.getByLabelText('Name').getAttribute('value')).toEqual(
      'John Doe',
    );
    expect(screen.getByLabelText('E-mail').getAttribute('value')).toEqual(
      'john@example.com',
    );
  });

  it('displays error messages when there are errors', () => {
    const errorMessages = { name: ['Name is required'] };
    mocks.useActionState.mockReturnValue([
      { success: false, message: '', errors: errorMessages, data: {} },
      vi.fn(),
      false,
    ]);
    render(<ProfileInfo profile={mockProfile} />);

    expect(screen.getByText('Name is required')).toBeDefined();
  });

  it('displays a success message when the form is submitted successfully', () => {
    const successMessage = 'Profile updated successfully';
    mocks.useActionState.mockReturnValue([
      { success: true, message: successMessage, errors: {}, data: {} },
      vi.fn(),
      false,
    ]);
    render(<ProfileInfo profile={mockProfile} />);

    expect(screen.getByText(successMessage)).toBeDefined();
  });

  it('displays a loading state when the form is being submitted', () => {
    mocks.useActionState.mockReturnValue([state, vi.fn(), true]);
    render(<ProfileInfo profile={mockProfile} />);

    const submitButton = screen.getByText(/Saving.../i);
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
