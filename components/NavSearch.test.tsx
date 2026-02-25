import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NavSearch from './NavSearch';

const mocks = vi.hoisted(() => ({
  search: vi.fn(async (query: string) => {
    if (!query) return [];
    return [
      { type: 'note', title: 'Test Note', url: '/note/1' },
      { type: 'board', title: 'Test Board', url: '/board/1' },
    ];
  }),
}));

// Mock icons
vi.mock('@heroicons/react/24/outline', () => ({
  Squares2X2Icon: () => <span data-testid="chalkboard-icon" />,
  DocumentTextIcon: () => <span data-testid="note-icon" />,
  PuzzledIcon: () => <span data-testid="puzzled-icon" />,
  MagnifyingGlassIcon: () => <span data-testid="search-icon" />,
}));

// Mock search action
vi.mock('@/app/(authenticated)/lib/actions', () => ({
  search: mocks.search,
}));

describe('NavSearch', () => {
  beforeEach(() => {
    cleanup();
    vi.useFakeTimers({ toFake: ['setTimeout'], shouldAdvanceTime: true });
  });

  it('show searching text when search is loading', async () => {
    mocks.search.mockImplementationOnce(() => {
      setTimeout(() => {}, 1000);
      return new Promise(() => {});
    });
    render(<NavSearch />);
    fireEvent.click(screen.getByRole('button', { name: /Search anything/i }));
    const input = await screen.findByPlaceholderText(
      /Search boards and notes/i,
    );
    fireEvent.change(input, { target: { value: 'test' } });
    // skip 1s debounce time
    vi.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(screen.getByText(/Searching.../i)).toBeInTheDocument();
    });
  });

  it('renders search button and modal', () => {
    render(<NavSearch />);
    expect(screen.getByText(/Search anything/i)).toBeInTheDocument();
  });

  it('shows empty results message when no results', async () => {
    render(<NavSearch />);
    // Open modal by simulating click
    fireEvent.click(screen.getByRole('button', { name: /Search anything/i }));
    vi.advanceTimersByTime(350);
    // Input is empty, so should show empty results
    expect(await screen.findByText(/Quickly find boards/i)).toBeInTheDocument();
  });

  it('shows search results when input is typed', async () => {
    render(<NavSearch />);
    fireEvent.click(screen.getByRole('button', { name: /Search anything/i }));
    const input = await screen.findByPlaceholderText(
      /Search boards and notes/i,
    );
    fireEvent.change(input, { target: { value: 'test' } });
    vi.advanceTimersByTime(350);
    expect(await screen.findByText('Test Note')).toBeInTheDocument();
    expect(await screen.findByText('Test Board')).toBeInTheDocument();

    expect(screen.getByTestId('note-icon')).toBeInTheDocument();
    expect(screen.getByTestId('chalkboard-icon')).toBeInTheDocument();
  });

  it('shows navigation instructions in modal footer', async () => {
    render(<NavSearch />);
    fireEvent.click(screen.getByRole('button', { name: /Search anything/i }));
    const input = await screen.findByPlaceholderText(
      /Search boards and notes/i,
    );
    fireEvent.change(input, { target: { value: 'test' } });
    vi.advanceTimersByTime(350);
    expect(await screen.findByText(/Navigate/i)).toBeInTheDocument();
    expect(await screen.findByText(/Open/i)).toBeInTheDocument();
  });

  it('navigates results with keyboard', async () => {
    render(<NavSearch />);
    fireEvent.click(screen.getByRole('button', { name: /Search anything/i }));
    const input = await screen.findByPlaceholderText(
      /Search boards and notes/i,
    );
    fireEvent.change(input, { target: { value: 'test' } });
    vi.advanceTimersByTime(350);
    expect(await screen.findByText('Test Note')).toBeInTheDocument();
    expect(await screen.findByText('Test Board')).toBeInTheDocument();

    // Simulate arrow down key
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // After ArrowDown, the first result should be focused
    const firstResult = screen.getByText('Test Note');
    expect(document.activeElement).toBe(firstResult.closest('a'));

    // Simulate Enter key on focused result
    fireEvent.keyDown(document.activeElement as Element, { key: 'Enter' });
    // Since we can't actually navigate, just ensure focus remains
    expect(document.activeElement).toBe(firstResult.closest('a'));

    // Simulate Backspace to return focus to input
    fireEvent.keyDown(document.activeElement as Element, { key: 'Backspace' });
    expect(document.activeElement).toBe(input);

    // Simulate ArrowDown twice to cycle to the second result
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const secondResult = screen.getByText('Test Board');
    expect(document.activeElement).toBe(secondResult.closest('a'));
  });
});
