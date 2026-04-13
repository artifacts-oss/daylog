import '@/utils/test/commonMocks';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import SharesTable from './SharesTable';

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
      password: 'hashed',
      expiresAt: null,
      oneTime: true,
      createdAt: new Date().toISOString(),
      metrics: { weekly: 5, monthly: 10, total: 100 }
    },
    {
      id: 's2',
      title: 'Expired Board',
      entityType: 'BOARD',
      password: null,
      expiresAt: new Date(Date.now() - 1000 * 60).toISOString(), // 1 min ago
      oneTime: false,
      createdAt: new Date().toISOString(),
      metrics: { weekly: 0, monthly: 0, total: 50 }
    }
  ];

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

  it('triggers copy to clipboard when copy button is clicked', async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });
    window.alert = vi.fn();

    render(<SharesTable shares={mockShares} />);
    
    const copyButtons = screen.getAllByTitle('Copy share link');
    fireEvent.click(copyButtons[0]);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('/share/s1'));
    expect(window.alert).toHaveBeenCalledWith('Link copied to clipboard!');
  });

  it('shows revocation dialog when delete button is clicked', async () => {
    render(<SharesTable shares={mockShares} />);
    
    const deleteButtons = screen.getAllByTitle('Revoke link');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Security Verification')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to revoke the link for/)).toBeInTheDocument();
    
    // Use getAllByText because it appears in the table and the dialog
    expect(screen.getAllByText('Test Note')).toHaveLength(2);
  });

  it('hides password update button for expired links', () => {
    render(<SharesTable shares={mockShares} />);
    
    // s1 (active) has a Key button. s2 (expired) has it hidden.
    // We should find exactly 1 button that matches the password change titles.
    const keyButtons = screen.queryAllByTitle(/password protection|Update password/i);
    expect(keyButtons).toHaveLength(1);
    expect(screen.getByTitle('Update password')).toBeInTheDocument();
  });
});
