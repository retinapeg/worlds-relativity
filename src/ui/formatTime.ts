export function formatTime(seconds: number): string {
  // Round once before splitting, so 59.99 seconds displays 01:00.0, not 00:60.0.
  const tenths = Math.round(seconds * 10);
  const minutes = Math.floor(tenths / 600).toString().padStart(2, '0');
  const wholeSeconds = (Math.floor(tenths / 10) % 60).toString().padStart(2, '0');
  return `${minutes}:${wholeSeconds}.${tenths % 10}`;
}
