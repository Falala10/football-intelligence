import "server-only";
import { cacheLife } from "next/cache";
import { callFotMobTool } from "../fotmob/mcp";
import { mapHeatmaps, mapPlayerGames } from "./providers/fotmob-player-map";
import type { PlayerGames } from "./player-model";

async function loadPlayers(id: string) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 120 });
  const raw = await callFotMobTool("fetch_fotmob_route", { route_key: "match_details", params_json: JSON.stringify({ matchId: id }), use_cache: false });
  return { ...mapPlayerGames(raw, id), fetchedAtUtc: new Date().toISOString() };
}
async function loadMaps(id: string, source: string, players: PlayerGames["players"], heatmapIds: Record<string, string>) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 120 });
  const raw = await callFotMobTool("fetch_fotmob_route", { route_key: "match_heatmaps", params_json: JSON.stringify({ matchId: id, heatmapUrl: source }), use_cache: false });
  return mapHeatmaps(raw, players, heatmapIds);
}
async function load(id: string): Promise<PlayerGames> {
  const { players, heatmapUrl, heatmapIds, fetchedAtUtc } = await loadPlayers(id);
  let heatmaps: PlayerGames["heatmaps"] = {}, heatmapStatus: PlayerGames["heatmapStatus"] = "not-provided";
  if (heatmapUrl) {
    try {
      const url = new URL(heatmapUrl, "https://www.fotmob.com");
      const source = url.searchParams.get("heatmapUrl");
      if (url.origin !== "https://www.fotmob.com" || url.pathname !== `/api/data/heatmap/match/${id}/heatmaps` || source !== `https://pub.fotmob.com/prod/db/api/heatmap/match/${id}`) throw new Error("Unexpected heatmap route");
      heatmaps = await loadMaps(id, source, players, heatmapIds); heatmapStatus = "available";
    } catch { heatmapStatus = "unavailable"; }
  }
  return { matchId: `fotmob:${id}`, players, heatmaps, heatmapStatus, fetchedAtUtc };
}
export async function getPlayerGames(id: string) {
  const parsed = /^fotmob:([1-9]\d*)$/.exec(id);
  if (!parsed) return null;
  try { return await load(parsed[1]); } catch { return null; }
}
