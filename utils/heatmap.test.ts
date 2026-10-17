import { describe, expect, it } from 'vitest';
import { getHeatmapStart } from './heatmap';

describe('getHeatmapStart', () => {
  it('starts on a Sunday 52 weeks before the current week', () => {
    // 2026-10-16 is a Friday; its week starts Sunday 2026-10-11.
    const start = new Date(getHeatmapStart(new Date('2026-10-16T12:00:00Z')));
    expect(start.toISOString()).toBe('2025-10-12T00:00:00.000Z');
    expect(start.getUTCDay()).toBe(0);
  });
});
