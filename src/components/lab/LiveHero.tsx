import Link from "next/link";
import type { CSSProperties } from "react";

import { formatKickoff } from "@/lib/dates";
import type { Featured } from "@/lib/featured";
import type { Team as MatchTeam } from "@/lib/matches/model";

import { Crest } from "../Crest";
import { LiveMinute } from "../LiveMinute";

function TeamBlock({ team }: { team: MatchTeam }) {
  return (
    <div className="lab-team">
      <span className="lab-crest">
        <Crest src={team.crestUrl} name={team.name} size={64} />
      </span>
      <strong>{team.name}</strong>
    </div>
  );
}

type Props = { featured: Featured; tz: string };

/** The big feature card: a live match, otherwise the next kick-off, otherwise a result. */
export function LiveHero({ featured, tz }: Props) {
  const { league, match, kind } = featured;
  const { home, away } = match;
  const kickoff = formatKickoff(match.kickoffUtc ?? undefined, tz);
  const hasScore = match.score !== null;

  return (
    <Link href={`/matches/${encodeURIComponent(match.id)}`} className="detail-match-link"><article
      className="lab-card lab-hero reveal"
      style={{ "--i": 1 } as CSSProperties}
      aria-label={`${home.name} versus ${away.name}`}
    >
      <span className="lab-orb a" aria-hidden="true" />
      <span className="lab-orb b" aria-hidden="true" />

      <header className="lab-hero-top">
        <span className="lab-eyebrow">{league.competition.name}</span>
        {kind === "live" ? (
          <span className="lab-live">
            <i aria-hidden="true" />
            {match.status === "halftime" ? (
              "Half-time"
            ) : (
              <>
                <span className="sr-only">Live, </span>
                {match.live?.minuteLabel ? <LiveMinute minute={match.live.minuteLabel} clockSeconds={match.live.clockSeconds} fetchedAtMs={Date.parse(match.live.asOfUtc)} /> : "Live"}
              </>
            )}
          </span>
        ) : kind === "next" ? (
          <span className="lab-pill">Up next</span>
        ) : (
          <span className="lab-pill">Full time</span>
        )}
      </header>

      <div className="lab-hero-body">
        <TeamBlock team={home} />
        {hasScore ? (
          // Keying on the score restarts the pop animation every time it changes.
          <span key={`${match.score?.home}-${match.score?.away}`} className="lab-bigscore lab-score-pop">
            {match.score?.home}
            <span className="lab-dash">–</span>
            {match.score?.away}
          </span>
        ) : (
          <span className="lab-bigscore">{kickoff ?? "TBC"}</span>
        )}
        <TeamBlock team={away} />
      </div>

      <footer className="lab-hero-foot">
        <span>
          {kind === "live" ? "Updates automatically" : kind === "next" ? `Kick-off ${kickoff ?? "to be confirmed"}` : "Final score"}
        </span>
        <span>{tz.replaceAll("_", " ")}</span>
      </footer>
    </article></Link>
  );
}
