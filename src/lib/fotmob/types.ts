// Shapes returned by the FotMob MCP `get_matches_by_date` tool (already compacted server-side).
// Optional fields are absent when FotMob does not provide them; absent never means zero.

export type MatchState = "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled";

export type MatchTeam = {
  id?: string;
  name: string;
  shortName?: string;
  /** Present only once a match has started. A missing score is "not started", not 0. */
  score?: number;
  redCards?: number;
};

export type Match = {
  matchId: string;
  state: MatchState;
  kickoffUtc?: string;
  /** Live minute such as "66’", or "HT". Only present while a match is in play. */
  minute?: string;
  /** Exact match clock (mm:ss) when fetched; present only while a match is live, so it can be counted forward. */
  clock?: string;
  home: MatchTeam;
  away: MatchTeam;
};

export type LeagueSection = {
  /** FotMob league id, used for league pages. Shared by groups of one competition. */
  leagueId: string;
  /** Unique per listed section; use as a list key. */
  sectionId: string;
  name: string;
  /** Parent competition when the section is a group, e.g. "UEFA Nations League A". */
  competition?: string;
  country?: string;
  matches: Match[];
};

export type MatchesByDate = {
  date: string;
  timezone: string;
  fetchedAtUtc: string;
  counts: { leagues: number; matches: number; live: number };
  leagues: LeagueSection[];
};

export type MatchesResult = { status: "ok"; data: MatchesByDate } | { status: "unavailable" };
