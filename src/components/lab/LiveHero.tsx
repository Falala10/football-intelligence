import type { CSSProperties } from "react";

import { formatKickoff } from "@/lib/dates";
import type { Featured } from "@/lib/featured";
import type { MatchTeam } from "@/lib/fotmob/types";

import { Crest } from "../Crest";
import { LiveMinute } from "../LiveMinute";

function TeamBlock({ team }: { team: MatchTeam }) {
  return (
    <div className="lab-team">
      <span className="lab-crest">
        <Crest kind="team" id={team.id} name={team.name} size={64} />
      </span>
      <strong>{team.name}</strong>
    </div>
  );
}

type Props = { featured: Featured; tz: string; fetchedAtMs: number };

/** The big feature card: a live match, otherwise the next kick-off, otherwise a result. */
export function LiveHero({ featured, tz, fetchedAtMs }: Props) {
  const { league, match, kind } = featured;
  const { home, away } = match;
  const kickoff = formatKickoff(match.kickoffUtc, tz);
  const hasScore = kind !== "next" && home.score !== undefined && away.score !== undefined;

  return (
    <article
      className="lab-card lab-hero reveal"
      style={{ "--i": 1 } as CSSProperties}
      aria-label={`${home.name} versus ${away.name}`}
    >
      <span className="lab-orb a" aria-hidden="true" />
      <span className="lab-orb b" aria-hidden="true" />

      <header className="lab-hero-top">
        <span className="lab-eyebrow">{league.name}</span>
        {kind === "live" ? (
          <span className="lab-live">
            <i aria-hidden="true" />
            {match.state === "halftime" ? (
              "Half-time"
            ) : (
              <>
                <span className="sr-only">Live, </span>
                {match.minute ? <LiveMinute minute={match.minute} clock={match.clock} fetchedAtMs={fetchedAtMs} /> : "Live"}
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
          <span key={`${home.score}-${away.score}`} className="lab-bigscore lab-score-pop">
            {home.score}
            <span className="lab-dash">–</span>
            {away.score}
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
    </article>
  );
}
