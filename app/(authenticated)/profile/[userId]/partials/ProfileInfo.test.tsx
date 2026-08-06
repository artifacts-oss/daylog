import { User } from '@/prisma/generated/client';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithIntl } from '@/utils/test/renderWithIntl';
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
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('../lib/actions', () => ({
  updateProfile: vi.fn(),
}));

vi.mock('cropperjs', () => ({
  default: class {
    destroy() {}
    getCropperImage() {
      return {
        $ready: async () => {},
        $getTransform: () => [1, 0, 0, 1, 0, 0],
        $zoom: vi.fn(),
        getBoundingClientRect: () => ({ width: 500, height: 500 }),
        addEventListener: vi.fn(),
      };
    }
    getCropperSelection() {
      return {
        aspectRatio: NaN,
        initialCoverage: 0,
        movable: true,
        resizable: true,
        $center: vi.fn(),
        getBoundingClientRect: () => ({ width: 400, height: 400 }),
        $toCanvas: async () => ({ toDataURL: () => 'data:image/jpeg;base64,YQ==' }),
      };
    }
  },
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
    mocks.refresh.mockClear();
    URL.createObjectURL = vi.fn(() => 'blob:photo');
    URL.revokeObjectURL = vi.fn();
  });

  it('renders profile information form', () => {
    renderWithIntl(<ProfileInfo profile={mockProfile} />);

    expect(screen.getByText('Profile Information')).toBeDefined();
    expect(screen.getByText('JD')).toBeDefined();
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
    renderWithIntl(<ProfileInfo profile={mockProfile} />);

    expect(screen.getByText('Name is required')).toBeDefined();
  });

  it('displays a success message when the form is submitted successfully', async () => {
    const successMessage = 'Profile updated successfully';
    const successState = { success: true, message: successMessage, errors: {}, data: {} };
    mocks.useActionState.mockReturnValue([
      successState,
      vi.fn(),
      false,
    ]);
    const { rerender } = renderWithIntl(<ProfileInfo profile={mockProfile} />);

    expect(screen.getByText(successMessage)).toBeDefined();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());

    rerender(<ProfileInfo profile={mockProfile} />);
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it('displays a loading state when the form is being submitted', () => {
    mocks.useActionState.mockReturnValue([state, vi.fn(), true]);
    renderWithIntl(<ProfileInfo profile={mockProfile} />);

    const submitButton = screen.getByText(/Saving.../i);
    expect(submitButton).toBeDisabled();
  });

  it('submits the form with updated profile information', () => {
    const mockAction = vi.fn();
    mocks.useActionState.mockReturnValue([state, mockAction, false]);

    renderWithIntl(<ProfileInfo profile={mockProfile} />);

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

  it('crops the selected profile photo before saving', async () => {
    renderWithIntl(<ProfileInfo profile={mockProfile} />);

    fireEvent.change(screen.getByLabelText('Choose photo'), {
      target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })] },
    });
    fireEvent.load(await screen.findByAltText('Crop photo'));
    fireEvent.click(await screen.findByText('Apply'));

    await waitFor(() => {
      expect(document.querySelector<HTMLInputElement>('input[name="profileImage"]')?.value)
        .toBe('data:image/jpeg;base64,YQ==');
    });
  });

  it('rejects profile photos larger than 1 MB', () => {
    renderWithIntl(<ProfileInfo profile={mockProfile} />);

    fireEvent.change(screen.getByLabelText('Choose photo'), {
      target: { files: [new File([new Uint8Array(1_000_001)], 'large.png', { type: 'image/png' })] },
    });

    expect(screen.getByText('The image must not exceed 1 MB.')).toBeDefined();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
