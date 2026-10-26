import { NAV_LEAGUES } from "../leagues";
import type { CompetitionGroup } from "./model";

// Existing URLs use the original navigation ids; translate at this boundary.
export const navCompetitionId = (id: string) => `fotmob:${id}`;

export function selectGroups(
  groups: readonly CompetitionGroup[],
  { leagueId, liveOnly = false }: { leagueId?: string; liveOnly?: boolean } = {},
): CompetitionGroup[] {
  const order = NAV_LEAGUES.map(({ id }) => navCompetitionId(id));
  const rank = (id: string) => { const index = order.indexOf(id); return index < 0 ? order.length : index; };
  return groups
    .filter((group) => !leagueId || group.competition.id === navCompetitionId(leagueId))
    .map((group) => ({ ...group, matches: liveOnly ? group.matches.filter((match) => match.status === "live" || match.status === "halftime") : group.matches }))
    .filter((group) => group.matches.length > 0)
    .sort((a, b) => rank(a.competition.id) - rank(b.competition.id));
}
