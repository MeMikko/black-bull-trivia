/** Format milliseconds as M:SS.t (e.g. "1:04.2" or "45.8") */
export function formatElapsed(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalTenths = Math.floor(clamped / 100);
  const tenths = totalTenths % 10;
  const totalSec = Math.floor(totalTenths / 10);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);

  if (min > 0) {
    return `${min}:${sec.toString().padStart(2, "0")}.${tenths}`;
  }
  return `${sec}.${tenths}s`;
}

export function getElapsedMs(startedAtMs: number): number {
  return Math.max(0, Date.now() - startedAtMs);
}