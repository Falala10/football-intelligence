import "server-only";

import type { DayResult } from "./model";
import type { DayQuery, MatchProvider } from "./provider";
import { fotmobProvider } from "./providers/fotmob";

/** Keep failures distinct from a successfully loaded empty day. No failure caching here. */
export async function getDaySchedule(query: DayQuery, provider: MatchProvider = fotmobProvider): Promise<DayResult> {
  try {
    return { status: "ok", data: await provider.getDay(query) };
  } catch (error) {
    console.error("[matches] Day schedule unavailable:", error);
    return { status: "unavailable" };
  }
}
