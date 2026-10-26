// Our own match model. UI code depends only on this file, never on a provider's payload shape.

export type MatchStatus = "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled";

export type Team = {
  /** Provider-scoped, e.g. "fotmob:8634". */
  id: string | null;
  name: string;
  shortName: string | null;
  crestUrl: string | null;
};

export type Competition = {
  /** Provider-scoped, e.g. "fotmob:47". Shared by every group of one competition. */
  id: string;
  name: string;
  /** Parent competition when the group is a stage or group, e.g. "UEFA Nations League A". */
  parentName: string | null;
  country: string | null;
  logoUrl: string | null;
};

export type Score = { home: number; away: number };

export type LiveState = {
  /** Label as reported, e.g. "67’", "45+2’" or "HT". */
  minuteLabel: string | null;
  /** Exact clock when the data was fetched, so a client can count forward. Null when unknown or in stoppage time. */
  clockSeconds: number | null;
  /** When the data was fetched; the clock counts forward from here. */
  asOfUtc: string;
};

export type Match = {
  /** Ours, unique across providers: "<provider>:<providerMatchId>". Used in URLs. */
  id: string;
  provider: string;
  providerMatchId: string;
  status: MatchStatus;
  kickoffUtc: string | null;
  home: Team;
  away: Team;
  /** Null until the match has started. Null never means 0-0. */
  score: Score | null;
  redCards: { home: number; away: number };
  /** Present only while the match is live or at halftime. */
  live: LiveState | null;
};

export type CompetitionGroup = {
  /** Unique per listed group; use as a list key. */
  id: string;
  competition: Competition;
  matches: Match[];
};

export type DaySchedule = {
  date: string;
  timezone: string;
  fetchedAtUtc: string;
  counts: { competitions: number; matches: number; live: number };
  groups: CompetitionGroup[];
};

export type DayResult = { status: "ok"; data: DaySchedule } | { status: "unavailable" };
