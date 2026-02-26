export function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  // Professional muted palette:
  // Saturation 40-50% for a clean, non-fatiguing look
  // Lightness 45% for robust contrast with white text
  return `hsl(${hue}, 45%, 45%)`;
}
