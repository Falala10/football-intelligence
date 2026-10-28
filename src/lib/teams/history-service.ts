import "server-only";
import { cacheLife } from "next/cache";
import { callFotMobTool } from "../fotmob/mcp";
import { mapFotMobLeague } from "../competitions/fotmob-map";
import { seasonStart } from "./seasons";
export async function getHistoricalLeague(id: string, season: string) {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 86400, expire: 604800 });
  if (!/^[1-9]\d{0,11}$/.test(id) || seasonStart(season) === null) throw new Error("Invalid season request");
  const raw = await callFotMobTool("fetch_fotmob_route", { route_key: "leagues", params_json: JSON.stringify({ id, season }), use_cache: false });
  const league = mapFotMobLeague(raw, id, new Date().toISOString());
  if (!league || league.season !== season) throw new Error("Requested season unavailable or mismatched");
  return league;
}
