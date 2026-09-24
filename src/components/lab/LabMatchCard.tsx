import type { CSSProperties } from "react";

import { formatKickoff } from "@/lib/dates";
import type { LeagueSection, Match, MatchTeam } from "@/lib/fotmob/types";

import { Crest } from "../Crest";
import { LiveMinute } from "../LiveMinute";

function Team({ team }: { team: MatchTeam }) {
  return (
    <div className="lab-mc-team">
      <span className="lab-mc-crest">
        <Crest kind="team" id={team.id} name={team.name} size={40} />
      </span>
      <span>{team.name}</span>
    </div>
  );
}

function Status({ match, tz, fetchedAtMs }: { match: Match; tz: string; fetchedAtMs: number }) {
  switch (match.state) {
    case "live":
      return (
        <span className="lab-live">
          <i aria-hidden="true" />
          <span className="sr-only">Live, </span>
          {match.minute ? <LiveMinute minute={match.minute} clock={match.clock} fetchedAtMs={fetchedAtMs} /> : "Live"}
        </span>
      );
    case "halftime":
      return <span className="lab-live"><i aria-hidden="true" />Half-time</span>;
    case "finished":
      return <span className="lab-pill">Full time</span>;
    case "postponed":
      return <span className="lab-pill">Postponed</span>;
    case "cancelled":
      return <span className="lab-pill">Cancelled</span>;
    default:
      return <span className="lab-pill">{formatKickoff(match.kickoffUtc, tz) ?? "TBC"}</span>;
  }
}

type Props = { league: LeagueSection; match: Match; tz: string; fetchedAtMs: number; index: number };

export function LabMatchCard({ league, match, tz, fetchedAtMs, index }: Props) {
  const started = match.state === "live" || match.state === "halftime" || match.state === "finished";
  const { score: homeScore } = match.home;
  const { score: awayScore } = match.away;

  return (
    <article className="lab-card lab-mc reveal" style={{ "--i": index + 5 } as CSSProperties}>
      <div className="lab-mc-top">
        <span className="lab-eyebrow">{league.name}</span>
        <Status match={match} tz={tz} fetchedAtMs={fetchedAtMs} />
      </div>
      <div className="lab-mc-row">
        <Team team={match.home} />
        {started && homeScore !== undefined && awayScore !== undefined ? (
          <span key={`${homeScore}-${awayScore}`} className="lab-mc-score lab-score-pop">
            {homeScore}–{awayScore}
          </span>
        ) : (
          <span className="lab-mc-score vs">
            <span aria-hidden="true">VS</span>
            <span className="sr-only">versus</span>
          </span>
        )}
        <Team team={match.away} />
      </div>
    </article>
  );
}
