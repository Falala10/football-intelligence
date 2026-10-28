import { mapFotMobFixture } from "../competitions/fotmob-map";
import type { TeamFixture, TeamOverview } from "./model";
const obj = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const id = (v: unknown) => /^[1-9]\d*$/.test(String(v)) ? String(v) : null;
export function mapFotMobTeam(raw: unknown, expected: string, fetchedAtUtc: string): TeamOverview {
  const p = obj(obj(raw).payload), d = obj(p.details), f = obj(p.fixtures), all = obj(f.allFixtures).fixtures;
  if (id(d.id) !== expected || (typeof d.name !== "string" || !d.name.trim()) || !Array.isArray(all) || !Number.isFinite(Date.parse(fetchedAtUtc))) throw new Error("Invalid team overview");
  const fixtures: TeamFixture[] = [];
  const seen = new Set<string>();
  for (const value of all) {
    const row = obj(value), status = obj(row.status), reason = obj(status.reason), tournament = obj(row.tournament);
    const m = mapFotMobFixture(row, fetchedAtUtc);
    if (!id(row.id) || !m || !m.kickoffUtc || seen.has(m.id) || ![m.home.id, m.away.id].includes(`fotmob:${expected}`)) continue;
    if (status.awarded === true || /abandon|cancel|postpon/i.test(String(reason.longKey ?? reason.shortKey ?? ""))) continue;
    seen.add(m.id);
    const competition = typeof tournament.name === "string" ? tournament.name : "Competition unknown";
    fixtures.push({ match: m, competitionId: id(tournament.leagueId) ? `fotmob:${id(tournament.leagueId)}` : null, competition, friendly: String(tournament.leagueId) === "489" || /friendly|friendlies/i.test(competition) });
  }
  const leagueId = id(obj(p.stats).primaryLeagueId) ?? id(f.primaryTournamentId);
  const widget = obj(obj(obj(p.overview).venue).widget), location = obj(obj(d.sportsTeamJSONLD).location), address = obj(location.address);
  const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
  const stadium = text(widget.name) ?? text(location.name);
  return { gender: d.gender === "male" || d.gender === "female" ? d.gender : null, homeGround: stadium ? { stadium, city: text(widget.city) ?? text(address.addressLocality), country: text(address.addressCountry) } : null, id: `fotmob:${expected}`, name: d.name, season: typeof d.latestSeason === "string" ? d.latestSeason : null, leagueId: leagueId ? `fotmob:${leagueId}` : null, fetchedAtUtc, fixtures };
}
