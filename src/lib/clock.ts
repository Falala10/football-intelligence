/** Parse FotMob's live clock ("65:16") into seconds, or null if it is not in that form. */
export function parseClockSeconds(clock: string | undefined): number | null {
  if (!clock) return null;
  const match = /^(\d{1,3}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// If a page goes stale (a refresh fails), stop counting rather than drift far from the real clock.
const MAX_ELAPSED_SECONDS = 120;

/**
 * Minute label for a live match, counted forward from the clock FotMob reported.
 * FotMob rounds up (a clock of 66:21 is shown as 67'), and so does this.
 */
export function liveMinuteLabel(clockSeconds: number, elapsedMs: number): string {
  const elapsed = Math.min(Math.max(elapsedMs / 1000, 0), MAX_ELAPSED_SECONDS);
  return `${Math.floor((clockSeconds + elapsed) / 60) + 1}’`;
}

/** Stoppage-time labels such as "45+2’" are shown as reported and never counted locally. */
export function isStoppageMinute(minute: string): boolean {
  return minute.includes("+");
}
