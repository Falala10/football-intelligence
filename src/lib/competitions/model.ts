import type { Competition, Match, Team } from "../matches/model";
export type Standing = { position: number | null; team: Team; played: number | null; wins: number | null; draws: number | null; losses: number | null; goalDifference: number | null; points: number | null };
export type LeagueSeason = {
  competition: Competition;
  season: string | null;
  fetchedAtUtc: string;
  tables: { name: string; rows: Standing[] }[] | null;
  matches: Match[] | null;
};
export type LeagueResult = { status: "ok"; data: LeagueSeason } | { status: "invalid" } | { status: "unavailable" };
