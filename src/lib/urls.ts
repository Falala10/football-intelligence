import { isIsoDate } from "./dates";
import { isNavLeagueId } from "./leagues";

export type MatchesParams = { date: string; league?: string; live: boolean };

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Read the Matches page URL parameters, ignoring anything invalid. */
export function parseMatchesParams(raw: RawParams, today: string): MatchesParams {
  const date = first(raw.date);
  const league = first(raw.league);
  return {
    date: isIsoDate(date) ? date : today,
    league: isNavLeagueId(league) ? league : undefined,
    live: first(raw.live) === "1",
  };
}

/**
 * Build a Matches page URL. Default values are left out so the plain page stays at "/".
 * When `today` is unknown, an explicit date is always kept.
 */
export function matchesHref(query: { date?: string; league?: string; live?: boolean }, today?: string): string {
  const params = new URLSearchParams();
  if (query.date && query.date !== today) params.set("date", query.date);
  if (query.league) params.set("league", query.league);
  if (query.live) params.set("live", "1");
  const search = params.toString();
  return search ? `/?${search}` : "/";
}
