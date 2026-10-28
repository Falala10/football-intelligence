import { getMatchAnalysisCommentary } from "../matches/commentary-service";
import "server-only";
import { callFotMobTool } from "../fotmob/mcp";
import { getTeamContext } from "./service";
import { getMatchDetail } from "../matches/detail-service";
import { completedFixtures, formRecord } from "./form";
import type { Team } from "../matches/model";
const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const normal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\(w\)|\bwomen(?:'s)?\b/g, " women ").replace(/\bman\b/g, "manchester").replace(/\butd\b/g, "united").replace(/\bfc\b/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function selectExactTeam(raw: unknown, query: string): Team | null {
  const payload = object(raw).payload;
  if (!Array.isArray(payload)) return null;
  const teams = new Map<string, Team>();
  for (const group of payload) {
    const suggestions = object(group).suggestions;
    if (!Array.isArray(suggestions)) continue;
    for (const value of suggestions) {
      const row = object(value);
      if (row.type !== "team" || !/^[1-9]\d{0,11}$/.test(String(row.id)) || typeof row.name !== "string" || normal(row.name) !== normal(query)) continue;
      teams.set(String(row.id), { id: `fotmob:${row.id}`, name: row.name, shortName: null, crestUrl: null });
    }
  }
  return teams.size === 1 ? [...teams.values()][0] : null;
}
export type ClubResearchSource = { title: string; url: string; text: string };
export async function getClubResearchSources(query: string, signal?: AbortSignal): Promise<ClubResearchSource[]> {
  if (!/^[\p{L}\p{N} .&'’()-]{2,80}$/u.test(query)) return [];
  try {
    signal?.throwIfAborted();
    const raw = await callFotMobTool("fetch_fotmob_route", { route_key: "search_suggest", params_json: JSON.stringify({ term: query, hits: 5 }), use_cache: false });
    signal?.throwIfAborted();
    const team = selectExactTeam(raw, query);
    if (!team) return [];
    const context = await getTeamContext(team);
    signal?.throwIfAborted();
    if (!context) return [];
    const t = context.overview, games = completedFixtures(t.fixtures, t.id, new Date().toISOString()), recent = games.slice(0, 5), form = formRecord(recent, t.id);
    const table = context.league?.tables?.flatMap(t => t.rows).find(r => r.team.id === team.id);
    const noGoals = recent.filter(f => (f.match.home.id === team.id ? f.match.score!.home : f.match.score!.away) === 0).length;
    const concededTwo = recent.filter(f => (f.match.home.id === team.id ? f.match.score!.away : f.match.score!.home) >= 2).length;
    const sources: ClubResearchSource[] = [{ title: `FotMob: ${t.name} current form and league record`, url: `https://www.fotmob.com/teams/${t.id!.slice(7)}/overview`, text: `Verified team identity ${team.name} (${team.id}). Retrieved ${t.fetchedAtUtc}. Current league season: ${context.league?.season ?? t.season ?? "unknown"}. League: ${context.league?.competition.name ?? "unknown"}. Table snapshot: ${table ? `position ${table.position}, played ${table.played}, wins ${table.wins}, draws ${table.draws}, losses ${table.losses}, points ${table.points}, goal difference ${table.goalDifference}` : "unavailable"}. Latest ${recent.length} completed competitive games, ALL competitions: played ${form.played}, wins ${form.wins}, draws ${form.draws}, losses ${form.losses}, goals scored ${form.goalsFor}, conceded ${form.goalsAgainst}; failed to score in ${noGoals}, conceded at least two in ${concededTwo}.\n${recent.map(f => `${f.match.kickoffUtc}: ${f.competition}: ${f.match.home.name} ${f.match.score!.home}–${f.match.score!.away} ${f.match.away.name}`).join("\n")}\nThese records describe the problem, not its proven tactical cause. League standings and all-competition form are distinct. No season-wide advanced statistics, injury causality or private dressing-room information is established.` }];
    signal?.throwIfAborted();
    const details = await Promise.allSettled(games.slice(0, 2).map(f => getMatchDetail(f.match.id)));
    for (const [i, result] of details.entries()) {
      if (result.status !== "fulfilled" || result.value.status !== "ok") continue;
      const d = result.value.data, expected = games[i].match;
      if (d.match.id !== expected.id || ![d.match.home.id, d.match.away.id].includes(team.id)) continue;
      if (expected.score && d.match.score && (expected.score.home !== d.match.score.home || expected.score.away !== d.match.score.away)) continue;
      sources.push({ title: `FotMob: ${d.match.home.name}–${d.match.away.name} recent match statistics`, url: `https://www.fotmob.com/matches/${d.match.providerMatchId}`, text: `Recent example, NOT a whole-season sample. Match date ${d.match.kickoffUtc}, fetched ${d.fetchedAtUtc}. ${d.match.home.name} ${d.match.score?.home ?? "unknown"}–${d.match.score?.away ?? "unknown"} ${d.match.away.name}.\n${(d.stats ?? []).slice(0, 6).map(g => `${g.title}: ${g.items.slice(0, 12).map(s => `${s.label}: ${d.match.home.name} ${s.home ?? "unknown"}; ${d.match.away.name} ${s.away ?? "unknown"}`).join("; ")}`).join("\n")}\nUse as one recent example only. Missing values are unknown. Chance statistics do not alone prove a tactic, cause or season-wide pattern.` });
    }
    signal?.throwIfAborted();
    if (games[0]) {
      try {
        const commentary = await getMatchAnalysisCommentary(games[0].match.id);
        if (commentary?.status === "ok") {
          const items = commentary.data.items.filter(i => i.minute === null || /goal|counter|transition|press|chance|space|turnover/i.test(i.text));
          const lines: string[] = []; let size = 0;
          for (const item of items) { const line = `${item.minute ?? "Summary"}: ${item.text}`; if (size + line.length > 8000) continue; lines.push(line); size += line.length; }
          if (lines.length) sources.push({ title: `FotMob: ${team.name} latest-match incident narrative`, url: `https://www.fotmob.com/matches/${games[0].match.providerMatchId}`, text: `Reported ${commentary.data.source} commentary excerpts from ONE match (${games[0].match.kickoffUtc}), fetched ${commentary.data.fetchedAtUtc}. Newest first; selected whole entries only, not the full transcript. Preserve uncertainty and who did what; distinguish reported observations from opinions. Not evidence for every game of the season.\n${lines.join("\n")}` });
        }
      } catch { /* Keep independently valid result/stat sources when narrative is unavailable. */ }
    }
    return sources;
  } catch { return []; }
}
