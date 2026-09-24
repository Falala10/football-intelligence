"use client";

import { useEffect, useRef, useState } from "react";

type Props = { value: number; decimals?: number; durationMs?: number };

/** A number that counts up to its value. Screen readers get the final value straight away. */
export function CountUp({ value, decimals = 0, durationMs = 1400 }: Props) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = reduceMotion ? 1 : Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (value - from) * eased;
      fromRef.current = current;
      setShown(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return (
    <>
      <span aria-hidden="true" className="tabular">
        {shown.toFixed(decimals)}
      </span>
      <span className="sr-only">{value.toFixed(decimals)}</span>
    </>
  );
}
