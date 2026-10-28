import { isStoppageMinute, parseClockSeconds } from "../../clock";
import type { MatchStatus, Team } from "../model";
import type { Lineup, LineupPlayer, MatchDetail } from "../detail-model";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Obj : {};
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const text = (v: unknown): string | null => typeof v === "string" && v.trim() ? v : null;
const number = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
const id = (v: unknown): string | null => (typeof v === "number" && v > 0) || (typeof v === "string" && /^\d+$/.test(v) && Number(v) > 0) ? `fotmob:${v}` : null;
const score = (v: unknown): number | null => number(v) !== null && Number.isInteger(v) && Number(v) >= 0 ? Number(v) : null;
const value = (v: unknown): string | null => text(v) ?? (number(v) !== null ? String(v) : null);
function team(v: Obj): Team { const teamId = id(v.id); return { id: teamId, name: text(v.name)!, shortName: null, crestUrl: teamId ? `https://images.fotmob.com/image_resources/logo/teamlogo/${teamId.slice(7)}.png` : null }; }
function players(v: unknown): LineupPlayer[] {
  return list(v).map(obj).filter((p) => text(p.name)).map((p) => ({ id: id(p.id), name: text(p.name)!, shirt: value(p.shirt), position: text(p.position), rating: number(p.rating) }));
}
function lineup(v: unknown): Lineup | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const raw = obj(v); return { formation: text(raw.formation), coach: text(raw.coach), starters: players(raw.starters), substitutes: players(raw.subs) };
}
const states: MatchStatus[] = ["scheduled", "live", "halftime", "finished", "postponed", "cancelled"];

/** Validate provider data and expose only our own presentation contract. */
export function mapFotMobDetail(raw: unknown, expectedId: string): MatchDetail | null {
  const r = obj(raw), status = obj(r.status), home = obj(r.home), away = obj(r.away);
  const state = states.find((s) => s === status.state);
  const fetched = text(r.fetchedAtUtc);
  if (r.state === "unavailable" || String(r.matchId) !== expectedId || !state || !text(home.name) || !text(away.name) || !fetched || Number.isNaN(Date.parse(fetched))) return null;
  const inPlay = state === "live" || state === "halftime", started = inPlay || state === "finished";
  const h = score(home.score), a = score(away.score), minute = text(status.minute), venue = obj(r.venue), available = obj(r.available), lineups = obj(r.lineups);
  const events = list(r.events).map(obj).map((e) => {
    const player = text(e.player), type = text(e.type);
    let description: string | null = null;
    if (type === "goal") description = `${player ?? "Goal"}${player ? " — Goal" : ""}${text(e.assist) ? ` (assist: ${e.assist})` : ""}${e.ownGoal === true ? " (own goal)" : e.penalty === true ? " (penalty)" : ""}`;
    else if (type === "card") description = `${player ?? "Player"} — ${(text(e.card)?.replaceAll("_", " ") ?? "Card")}${text(e.reason) ? ` (${e.reason})` : ""}`;
    else if (type === "sub") description = `${text(obj(e.in).name) ?? "Player"} on, ${text(obj(e.out).name) ?? "player"} off${e.injury === true ? " — injury-related substitution" : ""}`;
    else if (type === "var") description = `VAR — ${text(e.decision) ?? (e.pending === true ? "Decision pending" : "Review")}`;
    else if (type === "period") description = text(e.label);
    else if (type === "added_time") description = `${value(e.minutes) ?? "Unknown"} minutes added`;
    else description = text(e.label) ?? (type ? `${player ? `${player} — ` : ""}${type.replaceAll("_", " ")}` : null);
    const base = value(e.minute), extra = value(e.added);
    return { minute: base ? `${base}${extra ? `+${extra}` : ""}’` : null, side: e.side === "home" || e.side === "away" ? e.side : null, description };
  }).filter((e): e is { minute: string | null; side: "home" | "away" | null; description: string } => e.description !== null);
  const stats = list(r.stats).map(obj).filter((g) => text(g.title)).map((g) => ({ title: text(g.title)!, items: list(g.items).map(obj).filter((i) => text(i.title)).map((i) => ({ label: text(i.title)!, home: value(i.home), away: value(i.away) })) }));
  const competition = obj(r.competition), round = value(competition.round);
  // EFL Cup round four is the last 16; numeric rounds in other competitions
  // are retained as reported, never treated as a generic knockout-stage code.
  // Format verified: https://www.efl.com/news/2026/september/16/carabao-cup-round-four-draw-in-full/
  const eflCup = String(competition.parentId ?? competition.id) === "133";
  const competitionStage = round === null ? null : eflCup && round === "4" ? "Round of 16 (fourth round)" : /^\d+$/.test(round) ? `Round ${round}` : round;
  return {
    match: { id: `fotmob:${expectedId}`, provider: "fotmob", providerMatchId: expectedId, status: state, kickoffUtc: text(status.kickoffUtc) && !Number.isNaN(Date.parse(String(status.kickoffUtc))) ? String(status.kickoffUtc) : null, home: team(home), away: team(away), score: started && h !== null && a !== null ? { home: h, away: a } : null, redCards: { home: 0, away: 0 }, live: inPlay ? { minuteLabel: minute, clockSeconds: state === "live" && !isStoppageMinute(minute ?? "") ? parseClockSeconds(text(status.clock) ?? undefined) : null, asOfUtc: fetched } : null },
    fetchedAtUtc: fetched, competitionName: text(competition.name), competitionId: /^[1-9]\d*$/.test(String(competition.parentId ?? competition.id)) ? `fotmob:${competition.parentId ?? competition.id}` : null, competitionStage, venue: { stadium: text(venue.stadium), city: text(venue.city), referee: text(venue.referee) },
    events: available.events === true && Array.isArray(r.events) ? events : null,
    lineups: { home: lineup(lineups.home), away: lineup(lineups.away) },
    stats: available.stats === true && Array.isArray(r.stats) ? stats : null,
  };
}
