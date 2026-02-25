import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import UnsplashImagesDropdown from './UnsplashImagesDropdown';

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...(props as Record<string, unknown>)} />;
  },
}));

// Mock DropdownMenu to always show content for easier testing
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock the fetch function
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ results: [] }),
  }),
) as unknown as typeof fetch;

describe('UnsplashImagesDropdown', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the dropdown button', () => {
    const mockImageSelected = vi.fn();
    render(<UnsplashImagesDropdown imageSelected={mockImageSelected} />);

    expect(screen.getByText('Search Unsplash images')).toBeInTheDocument();
  });

  it('calls imageSelected with empty string when Clear selection is clicked', async () => {
    const mockImageSelected = vi.fn();
    render(<UnsplashImagesDropdown imageSelected={mockImageSelected} />);

    const clearButton = await screen.findByText('Clear selection');
    await user.click(clearButton);

    expect(mockImageSelected).toHaveBeenCalledWith('');
  });

  it('fetches images based on the keyword after debounce', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'], shouldAdvanceTime: true });
    const mockImageSelected = vi.fn();
    render(<UnsplashImagesDropdown imageSelected={mockImageSelected} />);

    // Now look for the input directly
    const input = await screen.findByPlaceholderText('Type any keyword');
    fireEvent.change(input, { target: { value: 'nature' } });

    // skip 1s debounce time
    vi.advanceTimersByTime(1000);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('fetches images when the keyword immediately on press enter key', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'], shouldAdvanceTime: true });
    const mockImageSelected = vi.fn();
    render(<UnsplashImagesDropdown imageSelected={mockImageSelected} />);

    // Now look for the input directly
    const input = await screen.findByPlaceholderText('Type any keyword');
    fireEvent.change(input, { target: { value: 'mountains' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // skip debounce time
    vi.advanceTimersByTime(0);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
