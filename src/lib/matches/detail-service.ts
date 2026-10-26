import "server-only";
import { getFotMobMatchPage } from "../fotmob/match-page";
import type { DetailResult } from "./detail-model";

export async function getMatchDetail(id: string): Promise<DetailResult> {
  const parsed = /^fotmob:([1-9]\d*)$/.exec(id);
  if (!parsed) return { status: "invalid" };
  try { return { status: "ok", data: await getFotMobMatchPage(parsed[1]) }; }
  catch (error) { console.error("[matches] Match details unavailable:", error); return { status: "unavailable" }; }
}
