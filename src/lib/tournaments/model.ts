import type { Match, Team } from "../matches/model";
export type TournamentFixture = { match: Match; stage: string | null; stageName: string | null; winnerId: string | null };
export type TournamentTie = { id: string; stage: string; label: string; teams: Team[]; matches: Match[]; winnerId: string | null; complete: boolean };
export type Tournament = {
  id: string; name: string; season: string | null; fetchedAtUtc: string;
  activeStage: string | null; activeStageName: string | null;
  fixtures: TournamentFixture[]; ties: TournamentTie[];
  remaining: { team: Team; status: "active" | "advanced" | "unresolved" }[];
  stageCoverageComplete: boolean;
  calendar: { finalDate: string | null; dates: { stage: string; dateText: string }[]; sourceUrl: string; checkedAtUtc: string } | null;
  format?: "league" | "knockout" | "mixed" | "unknown";
  tables?: import("../competitions/model").LeagueSeason["tables"];
  notes: string[];
};
