import "server-only";
import { cacheLife } from "next/cache";
import { callFotMobTool } from "../fotmob/mcp";
import { mapFotMobTeam } from "./fotmob-map";
import { getFotMobLeague } from "../fotmob/league";
import type { Team } from "../matches/model";
async function loadTeam(id: string) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  const raw = await callFotMobTool("fetch_fotmob_route", { route_key: "teams", params_json: JSON.stringify({ id }), use_cache: false });
  return mapFotMobTeam(raw, id, new Date().toISOString());
}
export async function getTeamContext(team: Team) {
  const match = /^fotmob:([1-9]\d*)$/.exec(team.id ?? "");
  if (!match) return null;
  try {
    const overview = await loadTeam(match[1]);
    let league = null;
    if (overview.leagueId) {
      try { league = await getFotMobLeague(overview.leagueId.slice(7)); } catch { /* Recent results remain usable if the league is unavailable. */ }
    }
    return { overview, league };
  } catch { return null; }
}
export type TeamContext = NonNullable<Awaited<ReturnType<typeof getTeamContext>>>;

/** Lightweight, validated club profile without unrelated league/history fetches. */
export async function getTeamOverview(id: string) {
  const parsed = /^fotmob:([1-9]\d*)$/.exec(id);
  if (!parsed) return null;
  try { return await loadTeam(parsed[1]); } catch { return null; }
}
