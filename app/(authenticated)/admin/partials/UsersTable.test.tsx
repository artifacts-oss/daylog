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
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
    // User Two is at index 1
    fireEvent.pointerDown(menuButtons[1]);
    fireEvent.click(menuButtons[1]);

    const elevateMenuItem = await screen.findByRole('menuitem', {
      name: 'Elevate to Admin',
    });
    fireEvent.pointerDown(elevateMenuItem);
    fireEvent.click(elevateMenuItem);

    await waitFor(() => {
      expect(mocks.setRole).toHaveBeenCalledWith(2, 'admin');
    });
  });

  it('handles user deletion', async () => {
    render(<UsersTable currentUserId={1} />);
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
    fireEvent.pointerDown(menuButtons[1]);
    fireEvent.click(menuButtons[1]);

    const deleteMenuItem = await screen.findByRole('menuitem', {
      name: 'Delete User',
    });
    fireEvent.pointerDown(deleteMenuItem);
    fireEvent.click(deleteMenuItem);

    const alertMsg = await screen.findByText(/Are you sure/i);
    expect(alertMsg).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete Account' });
    fireEvent.pointerDown(deleteButton);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mocks.deleteUser).toHaveBeenCalledWith(2);
    });
  });
});
