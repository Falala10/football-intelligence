import "server-only";
import { cacheLife } from "next/cache";
import { callFotMobTool } from "./mcp";
import { mapFotMobDetail } from "../matches/providers/fotmob-detail-map";

export async function getFotMobMatchPage(matchId: string) {
  "use cache";
  cacheLife({ stale: 10, revalidate: 10, expire: 60 });
  const raw = await callFotMobTool("get_match_page", { match_id_or_url: matchId });
  const data = mapFotMobDetail(raw, matchId);
  if (!data) throw new Error("Match details are unavailable or invalid.");
  return data;
}
