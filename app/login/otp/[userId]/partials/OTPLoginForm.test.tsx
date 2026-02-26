import { OTPInputWrapperType } from '@/components/OTPInputWrapper';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OTPLoginForm from './OTPLoginForm';

const state: {
  message: string;
  success: boolean;
  errors: { password?: string[] };
} = {
  message: 'Error login to account',
  success: false,
  errors: { password: [] },
};

const mocks = vi.hoisted(() => ({
  validateMFA: vi.fn(),
  useActionState: vi.fn(() => [state, vi.fn(), false]),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useActionState: mocks.useActionState,
  };
});

vi.mock('@/app/login/lib/actions', () => ({
  validateMFA: mocks.validateMFA,
}));

vi.mock('@/components/OTPInputWrapper', () => ({
  default: vi.fn((props: OTPInputWrapperType) => (
    <input
      data-testid="otp-input"
      onChange={(e) => props.onChange(e.target.value)}
    />
  )),
}));

describe('OTPLoginForm', () => {
  const mockUseActionState = mocks.useActionState;

  beforeEach(() => {
    mockUseActionState.mockReturnValue([state, vi.fn(), false]);
    cleanup();
  });

  it('renders the form with initial state', () => {
    render(<OTPLoginForm userId={1} />);

    expect(screen.getByText('Security Code')).toBeInTheDocument();
    expect(
      screen.getByText('Enter the 6-digit code from your authenticator app'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Verify securely/i }),
    ).toBeInTheDocument();
  });

  it('displays an error message when state has a message', () => {
    mockUseActionState.mockReturnValue([
      { message: 'Error message', success: false, errors: {} },
      vi.fn(),
      false,
    ]);

    render(<OTPLoginForm userId={1} />);

    expect(screen.getByText('Verification failed')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('displays password error when state has password error', () => {
    mockUseActionState.mockReturnValue([
      {
        message: 'error',
        errors: { password: ['Password error'] },
        success: false,
      },
      vi.fn(),
      false,
    ]);

    render(<OTPLoginForm userId={1} />);

    expect(screen.getByText('Password error')).toBeInTheDocument();
  });

  it('calls setPassword on OTP input change', () => {
    render(<OTPLoginForm userId={1} />);

    const otpInput = screen.getByTestId('otp-input');
    fireEvent.change(otpInput, { target: { value: '123456' } });

    expect(otpInput).toHaveValue('123456');
  });

  it('disables the submit button when pending is true', () => {
    mockUseActionState.mockReturnValue([state, vi.fn(), true]);

    render(<OTPLoginForm userId={1} />);

    const submitButton = screen.getByRole('button', { name: /Verifying/i });
    expect(submitButton).toBeDisabled();
  });
});
