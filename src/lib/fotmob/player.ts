import "server-only";

import { cacheLife } from "next/cache";

import { callFotMobTool } from "./mcp";
import { parsePlayerProfile, type PlayerProfile } from "./player-parse";

export type PlayerResult = { status: "ok"; data: PlayerProfile } | { status: "not_found" } | { status: "unavailable" };

type Found = { status: "ok"; data: PlayerProfile } | { status: "not_found" };

// Only a real answer (a profile, or "no such player") lives inside the cached function. A failure throws out
// of it, and Next does not store a thrown error, so one bad moment can never be served again from the cache.
async function fetchPlayerProfile({ player, recent }: { player: string; recent: number }): Promise<Found> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });

  const raw = await callFotMobTool("get_player_profile", { player, recent });
  if (typeof raw === "object" && raw !== null && (raw as { state?: unknown }).state === "player_not_found") {
    return { status: "not_found" };
  }
  const data = parsePlayerProfile(raw);
  if (!data) throw new Error("The FotMob MCP returned a player profile that could not be used.");
  return { status: "ok", data };
}

/**
 * A player's compact profile (season totals, key stats with percentiles, recent matches).
 * Cached for a few minutes: ratings and totals only change when a match finishes.
 * A failure returns { status: "unavailable" }, never an empty profile, and is never cached.
 */
export async function getPlayerProfile({ player, recent = 6 }: { player: string; recent?: number }): Promise<PlayerResult> {
  try {
    return await fetchPlayerProfile({ player, recent });
  } catch (error) {
    console.error("[fotmob] get_player_profile failed:", error);
    return { status: "unavailable" };
  }
}
