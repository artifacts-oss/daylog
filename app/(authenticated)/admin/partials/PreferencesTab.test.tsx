import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsType } from '../lib/actions';
import PreferencesTab from './PreferencesTab';

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

vi.mock('../lib/actions', () => ({
  saveSettings: vi.fn(),
}));

const initialSettings: SettingsType = {
  mfa: false,
  allowReg: false,
  allowUnsplash: false,
  enableS3: false,
};

describe('PreferencesTab', () => {
  beforeEach(() => {
    mocks.useActionState.mockReturnValue([
      {
        data: {
          mfa: false,
          allowReg: false,
          allowUnsplash: false,
          enableS3: false,
        },
        errors: {},
        success: false,
      },
      vi.fn(),
      false,
    ]);
    cleanup();
  });

  it('renders correctly', async () => {
    render(<PreferencesTab initialSettings={initialSettings} />);

    expect(await screen.findByText('Security')).toBeInTheDocument();
    expect(await screen.findByText(/Third-party Integrations/i)).toBeInTheDocument();
    expect(await screen.findByText('Storage')).toBeInTheDocument();
  });

  it('toggles MFA checkbox', async () => {
    render(<PreferencesTab initialSettings={initialSettings} />);

    const mfaCheckbox = screen.getByLabelText('Two-Factor Authentication (2FA)');

    fireEvent.click(mfaCheckbox);

    expect(mfaCheckbox).toBeChecked();
  });

  it('toggles Allow Registration checkbox', () => {
    render(<PreferencesTab initialSettings={initialSettings} />);

    const allowRegCheckbox = screen.getByLabelText('Public Registration');

    fireEvent.click(allowRegCheckbox);

    expect(allowRegCheckbox).toBeChecked();
  });

  it('toggles Unsplash checkbox', () => {
    render(<PreferencesTab initialSettings={initialSettings} />);

    const unsplashCheckbox = screen.getByLabelText('Unsplash Integration');

    fireEvent.click(unsplashCheckbox);

    expect(unsplashCheckbox).toBeChecked();
  });

  it('toggles S3 checkbox', () => {
    render(<PreferencesTab initialSettings={initialSettings} />);

    const s3Checkbox = screen.getByLabelText('Amazon S3 Storage');

    fireEvent.click(s3Checkbox);

    expect(s3Checkbox).toBeChecked();
  });

  it('submits the form', async () => {
    render(<PreferencesTab initialSettings={initialSettings} />);

    const saveButton = await screen.findByText('Save Changes');
    fireEvent.click(saveButton);

    expect(mocks.useActionState).toHaveBeenCalled();
  });

  it('shows success message on save', async () => {
    mocks.useActionState.mockReturnValue([
      {
        data: {
          mfa: false,
          allowReg: false,
          allowUnsplash: false,
          enableS3: false,
        },
        success: true,
        message: 'Settings saved successfully.',
      },
      vi.fn(),
      false,
    ]);

    render(<PreferencesTab initialSettings={initialSettings} />);

    const saveButton = await screen.findByText('Save Changes');
    fireEvent.click(saveButton);

    expect(
      await screen.findByText('Settings saved successfully.')
    ).toBeInTheDocument();
  });
});
