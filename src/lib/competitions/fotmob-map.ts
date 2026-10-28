import type { Competition, Match, MatchStatus, Team } from "../matches/model";
import type { LeagueSeason, Standing } from "./model";
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Obj : {};
const text = (v: unknown): string | null => typeof v === "string" && v.trim() ? v : null;
const int = (v: unknown): number | null => typeof v === "number" && Number.isInteger(v) ? v : null;
const id = (v: unknown): string | null => typeof v === "number" || typeof v === "string" ? String(v) : null;
function team(raw: Obj): Team { const n = id(raw.id); return { id: n ? `fotmob:${n}` : null, name: text(raw.name)!, shortName: text(raw.shortName), crestUrl: n ? `https://images.fotmob.com/image_resources/logo/teamlogo/${n}.png` : null }; }
function standing(raw: unknown): Standing | null {
  const r = obj(raw); if (!text(r.name)) return null;
  return { position: int(r.idx), team: team(r), played: int(r.played), wins: int(r.wins), draws: int(r.draws), losses: int(r.losses), goalDifference: int(r.goalConDiff), points: int(r.pts) };
}
export function mapFotMobFixture(raw: unknown, fetched: string): Match | null {
  const r = obj(raw), s = obj(r.status), home = obj(r.home), away = obj(r.away), n = id(r.id);
  if (!n || !text(home.name) || !text(away.name)) return null;
  const reason = obj(s.reason), key = String(reason.shortKey ?? reason.longKey ?? "").toLowerCase();
  const status: MatchStatus = s.cancelled === true || s.awarded === true || /abandon|cancel/.test(key) ? "cancelled" : s.postponed === true || key.includes("postpon") ? "postponed" : s.finished === true ? "finished" : key.includes("halftime") || key.includes("half_time") || reason.short === "HT" ? "halftime" : s.started === true ? "live" : "scheduled";
  const scores = typeof s.scoreStr === "string" ? /^(\d+)\s*[-–]\s*(\d+)$/.exec(s.scoreStr.trim()) : null;
  const inPlay = status === "live" || status === "halftime";
  const utc = text(s.utcTime);
  return { id: `fotmob:${n}`, provider: "fotmob", providerMatchId: n, status, kickoffUtc: utc && !Number.isNaN(Date.parse(utc)) ? utc : null, home: team(home), away: team(away), score: (inPlay || status === "finished") && scores ? { home: Number(scores[1]), away: Number(scores[2]) } : null, redCards: { home: 0, away: 0 }, live: inPlay ? { minuteLabel: status === "halftime" ? "HT" : text(reason.short), clockSeconds: null, asOfUtc: fetched } : null };
}

/** Keep all FotMob table nesting and fixture fields out of presentation code. */
export function mapFotMobLeague(raw: unknown, expectedId: string, fetchedAtUtc: string): LeagueSeason | null {
  const payload = obj(obj(raw).payload), details = obj(payload.details);
  if (id(details.id) !== expectedId || !text(details.name)) return null;
  const competition: Competition = { id: `fotmob:${expectedId}`, name: text(details.name)!, parentName: null, country: text(details.country), logoUrl: `https://images.fotmob.com/image_resources/logo/leaguelogo/${expectedId}.png` };
  const tables: NonNullable<LeagueSeason["tables"]> = [];
  // Some leagues have multiple conferences/stages. Preserve each overall table, never home/away tables.
  function visit(value: unknown, name: string) {
    if (Array.isArray(value)) { value.forEach((v) => visit(v, name)); return; }
    const r = obj(value), currentName = text(r.name) ?? text(r.leagueName) ?? name;
    const overall = obj(r.table).all;
    if (Array.isArray(overall)) {
      const rows = overall.map(standing).filter((v): v is Standing => v !== null);
      if (rows.length) tables.push({ name: currentName, rows });
      return;
    }
    for (const key of ["data", "tables", "table", "groups"]) if (r[key]) visit(r[key], currentName);
  }
  visit(payload.table, competition.name);
  const fixtures = obj(payload.fixtures).allMatches;
  const matches = Array.isArray(fixtures) ? fixtures.map((r) => mapFotMobFixture(r, fetchedAtUtc)).filter((m): m is Match => m !== null) : null;
  return { competition, season: text(details.selectedSeason), fetchedAtUtc, tables: tables.length ? tables : null, matches };
}
