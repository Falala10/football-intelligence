import type { Match } from "../matches/model";
export type TeamFixture = { match: Match; competitionId: string | null; competition: string; friendly: boolean };
export type TeamOverview = { id: string; name: string; season: string | null; leagueId: string | null; fetchedAtUtc: string; fixtures: TeamFixture[]; gender?: "male" | "female" | null; homeGround?: { stadium: string; city: string | null; country: string | null } | null };
export type FormRecord = { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
