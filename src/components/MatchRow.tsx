import { formatKickoff } from "@/lib/dates";
import type { Match, MatchTeam } from "@/lib/fotmob/types";

import { Crest } from "./Crest";
import { LiveMinute } from "./LiveMinute";
import { Score } from "./Score";

type Props = { match: Match; tz: string; fetchedAtMs: number };

function Status({ match, tz, fetchedAtMs }: Props) {
  switch (match.state) {
    case "live":
      return (
        <span className="flex items-center gap-1.5 text-sm font-semibold text-live">
          <span className="live-dot size-2 rounded-full bg-live" aria-hidden="true" />
          <span className="sr-only">Live, </span>
          {match.minute ? <LiveMinute minute={match.minute} clock={match.clock} fetchedAtMs={fetchedAtMs} /> : "Live"}
        </span>
      );
    case "halftime":
      return (
        <span className="text-sm font-semibold text-live" title="Half-time">
          HT
        </span>
      );
    case "finished":
      return (
        <span className="text-sm font-medium text-muted" title="Full-time">
          FT
        </span>
      );
    case "postponed":
      return (
        <span className="text-sm font-medium text-muted" title="Postponed">
          PP
        </span>
      );
    case "cancelled":
      return (
        <span className="text-sm font-medium text-muted" title="Cancelled">
          Canc.
        </span>
      );
    default:
      return <span className="tabular text-sm font-medium text-muted">{formatKickoff(match.kickoffUtc, tz) ?? "TBC"}</span>;
  }
}

function RedCards({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span
      className="inline-flex h-4 min-w-3.5 shrink-0 items-center justify-center rounded-[3px] bg-live px-0.5 text-[10px] font-semibold leading-none text-live-ink"
      role="img"
      aria-label={`${count} red ${count === 1 ? "card" : "cards"}`}
    >
      {count > 1 ? count : ""}
    </span>
  );
}

function Team({ team, side }: { team: MatchTeam; side: "home" | "away" }) {
  // Crests are hidden on phones so the club names get the room.
  const crest = (
    <span className="hidden shrink-0 sm:inline-flex">
      <Crest kind="team" id={team.id} name={team.name} />
    </span>
  );
  return (
    <span className={`flex min-w-0 items-center gap-2 sm:gap-2.5 ${side === "home" ? "justify-end text-right" : "justify-start"}`}>
      {side === "home" ? <RedCards count={team.redCards} /> : crest}
      <span className="line-clamp-2 text-[15px] font-medium leading-tight sm:line-clamp-1 sm:text-base">{team.name}</span>
      {side === "home" ? crest : <RedCards count={team.redCards} />}
    </span>
  );
}

export function MatchRow({ match, tz, fetchedAtMs }: Props) {
  const started = match.state === "live" || match.state === "halftime" || match.state === "finished";
  const { score: homeScore } = match.home;
  const { score: awayScore } = match.away;

  return (
    <li className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-center gap-x-2 border-t border-line-soft px-3 py-2.5 first:border-t-0 sm:grid-cols-[4.25rem_minmax(0,1fr)_6rem_minmax(0,1fr)] sm:gap-x-3 sm:px-4">
      <Status match={match} tz={tz} fetchedAtMs={fetchedAtMs} />
      <Team team={match.home} side="home" />
      <span className="text-center">
        {started && homeScore !== undefined && awayScore !== undefined ? (
          <Score home={homeScore} away={awayScore} />
        ) : (
          <>
            <span className="text-sm font-medium text-faint" aria-hidden="true">
              v
            </span>
            <span className="sr-only">versus</span>
          </>
        )}
      </span>
      <Team team={match.away} side="away" />
    </li>
  );
}
