import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsersTable from './UsersTable';

const mocks = vi.hoisted(() => ({
  getUsers: vi.fn(),
  setRole: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock('../lib/actions', () => ({
  getUsers: mocks.getUsers,
  setRole: mocks.setRole,
  deleteUser: mocks.deleteUser,
}));

const mockUsers = [
  { id: 1, name: 'User One', email: 'userone@example.com', role: 'admin' },
  { id: 2, name: 'User Two', email: 'usertwo@example.com', role: 'user' },
];

describe('UsersTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mocks.getUsers.mockResolvedValue(mockUsers);
  });

  it('renders loading state initially', () => {
    render(<UsersTable currentUserId={1} />);
    expect(screen.getByText('Fetching directory...')).toBeInTheDocument();
  });

  it('renders users after loading', async () => {
    render(<UsersTable currentUserId={1} />);
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });
  });

  it('handles role change', async () => {
    render(<UsersTable currentUserId={1} />);
    await waitFor(() =>
      expect(screen.getByText('User One')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Open menu' })[1]);

    await waitFor(() => {
      fireEvent.click(
        screen.getByRole('menuitem', { name: 'Elevate to Admin' }),
      );
      expect(mocks.setRole).toHaveBeenCalledWith(2, 'admin');
    });
  });

  it('handles user deletion', async () => {
    render(<UsersTable currentUserId={1} />);
    await waitFor(() =>
      expect(screen.getByText('User Two')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Open menu' })[1]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete User' }));
    await waitFor(() =>
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Delete Account'));
    await waitFor(() => expect(mocks.deleteUser).toHaveBeenCalledWith(2));
  });
});
