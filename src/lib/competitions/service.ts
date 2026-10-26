import "server-only";
import { getFotMobLeague } from "../fotmob/league";
import type { LeagueResult } from "./model";
export async function getLeagueSeason(id: string): Promise<LeagueResult> {
  const parsed = /^fotmob:([1-9]\d*)$/.exec(id);
  if (!parsed) return { status: "invalid" };
  try { return { status: "ok", data: await getFotMobLeague(parsed[1]) }; }
  catch (error) { console.error("[leagues] League unavailable:", error); return { status: "unavailable" }; }
}
