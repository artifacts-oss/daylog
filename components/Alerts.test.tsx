import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AlertSuccess from './Alerts';
import { renderWithIntl } from '@/utils/test/renderWithIntl';

const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

describe('AlertSuccess', () => {
  beforeEach(() => {
    cleanup();
    mockGet.mockReset();
  });

  it('renders the alert when saved=true', () => {
    mockGet.mockReturnValue('true');

    renderWithIntl(<AlertSuccess />);

    expect(screen.getByText('Saved changes')).toBeInTheDocument();
    expect(
      screen.getByText('Your changes have been saved!'),
    ).toBeInTheDocument();
  });

  it('does not render when saved param is missing', () => {
    mockGet.mockReturnValue(null);

    const { container } = renderWithIntl(<AlertSuccess />);

    expect(container.innerHTML).toBe('');
  });

  it('does not render when saved param is false', () => {
    mockGet.mockReturnValue('false');

    const { container } = renderWithIntl(<AlertSuccess />);

    expect(container.innerHTML).toBe('');
  });

  it('dismisses the alert when close button is clicked', async () => {
    mockGet.mockReturnValue('true');
    const user = userEvent.setup();

    renderWithIntl(<AlertSuccess />);

    expect(screen.getByText('Saved changes')).toBeInTheDocument();

    const closeButton = screen.getByRole('button');
    await user.click(closeButton);

    expect(screen.queryByText('Saved changes')).not.toBeInTheDocument();
  });

  it('renders the CheckCircleIcon and XMarkIcon', () => {
    mockGet.mockReturnValue('true');

    const { container } = renderWithIntl(<AlertSuccess />);

    // The alert should contain two SVG icons
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });
});
