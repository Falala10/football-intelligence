"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-renders the page's server data on a timer, only while the tab is visible.
 * Pass null to switch automatic refreshing off.
 */
export function LiveRefresher({ intervalMs }: { intervalMs: number | null }) {
  const router = useRouter();

  useEffect(() => {
    if (intervalMs === null) return;
    let lastRefresh = Date.now();

    const refresh = () => {
      lastRefresh = Date.now();
      router.refresh();
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, intervalMs);
    // Catch up straight away when a background tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh >= intervalMs) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, router]);

  return null;
}
