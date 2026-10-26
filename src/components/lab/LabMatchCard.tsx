import Link from "next/link";
import type { CSSProperties } from "react";

import { formatKickoff } from "@/lib/dates";
import type { CompetitionGroup, Match, Team as MatchTeam } from "@/lib/matches/model";

import { Crest } from "../Crest";
import { LiveMinute } from "../LiveMinute";

function Team({ team }: { team: MatchTeam }) {
  return (
    <div className="lab-mc-team">
      <span className="lab-mc-crest">
        <Crest src={team.crestUrl} name={team.name} size={40} />
      </span>
      <span>{team.name}</span>
    </div>
  );
}

function Status({ match, tz }: { match: Match; tz: string }) {
  switch (match.status) {
    case "live":
      return (
        <span className="lab-live">
          <i aria-hidden="true" />
          <span className="sr-only">Live, </span>
          {match.live?.minuteLabel ? <LiveMinute minute={match.live.minuteLabel} clockSeconds={match.live.clockSeconds} fetchedAtMs={Date.parse(match.live.asOfUtc)} /> : "Live"}
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
      return <span className="lab-pill">{formatKickoff(match.kickoffUtc ?? undefined, tz) ?? "TBC"}</span>;
  }
}

type Props = { league: CompetitionGroup; match: Match; tz: string; index: number };

export function LabMatchCard({ league, match, tz, index }: Props) {
  const homeScore = match.score?.home;
  const awayScore = match.score?.away;

  return (
    <Link href={`/matches/${encodeURIComponent(match.id)}`} className="detail-match-link"><article className="lab-card lab-mc reveal" style={{ "--i": index + 5 } as CSSProperties}>
      <div className="lab-mc-top">
        <span className="lab-eyebrow">{league.competition.name}</span>
        <Status match={match} tz={tz} />
      </div>
      <div className="lab-mc-row">
        <Team team={match.home} />
        {match.score !== null ? (
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
    </article></Link>
  );
}
