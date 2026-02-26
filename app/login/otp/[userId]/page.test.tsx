import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OTPLogin from './page';

const mocks = vi.hoisted(() => ({
  getUserMFA: vi.fn(),
  useParams: vi.fn(() => ({ userId: '1' })),
}));

vi.mock('next/navigation', () => ({
  useParams: mocks.useParams,
}));

vi.mock('../../lib/actions', () => ({
  getUserMFA: mocks.getUserMFA,
}));
vi.mock('./partials/OTPLoginForm', () => ({
  default: vi.fn(() => <div>OTPLoginForm</div>),
}));

describe('Home', () => {
  it('renders the OTPLoginForm when MFA is enabled', async () => {
    mocks.getUserMFA.mockResolvedValue(true);
    render(<OTPLogin />);

    expect(await screen.findByText('OTPLoginForm')).toBeInTheDocument();
  });

  it('renders "Access denied" when MFA is not enabled', async () => {
    mocks.getUserMFA.mockResolvedValue(false);

    render(<OTPLogin />);

    expect(await screen.findByText(/Access denied/i)).toBeInTheDocument();
  });
});
