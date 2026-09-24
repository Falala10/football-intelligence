import type { LeagueSection } from "@/lib/fotmob/types";

import { Crest } from "./Crest";
import { MatchRow } from "./MatchRow";

type Props = { league: LeagueSection; tz: string; fetchedAtMs: number };

export function LeagueCard({ league, tz, fetchedAtMs }: Props) {
  const headingId = `league-${league.sectionId}`;

  return (
    <section aria-labelledby={headingId} className="overflow-hidden rounded-xl border border-line bg-panel">
      <header className="flex items-center gap-2.5 border-b border-line-soft px-4 py-2.5">
        <Crest kind="league" id={league.leagueId} name={league.name} size={22} />
        <h2 id={headingId} className="font-display text-[17px] font-semibold tracking-wide">
          {league.name}
        </h2>
        {league.country ? <span className="text-xs font-medium text-faint">{league.country}</span> : null}
      </header>
      <ul>
        {league.matches.map((match) => (
          <MatchRow key={match.matchId} match={match} tz={tz} fetchedAtMs={fetchedAtMs} />
        ))}
      </ul>
    </section>
  );
}
