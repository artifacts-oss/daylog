export const DAY_MS = 24 * 60 * 60 * 1000;
export const HEATMAP_WEEKS = 53;

// First UTC day of the Sunday-aligned grid whose last column is the current week.
export function getHeatmapStart(now: Date): number {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return today - ((HEATMAP_WEEKS - 1) * 7 + now.getUTCDay()) * DAY_MS;
}
