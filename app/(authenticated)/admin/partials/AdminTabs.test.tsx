import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsType } from '../lib/actions';
import AdminTabs from './AdminTabs';

// Mock components that are used inside AdminTabs
vi.mock('./UserModal', () => ({
  default: () => <div data-testid="user-modal">UserModal</div>,
}));

vi.mock('./UsersTable', () => ({
  default: ({ currentUserId }: { currentUserId: number }) => (
    <div data-testid="users-table">UsersTable for {currentUserId}</div>
  ),
}));

vi.mock('./PreferencesTab', () => ({
  default: ({ initialSettings }: { initialSettings: SettingsType | null }) => (
    <div data-testid="preferences-tab">
      PreferencesTab {initialSettings?.mfa ? 'MFA enabled' : 'MFA disabled'}
    </div>
  ),
}));

describe('AdminTabs', () => {
  const mockUser = { id: 1, name: 'Admin User' };
  const mockSettings = {
    mfa: true,
    allowReg: true,
    allowUnsplash: false,
    enableS3: false,
  };

  beforeEach(() => {
    cleanup();
  });

  it('renders correctly with initial users tab', () => {
    render(<AdminTabs currentUser={mockUser} initialSettings={mockSettings} />);

    expect(
      screen.getAllByRole('button', {
        name: /Users/i,
      }),
    ).toHaveLength(1);
    expect(
      screen.getAllByRole('button', {
        name: /Preferences/i,
      }),
    ).toHaveLength(1);
    expect(screen.getByTestId('users-table')).toHaveTextContent(
      'UsersTable for 1',
    );
    expect(screen.getByTestId('user-modal')).toBeInTheDocument();
  });

  it('switches to preferences tab when clicked', async () => {
    render(<AdminTabs currentUser={mockUser} initialSettings={mockSettings} />);

    const preferencesTabTrigger = screen.getByRole('button', {
      name: /Preferences/i,
    });
    fireEvent.click(preferencesTabTrigger);

    await waitFor(() => {
      expect(screen.getByTestId('preferences-tab')).toHaveTextContent(
        'MFA enabled',
      );
      expect(screen.queryByTestId('users-table')).not.toBeInTheDocument();
    });
  });
});
