import "server-only";

import { cacheLife } from "next/cache";

import { callFotMobTool } from "./mcp";
import { parseMatchesByDate } from "./parse";
import type { MatchesByDate, MatchesResult } from "./types";

export type MatchesQuery = {
  /** ISO date (YYYY-MM-DD), decided by the caller so this function stays cacheable. */
  date: string;
  /** IANA timezone used by FotMob to bucket matches into days. Defaults to UTC. */
  tz?: string;
  /** FotMob league ids to keep; omit for every league. */
  leagueIds?: number[];
  liveOnly?: boolean;
};

// Only a successful fetch lives inside the cached function. A failure throws out of it, and Next does not
// store a thrown error, so one bad moment can never be served again from the cache.
async function fetchMatchesByDate(query: Required<Pick<MatchesQuery, "date" | "tz" | "liveOnly">> & Pick<MatchesQuery, "leagueIds">): Promise<MatchesByDate> {
  "use cache";
  // Keep revalidate shorter than the page's live refresh interval so a refresh never shows old data.
  cacheLife({ stale: 10, revalidate: 10, expire: 60 });

  const raw = await callFotMobTool("get_matches_by_date", {
    date: query.date,
    tz: query.tz,
    ...(query.leagueIds?.length ? { league_ids: query.leagueIds } : {}),
    live_only: query.liveOnly,
  });
  const data = parseMatchesByDate(raw);
  if (!data) throw new Error("The FotMob MCP returned matches that could not be used.");
  return data;
}

/**
 * Matches on a date, grouped by league. Cached for a few seconds so concurrent page views and live
 * refreshes share one FotMob request without serving old scores. A failure never becomes an empty day
 * and is never cached: it returns { status: "unavailable" } so the UI can say the data could not be loaded.
 */
export async function getMatchesByDate({ date, tz = "UTC", leagueIds, liveOnly = false }: MatchesQuery): Promise<MatchesResult> {
  try {
    return { status: "ok", data: await fetchMatchesByDate({ date, tz, leagueIds, liveOnly }) };
  } catch (error) {
    console.error("[fotmob] get_matches_by_date failed:", error);
    return { status: "unavailable" };
  }
}
