import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BoardFavSwitch from './BoardFavToggle';

const mocks = vi.hoisted(() => {
  return {
    prefetch: vi.fn(),
    push: vi.fn(),
  };
});

// Mock next/navigation useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    prefetch: mocks.prefetch,
    push: mocks.push,
  }),
}));

describe('BoardFavSwitch', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders both buttons', () => {
    render(<BoardFavSwitch />);
    expect(screen.getByRole('button', { name: /recent/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /favorites/i }),
    ).toBeInTheDocument();
  });

  it('activates "Show recent" button by default', () => {
    render(<BoardFavSwitch />);
    const showAllBtn = screen.getByRole('button', { name: /recent/i });
    const favBtn = screen.getByRole('button', { name: /favorites/i });
    expect(showAllBtn.className).toContain('text-primary');
    expect(favBtn.className).not.toContain('text-primary');
  });

  it('activates "Favorites" button when showFavParam is true', () => {
    render(<BoardFavSwitch showFavParam={true} />);
    const showAllBtn = screen.getByRole('button', { name: /recent/i });
    const favBtn = screen.getByRole('button', { name: /favorites/i });
    expect(favBtn.className).toContain('text-primary');
    expect(showAllBtn.className).not.toContain('text-primary');
  });

  it('toggles active button on click', () => {
    render(<BoardFavSwitch />);
    const showAllBtn = screen.getByRole('button', { name: /recent/i });
    const favBtn = screen.getByRole('button', { name: /favorites/i });

    // Click "Favorites"
    fireEvent.click(favBtn);
    expect(favBtn.className).toContain('text-primary');
    expect(showAllBtn.className).not.toContain('text-primary');

    // Click "Recent"
    fireEvent.click(showAllBtn);
    expect(showAllBtn.className).toContain('text-primary');
    expect(favBtn.className).not.toContain('text-primary');
  });

  it('updates URL search params and calls router methods on toggle', async () => {
    render(<BoardFavSwitch />);
    const favBtn = screen.getByRole('button', { name: /favorites/i });

    fireEvent.click(favBtn);

    const { waitFor } = await import('@testing-library/react');
    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalled();
      const calledWith = mocks.push.mock.calls[0][0];
      expect(calledWith).toContain('showFav=true');
    });
  });
});
