import type { LeagueSection, Match, MatchState, MatchesByDate, MatchTeam } from "./types";

const STATES: readonly MatchState[] = ["scheduled", "live", "halftime", "finished", "postponed", "cancelled"];

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function int(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function parseTeam(value: unknown): MatchTeam | null {
  if (!isRecord(value)) return null;
  const name = str(value.name);
  if (!name) return null;
  return {
    name,
    id: str(value.id),
    shortName: str(value.shortName),
    score: int(value.score),
    redCards: int(value.redCards),
  };
}

function parseMatch(value: unknown): Match | null {
  if (!isRecord(value)) return null;
  const matchId = str(value.matchId);
  const state = STATES.find((s) => s === value.state);
  const home = parseTeam(value.home);
  const away = parseTeam(value.away);
  if (!matchId || !state || !home || !away) return null;
  return {
    matchId,
    state,
    kickoffUtc: str(value.kickoffUtc),
    minute: str(value.minute),
    clock: str(value.clock),
    home,
    away,
  };
}

function parseLeague(value: unknown): LeagueSection | null {
  if (!isRecord(value) || !Array.isArray(value.matches)) return null;
  const leagueId = str(value.leagueId);
  const sectionId = str(value.sectionId);
  const name = str(value.name);
  if (!leagueId || !sectionId || !name) return null;
  const matches = value.matches.map(parseMatch).filter((m): m is Match => m !== null);
  return { leagueId, sectionId, name, competition: str(value.competition), country: str(value.country), matches };
}

/**
 * Validate the MCP `get_matches_by_date` result. Returns null when the response is not usable
 * (including the tool's own "unavailable" state) so callers show an error, never an empty day.
 * Individual malformed leagues or matches are dropped rather than failing the whole page.
 */
export function parseMatchesByDate(raw: unknown): MatchesByDate | null {
  if (!isRecord(raw) || raw.state === "unavailable" || !Array.isArray(raw.leagues)) return null;
  const date = str(raw.date);
  const timezone = str(raw.timezone);
  const fetchedAtUtc = str(raw.fetchedAtUtc);
  if (!date || !timezone || !fetchedAtUtc) return null;

  const leagues = raw.leagues.map(parseLeague).filter((l): l is LeagueSection => l !== null && l.matches.length > 0);
  const all = leagues.flatMap((l) => l.matches);
  return {
    date,
    timezone,
    fetchedAtUtc,
    // Recomputed from what survived validation so the counts always match the list.
    counts: {
      leagues: leagues.length,
      matches: all.length,
      live: all.filter((m) => m.state === "live" || m.state === "halftime").length,
    },
    leagues,
  };
}
