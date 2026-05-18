import { cleanup, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BoardFavSwitch from './BoardFavToggle';
import { renderWithIntl } from '@/utils/test/renderWithIntl';

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
    renderWithIntl(<BoardFavSwitch />);
    expect(screen.getByRole('button', { name: /recent/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /favorites/i }),
    ).toBeInTheDocument();
  });

  it('activates "Show recent" button by default', () => {
    renderWithIntl(<BoardFavSwitch />);
    const showAllBtn = screen.getByRole('button', { name: /recent/i });
    const favBtn = screen.getByRole('button', { name: /favorites/i });
    expect(showAllBtn.className).toContain('text-primary');
    expect(favBtn.className).not.toContain('text-primary');
  });

  it('activates "Favorites" button when showFavParam is true', () => {
    renderWithIntl(<BoardFavSwitch showFavParam={true} />);
    const showAllBtn = screen.getByRole('button', { name: /recent/i });
    const favBtn = screen.getByRole('button', { name: /favorites/i });
    expect(favBtn.className).toContain(
      'text-[var(--color-text-accent-yellow)]',
    );
    expect(showAllBtn.className).not.toContain('text-primary');
  });

  it('toggles active button on click', async () => {
    const { rerender } = renderWithIntl(<BoardFavSwitch showFavParam={false} />);
    const showAllBtn = screen.getByRole('button', { name: /recent/i });
    const favBtn = screen.getByRole('button', { name: /favorites/i });

    // Click "Favorites"
    fireEvent.click(favBtn);

    // Simulate Next.js navigating and re-rendering the server component with the updated URL param
    rerender(<BoardFavSwitch showFavParam={true} />);

    expect(favBtn.className).toContain(
      'text-[var(--color-text-accent-yellow)]',
    );
    expect(showAllBtn.className).not.toContain('text-primary');

    // Click "Recent"
    fireEvent.click(showAllBtn);

    // Simulate Next.js navigating and re-rendering the server component with the updated URL param
    rerender(<BoardFavSwitch showFavParam={false} />);

    expect(showAllBtn.className).toContain('text-primary');
    expect(favBtn.className).not.toContain(
      'text-[var(--color-text-accent-yellow)]',
    );
  });

  it('updates URL search params and calls router methods on toggle', async () => {
    renderWithIntl(<BoardFavSwitch />);
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
