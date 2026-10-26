import type { Match } from "./model";

export type LineupPlayer = { id: string | null; name: string; shirt: string | null; position: string | null; rating: number | null };
export type Lineup = { formation: string | null; coach: string | null; starters: LineupPlayer[]; substitutes: LineupPlayer[] };
export type MatchDetail = {
  match: Match;
  fetchedAtUtc: string;
  competitionName: string | null;
  venue: { stadium: string | null; city: string | null; referee: string | null };
  events: { minute: string | null; side: "home" | "away" | null; description: string }[] | null;
  lineups: { home: Lineup | null; away: Lineup | null };
  stats: { title: string; items: { label: string; home: string | null; away: string | null }[] }[] | null;
};
export type DetailResult = { status: "ok"; data: MatchDetail } | { status: "invalid" | "unavailable" };
