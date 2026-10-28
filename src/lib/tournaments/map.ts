import { mapFotMobLeague, mapFotMobFixture } from "../competitions/fotmob-map";
import type { Team } from "../matches/model";
import type { Tournament, TournamentFixture, TournamentTie } from "./model";
const obj = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const rows = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const text = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isInteger(v) ? String(v) : null;
const scoped = (v: unknown) => /^[1-9]\d{0,11}$/.test(String(v)) ? `fotmob:${v}` : null;
export function stageName(stage: string | null, efl: boolean): string | null {
  if (!stage) return null;
  const named: Record<string, string> = { "1/8": "Round of 16", "1/4": "Quarter-finals", "1/2": "Semi-finals", final: "Final" };
  return efl && stage === "4" ? "Round of 16 (fourth round)" : named[stage] ?? (/^\d+$/.test(stage) ? `Round ${stage}` : stage);
}
const real = (t: Team) => t.shortName !== "TBD" && !t.name.includes("/") && !!t.id && /^fotmob:[1-9]\d{0,11}$/.test(t.id) && !/^(?:tbc|tbd|unknown|winner of|loser of)/i.test(t.name);
/** Normalize source stages and explicit tie winners. Never infer bracket links from list order. */
export function mapTournament(raw: unknown, expectedId: string, fetchedAtUtc: string): Tournament | null {
  const p = obj(obj(raw).payload), d = obj(p.details), efl = expectedId === "133";
  if (String(d.id) !== expectedId || !text(d.name) || (!Array.isArray(obj(p.fixtures).allMatches) && !mapFotMobLeague(raw, expectedId, fetchedAtUtc)?.tables)) return null;
  const tables = mapFotMobLeague(raw, expectedId, fetchedAtUtc)?.tables ?? null;
  const hasPlayoff = rows(obj(p.playoff).rounds).length > 0;
  const format = tables?.length ? (hasPlayoff ? "mixed" : "league") : hasPlayoff || efl ? "knockout" : "unknown";
  const embedded = rows(obj(p.playoff).rounds).flatMap(round => rows(obj(round).matchups).flatMap(entry => rows(obj(entry).matches).map(value => ({ ...obj(value), id: obj(value).matchId, round: obj(entry).stage ?? obj(round).stage }))));
  const stages = new Map(embedded.map(row => [String(row.id), row.round]));
  const source = [...rows(obj(p.fixtures).allMatches).map(value => ({ ...obj(value), round: obj(value).round ?? stages.get(String(obj(value).id)) })), ...embedded], fixtures: TournamentFixture[] = [], seen = new Set<string>();
  for (const value of source) {
    const r = obj(value), match = mapFotMobFixture(r, fetchedAtUtc); if (!match || seen.has(match.id)) continue;
    seen.add(match.id); const stage = text(r.round) ?? text(r.roundName);
    const home = obj(r.home), away = obj(r.away);
    const explicit = home.winner === true && away.winner !== true ? match.home.id : away.winner === true && home.winner !== true ? match.away.id : null;
    fixtures.push({ match, stage, stageName: stageName(stage, efl), winnerId: match.status === "finished" ? explicit : null });
  }
  const active = text(obj(obj(obj(p.fixtures).fixtureInfo).activeRound).roundId);
  const notes = ["Fixture-list order and drawOrder do not establish a future bracket. Only listed participants/opponents are known. Missing future ties do not prove a draw has not happened; say it is not provided here."];
  const ties: TournamentTie[] = [], explicitMatches = new Set<string>();
  for (const round of rows(obj(p.playoff).rounds).map(obj)) for (const entry of rows(round.matchups).map(obj)) {
    const ids = rows(entry.matches).map(obj).map(m => scoped(m.matchId)).filter((id): id is string => !!id);
    const included = fixtures.filter(f => ids.includes(f.match.id));
    const stage = text(entry.stage) ?? text(round.stage); if (!stage || !included.length) continue;
    const teams = [...new Map(included.flatMap(f => [f.match.home, f.match.away]).filter(real).map(t => [t.id, t])).values()];
    if (teams.length !== 2 || teams.some(t => ![scoped(entry.homeTeamId), scoped(entry.awayTeamId)].includes(t.id))) continue;
    const legs = Number(entry.bestOf) === 2 ? 2 : 1;
    const complete = included.length === ids.length && included.length >= legs && included.every(f => f.match.status === "finished");
    const winner = scoped(entry.aggregatedWinner ?? entry.winner);
    ties.push({ id: `${stage}:${teams.map(t => t.id).sort().join(":")}`, stage, label: stageName(stage, efl)!, teams, matches: included.map(f => f.match), complete, winnerId: complete && teams.some(t => t.id === winner) ? winner : null });
    included.forEach(f => explicitMatches.add(f.match.id));
  }
  const grouped = new Map<string, TournamentFixture[]>();
  for (const f of fixtures) {
    if (format === "league" || (format === "mixed" && !efl) || (!efl && !/^(?:1\/[248]|final|semi.?finals?|quarter.?finals?|round of 16)$/i.test(f.stage ?? "")) || !f.stage || explicitMatches.has(f.match.id) || !real(f.match.home) || !real(f.match.away)) continue;
    const key = `${f.stage}:${[f.match.home.id, f.match.away.id].sort().join(":")}`;
    grouped.set(key, [...(grouped.get(key) ?? []), f]);
  }
  for (const [id, group] of grouped) {
    const f = group[0], stage = f.stage!;
    // Only EFL's verified single-leg stages permit a score-derived winner.
    const singleLeg = efl && ["1", "2", "3", "4", "1/4", "final"].includes(stage);
    const complete = group.every(f => f.match.status === "finished") && (singleLeg ? group.length === 1 : efl && stage === "1/2" ? group.length === 2 : false);
    const teams = [f.match.home, f.match.away]; let winnerId = complete && singleLeg ? f.winnerId : null;
    if (singleLeg && complete && !winnerId && f.match.score && f.match.score.home !== f.match.score.away) winnerId = f.match.score.home > f.match.score.away ? f.match.home.id : f.match.away.id;
    ties.push({ id, stage, label: f.stageName!, teams, matches: group.map(f => f.match), complete, winnerId });
  }
  const current = ties.filter(t => t.stage === active), remaining = new Map<string, Tournament["remaining"][number]>();
  for (const tie of current) {
    const advanced = tie.complete && tie.winnerId;
    for (const team of tie.teams.filter(real)) {
      if (advanced && team.id !== tie.winnerId) continue;
      remaining.set(team.id!, { team, status: advanced ? "advanced" : tie.complete ? "unresolved" : "active" });
    }
  }
  const expected: Record<string, number> = { "4": 8, "1/4": 4, "1/2": 2, final: 1 };
  const activeFixtures = fixtures.filter(f => f.stage === active);
  const sourceRound = rows(obj(p.playoff).rounds).map(obj).find(r => text(r.stage) === active);
  const declaredParticipants = Number(sourceRound?.participantCount);
  const sourceComplete = !!sourceRound && Number.isInteger(declaredParticipants) && declaredParticipants > 0 && current.length === rows(sourceRound.matchups).length && new Set(current.flatMap(t => t.teams.map(team => team.id))).size === declaredParticipants && current.every(t => !t.complete || !!t.winnerId);
  const stageCoverageComplete = sourceComplete || efl && !!active && !!expected[active] && current.length === expected[active] && new Set(current.flatMap(t => t.teams.map(team => team.id))).size === current.length * 2 && activeFixtures.every(f => real(f.match.home) && real(f.match.away) && !["cancelled", "postponed"].includes(f.match.status)) && current.every(t => !t.complete || !!t.winnerId);
  if (!stageCoverageComplete) notes.push("Remaining-team list is partial or uncertain; do not call its count the complete tournament field. Early-round byes, placeholders or unresolved winners may be missing.");
  if (current.some(t => t.complete && !t.winnerId)) notes.push("A completed tie lacks a verified advancing team; do not decide a shootout or aggregate winner from a drawn score.");
  if (!efl) notes.push("Competition-specific progression rules are not verified here. Preserve reported stages/ties; do not derive advancement or a complete remaining field.");
  return { format, tables, id: `fotmob:${expectedId}`, name: text(d.name)!, season: text(d.selectedSeason), fetchedAtUtc, activeStage: active, activeStageName: stageName(active, efl), fixtures, ties, remaining: [...remaining.values()], stageCoverageComplete, calendar: null, notes };
}
