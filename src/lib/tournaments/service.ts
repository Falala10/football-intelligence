import "server-only";
import { cacheLife } from "next/cache";
import { callFotMobTool } from "../fotmob/mcp";
import { mapTournament } from "./map";
import { EFL_CALENDAR_URL, parseEflCalendar } from "./calendar";
import type { Tournament } from "./model";
async function officialEflCalendar(season: string | null) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 7200 });
  const response = await fetch(EFL_CALENDAR_URL, { redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok || !response.body) return null;
  const reader = response.body.getReader(), parts: Uint8Array[] = []; let size = 0;
  while (true) { const p = await reader.read(); if (p.done) break; size += p.value.length; if (size > 1000000) { await reader.cancel(); return null; } parts.push(p.value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return parseEflCalendar(new TextDecoder().decode(bytes), season, new Date().toISOString());
}
export async function getTournament(id: string): Promise<Tournament> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  if (!/^[1-9]\d{0,11}$/.test(id)) throw new Error("Invalid competition");
  const raw = await callFotMobTool("fetch_fotmob_route", { route_key: "leagues", params_json: JSON.stringify({ id }), use_cache: false });
  const data = mapTournament(raw, id, new Date().toISOString());
  if (!data) throw new Error("Tournament data unavailable");
  if (id === "133") { try { data.calendar = await officialEflCalendar(data.season); } catch { data.notes.push("Official calendar temporarily unavailable; use dated final fixtures only, never guess a final date."); } }
  return data;
}
