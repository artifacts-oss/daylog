import '@/utils/test/commonMocks';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stringToColor } from '@/utils/color';
import {
  ActivitySection,
  ContinueSection,
  ExpiringSharesSection,
  ForgottenSection,
  OnThisDaySection,
  StatsSection,
} from './HomeSections';

const mocks = vi.hoisted(() => ({
  getContinueNote: vi.fn(),
  getActivityHeatmap: vi.fn(),
  getHomeStats: vi.fn(),
  getOnThisDay: vi.fn(),
  getForgottenNotes: vi.fn(),
  getExpiringShares: vi.fn(),
}));

vi.mock('@/app/(authenticated)/lib/home', () => mocks);

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

afterEach(cleanup);

describe('HomeSections empty states', () => {
  it.each([
    [ContinueSection, mocks.getContinueNote, null, 'continueEmpty'],
    [OnThisDaySection, mocks.getOnThisDay, [], 'onThisDayEmpty'],
    [ForgottenSection, mocks.getForgottenNotes, [], 'forgottenEmpty'],
    [ExpiringSharesSection, mocks.getExpiringShares, [], 'expiringEmpty'],
  ])(
    '%o keeps its title and shows a label when there is no data',
    async (Section, getter, empty, label) => {
      getter.mockResolvedValue(empty);

      render(await Section());

      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );

  it('shows rows instead of the label when there is data', async () => {
    mocks.getForgottenNotes.mockResolvedValue([
      {
        id: 1,
        boardsId: 2,
        title: 'Old note',
        updatedAt: new Date('2026-01-01'),
      },
    ]);

    render(await ForgottenSection());

    expect(screen.getByText('Old note')).toBeInTheDocument();
    expect(screen.queryByText('forgottenEmpty')).not.toBeInTheDocument();
  });

  it.each([
    [3, true],
    [0, false],
  ])(
    'pulses share views only when there were views this week (%i)',
    async (week, shown) => {
      mocks.getHomeStats.mockResolvedValue({
        notesThisWeek: 1,
        notesTotal: 2,
        boardsTotal: 1,
        editsThisWeek: 0,
        shareViewsTotal: 5,
        shareViewsThisWeek: week,
      });

      render(await StatsSection());

      expect(!!screen.queryByRole('img', { name: 'statViewsLive' })).toBe(
        shown,
      );
    },
  );

  it('colors the activity heatmap with the continue note color', async () => {
    mocks.getActivityHeatmap.mockResolvedValue({
      days: { [new Date().toISOString().slice(0, 10)]: 12 },
      total: 12,
      streak: 1,
    });
    mocks.getContinueNote.mockResolvedValue({ title: 'My note' });

    const { container } = render(await ActivitySection());

    expect(
      container.querySelector(`[style*="${stringToColor('My note')}"]`),
    ).not.toBeNull();
  });

  it('colors on-this-day cards without a cover with stringToColor', async () => {
    mocks.getOnThisDay.mockResolvedValue([
      { id: 1, boardsId: 2, title: 'Trip', imageUrl: null, monthsAgo: 1 },
    ]);

    render(await OnThisDaySection());

    // Compare through a reference element so jsdom normalizes hsl() the same way.
    const expected = document.createElement('div');
    expected.style.backgroundColor = stringToColor('Trip');
    expect(screen.getByRole('link')).toHaveStyle({
      backgroundColor: expected.style.backgroundColor,
    });
  });
});
