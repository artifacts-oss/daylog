import '@/utils/test/commonMocks';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import SharesTable from './SharesTable';
import { SharedContent } from '../lib/types';

// Mock the actions
vi.mock('../lib/actions', () => ({
  deleteShare: vi.fn(),
  updateSharePassword: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
  })),
}));

describe('SharesTable', () => {
  afterEach(() => {
    cleanup();
  });
  const mockShares = [
    {
      id: 's1',
      title: 'Test Note',
      entityType: 'NOTE',
      hasPassword: true,
      expiresAt: null as Date | null,
      oneTime: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      entityId: 101,
      viewCount: 10,
      views: [],
      metrics: { weekly: 5, monthly: 10, total: 100 },
    },
    {
      id: 's2',
      title: 'Expired Board',
      entityType: 'BOARD',
      hasPassword: false,
      expiresAt: new Date(Date.now() - 1000 * 60), // 1 min ago
      oneTime: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      entityId:102,
      viewCount: 5,
      views: [],
      metrics: { weekly: 0, monthly: 0, total: 50 },
    },
  ] as SharedContent[];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "No shared content yet" when empty', () => {
    render(<SharesTable shares={[]} />);
    expect(screen.getByText('No shared content yet')).toBeInTheDocument();
  });

  it('renders share items with correct icons and titles', () => {
    render(<SharesTable shares={mockShares} />);

    expect(screen.getByText('Test Note')).toBeInTheDocument();
    expect(screen.getByText('Expired Board')).toBeInTheDocument();

    // Check type indicators
    expect(screen.getByText('Shared Note')).toBeInTheDocument();
    expect(screen.getByText('Public Board')).toBeInTheDocument();
  });

  it('shows correct status badges', () => {
    render(<SharesTable shares={mockShares} />);

    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('One-Time')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('triggers copy to clipboard and shows success state', async () => {
    vi.useFakeTimers();
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });
    window.alert = vi.fn();

    render(<SharesTable shares={mockShares} />);

    const copyButtons = screen.getAllByTitle('Copy share link');
    const button = copyButtons[0];

    fireEvent.click(button);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/share/s1'),
    );

    // Alert should not be called anymore
    expect(window.alert).not.toHaveBeenCalled();

    // Check for success class
    expect(button).toHaveClass('bg-emerald-500/10');

    // Advance timers to check reset
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    
    expect(button).not.toHaveClass('bg-emerald-500/10');
    
    vi.useRealTimers();
  });

  it('shows revocation dialog when delete button is clicked', async () => {
    render(<SharesTable shares={mockShares} />);

    const deleteButtons = screen.getAllByTitle('Revoke link');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Security Verification')).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to revoke the link for/),
    ).toBeInTheDocument();

    // Use getAllByText because it appears in the table and the dialog
    expect(screen.getAllByText('Test Note')).toHaveLength(2);
  });

  it('hides password update button for expired links', () => {
    render(<SharesTable shares={mockShares} />);

    // s1 (active) has a Key button. s2 (expired) has it hidden.
    // We should find exactly 1 button that matches the password change titles.
    const keyButtons = screen.queryAllByTitle(
      /password protection|Update password/i,
    );
    expect(keyButtons).toHaveLength(1);
    expect(screen.getByTitle('Update password')).toBeInTheDocument();
  });
});
