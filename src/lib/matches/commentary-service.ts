import "server-only";
import { getFotMobCommentary } from "../fotmob/commentary";
import type { CommentaryResult } from "./commentary-model";
export async function getMatchCommentary(id: string): Promise<CommentaryResult> {
  const parsed = /^fotmob:([1-9]\d*)$/.exec(id);
  if (!parsed) return { status: "unavailable" };
  try { return await getFotMobCommentary(parsed[1]); }
  catch (error) { console.error("[matches] Commentary unavailable:", error); return { status: "unavailable" }; }
}
