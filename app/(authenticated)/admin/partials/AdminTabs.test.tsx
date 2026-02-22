import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminTabs from './AdminTabs';

const mocks = vi.hoisted(() => ({
  useState: vi.fn(),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useState: mocks.useState,
  };
});

describe('AdminTabs', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders tabs when isClient is true', () => {
    mocks.useState.mockReturnValueOnce([true, vi.fn()]);

    render(<AdminTabs />);

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('renders placeholder when isClient is false', () => {
    mocks.useState.mockReturnValueOnce([false, vi.fn()]);

    render(<AdminTabs />);

    expect(screen.getByTestId('admin-tabs-placeholder')).toBeInTheDocument();
    expect(screen.queryByText('Users')).toBeNull();
    expect(screen.queryByText('Preferences')).toBeNull();
  });
});
