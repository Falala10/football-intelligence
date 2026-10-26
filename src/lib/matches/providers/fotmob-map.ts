import { isStoppageMinute, parseClockSeconds } from "../../clock";
import type { LeagueSection, Match as RawMatch, MatchTeam, MatchesByDate } from "../../fotmob/types";
import type { Competition, CompetitionGroup, DaySchedule, Match, Team } from "../model";

export const FOTMOB = "fotmob";

const IMAGES = "https://images.fotmob.com/image_resources/logo";

function team(raw: MatchTeam): Team {
  return {
    id: raw.id ? `${FOTMOB}:${raw.id}` : null,
    name: raw.name,
    shortName: raw.shortName ?? null,
    crestUrl: raw.id ? `${IMAGES}/teamlogo/${raw.id}.png` : null,
  };
}

function match(raw: RawMatch, fetchedAtUtc: string): Match {
  const inPlay = raw.state === "live" || raw.state === "halftime";
  const started = inPlay || raw.state === "finished";
  const { score: homeScore } = raw.home;
  const { score: awayScore } = raw.away;
  return {
    id: `${FOTMOB}:${raw.matchId}`,
    provider: FOTMOB,
    providerMatchId: raw.matchId,
    status: raw.state,
    kickoffUtc: raw.kickoffUtc ?? null,
    home: team(raw.home),
    away: team(raw.away),
    // Only a match that has started, with both scores present, has a score. Anything else is unknown, not 0-0.
    score: started && homeScore !== undefined && awayScore !== undefined ? { home: homeScore, away: awayScore } : null,
    redCards: { home: raw.home.redCards ?? 0, away: raw.away.redCards ?? 0 },
    live: inPlay
      ? {
          minuteLabel: raw.minute ?? null,
          clockSeconds: raw.state === "live" && !isStoppageMinute(raw.minute ?? "") ? parseClockSeconds(raw.clock) : null,
          asOfUtc: fetchedAtUtc,
        }
      : null,
  };
}

function group(section: LeagueSection, fetchedAtUtc: string): CompetitionGroup {
  const competition: Competition = {
    id: `${FOTMOB}:${section.leagueId}`,
    name: section.name,
    parentName: section.competition ?? null,
    country: section.country ?? null,
    logoUrl: `${IMAGES}/leaguelogo/${section.leagueId}.png`,
  };
  return { id: `${FOTMOB}:section:${section.sectionId}`, competition, matches: section.matches.map((m) => match(m, fetchedAtUtc)) };
}

/** Convert the validated FotMob shape into our own model. The only place that knows FotMob field names. */
export function mapFotMobDay(day: MatchesByDate): DaySchedule {
  return {
    date: day.date,
    timezone: day.timezone,
    fetchedAtUtc: day.fetchedAtUtc,
    counts: { competitions: new Set(day.leagues.map((section) => section.leagueId)).size, matches: day.counts.matches, live: day.counts.live },
    groups: day.leagues.map((l) => group(l, day.fetchedAtUtc)),
  };
}
