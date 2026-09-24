"use client";

import { useSyncExternalStore } from "react";

import { isStoppageMinute, liveMinuteLabel, parseClockSeconds } from "@/lib/clock";

function subscribe(callback: () => void) {
  const timer = setInterval(callback, 1000);
  return () => clearInterval(timer);
}

type Props = {
  /** Minute label as reported by FotMob at fetch time, e.g. "67’". */
  minute: string;
  /** Exact clock at fetch time, e.g. "66:21". Without it the minute is shown as reported. */
  clock?: string;
  /** When the server fetched the clock, in epoch milliseconds. */
  fetchedAtMs: number;
};

/** A live minute that keeps counting between data refreshes. */
export function LiveMinute({ minute, clock, fetchedAtMs }: Props) {
  const parsed = parseClockSeconds(clock);
  // Stoppage-time labels ("45+2’") are shown as reported and never counted locally.
  const seconds = parsed !== null && !isStoppageMinute(minute) ? parsed : null;

  const label = useSyncExternalStore(
    subscribe,
    () => (seconds === null ? minute : liveMinuteLabel(seconds, Date.now() - fetchedAtMs)),
    () => minute,
  );

  return <span className="tabular">{label}</span>;
}
