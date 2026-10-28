import "server-only";
import { cacheLife } from "next/cache";
import { callFotMobTool } from "./mcp";
import { mapFotMobCommentary } from "../matches/providers/fotmob-commentary-map";

export async function getFotMobCommentary(matchId: string) {
  "use cache";
  cacheLife({ stale: 10, revalidate: 10, expire: 60 });
  const result = mapFotMobCommentary(await callFotMobTool("get_match_commentary", { match_id_or_url: matchId, detail: "auto", limit: 50 }), matchId);
  if (result.status === "unavailable") throw new Error("Commentary unavailable.");
  return result;
}

/** Full commentary for analysis, independent of the newest-50 display excerpt. */
export async function getFotMobAnalysisCommentary(matchId: string) {
  "use cache";
  cacheLife({ stale: 10, revalidate: 10, expire: 60 });
  const result = mapFotMobCommentary(await callFotMobTool("get_match_commentary", { match_id_or_url: matchId, detail: "full" }), matchId);
  if (result.status === "unavailable") throw new Error("Analysis commentary unavailable.");
  return result;
}
