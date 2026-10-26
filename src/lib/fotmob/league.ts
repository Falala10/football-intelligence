import "server-only";
import { cacheLife } from "next/cache";
import { callFotMobTool } from "./mcp";
import { mapFotMobLeague } from "../competitions/fotmob-map";
export async function getFotMobLeague(id: string) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  const raw = await callFotMobTool("fetch_fotmob_route", { route_key: "leagues", params_json: JSON.stringify({ id }), use_cache: false });
  const data = mapFotMobLeague(raw, id, new Date().toISOString());
  if (!data) throw new Error("League data unavailable or invalid.");
  return data;
}
