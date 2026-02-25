import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Backup from './Backup';

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
  backupData: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useActionState: mocks.useActionState,
  };
});

describe('Backup', () => {
  const profile = { id: 1, name: 'John Doe', email: 'john@example.com' };

  beforeEach(() => {
    cleanup();
  });

  it('renders the backup form', () => {
    mocks.useActionState.mockReturnValue([state, vi.fn(), false]);
    render(<Backup profile={profile} />);

    expect(screen.getByText('Backup')).toBeDefined();
    expect(screen.getByText(/Save or export all your data/i)).toBeDefined();
    expect(screen.getByText(/Download Data/i)).toBeDefined();
  });

  it('displays an error message when state has an error', () => {
    const errorMessage = 'An error occurred';
    mocks.useActionState.mockReturnValue([
      { success: false, message: errorMessage, errors: {}, data: {} },
      vi.fn(),
      false,
    ]);
    render(<Backup profile={profile} />);

    expect(screen.getByText(errorMessage)).toBeDefined();
  });

  it('displays the backup data when state is successful', () => {
    const backupData = JSON.stringify({ data: 'backup data' });
    mocks.useActionState.mockReturnValue([
      { success: true, message: '', errors: {}, data: backupData },
      vi.fn(),
      false,
    ]);
    render(<Backup profile={profile} />);

    expect(screen.getByDisplayValue(backupData)).toBeDefined();
    expect(screen.getByText(/Copy JSON/i)).toBeDefined();
  });

  it('disables the submit button when pending', () => {
    mocks.useActionState.mockReturnValue([state, vi.fn(), true]);
    render(<Backup profile={profile} />);

    const submitButton = screen.getByText(/Processing.../i);
    expect(submitButton).toBeDisabled();
  });

  it('calls the action when the form is submitted', () => {
    const mockAction = vi.fn();
    mocks.useActionState.mockReturnValue([state, mockAction, false]);
    render(<Backup profile={profile} />);

    const submitButton = screen.getByText(/Download Data/i);
    fireEvent.click(submitButton);

    expect(mockAction).toHaveBeenCalled();
  });
});
