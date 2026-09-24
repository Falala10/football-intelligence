"use client";

import { useEffect, useState } from "react";

/** A live or final score that briefly highlights when it changes. */
export function Score({ home, away }: { home: number; away: number }) {
  const value = `${home}-${away}`;
  const [previous, setPrevious] = useState(value);
  const [flashing, setFlashing] = useState(false);

  // Adjusting state while rendering is React's recommended way to react to a changed prop.
  if (value !== previous) {
    setPrevious(value);
    setFlashing(true);
  }

  useEffect(() => {
    if (!flashing) return;
    const timer = setTimeout(() => setFlashing(false), 2400);
    return () => clearTimeout(timer);
  }, [flashing]);

  return (
    // Keying on the value remounts the element so the animation restarts on every change.
    <span
      key={value}
      className={`tabular inline-flex min-w-[3.75rem] items-center justify-center rounded-lg px-1.5 py-0.5 font-display text-xl font-bold sm:min-w-[4.5rem] sm:px-2 sm:text-2xl ${flashing ? "score-flash" : ""}`}
    >
      {home}
      <span className="px-1.5 text-faint" aria-hidden="true">
        –
      </span>
      <span className="sr-only"> to </span>
      {away}
    </span>
  );
}
