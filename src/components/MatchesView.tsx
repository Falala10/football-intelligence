import { io } from "next/cache";
import Link from "next/link";

import { APP_TIMEZONE } from "@/lib/config";
import { addDays, formatLongDate, formatUpdatedTime, todayIso } from "@/lib/dates";
import { getMatchesByDate } from "@/lib/fotmob/matches";
import { NAV_LEAGUES, selectLeagues } from "@/lib/leagues";
import { matchesHref, parseMatchesParams } from "@/lib/urls";

import { DatePicker } from "./DatePicker";
import { LeagueCard } from "./LeagueCard";
import { LiveRefresher } from "./LiveRefresher";
import { ThemeToggle } from "./ThemeToggle";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const chip = "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors";
const chipIdle = "border-line bg-panel text-muted hover:text-ink";
const chipActive = "border-brand bg-brand text-brand-ink";

const LIVE_REFRESH_MS = 30_000;
const IDLE_REFRESH_MS = 90_000;

export async function MatchesView({ searchParams }: { searchParams: SearchParams }) {
  // The current time and URL are only known per request, so this page renders at view time.
  await io();
  const today = todayIso(APP_TIMEZONE, new Date());
  const params = parseMatchesParams(await searchParams, today);
  const result = await getMatchesByDate({ date: params.date, tz: APP_TIMEZONE });

  const href = (changes: { date?: string; league?: string; live?: boolean }) =>
    matchesHref({ date: params.date, league: params.league, live: params.live, ...changes }, today);

  const data = result.status === "ok" ? result.data : null;
  const leagues = data ? selectLeagues(data.leagues, { leagueId: params.league, liveOnly: params.live }) : [];
  const shownMatches = leagues.reduce((total, league) => total + league.matches.length, 0);
  const liveInSelection = data
    ? selectLeagues(data.leagues, { leagueId: params.league, liveOnly: true }).reduce((n, l) => n + l.matches.length, 0)
    : 0;
  const fetchedAtMs = data ? Date.parse(data.fetchedAtUtc) : 0;
  const updated = data ? formatUpdatedTime(data.fetchedAtUtc, APP_TIMEZONE) : undefined;

  // Refresh faster while matches are live; retry if the data source is down; leave other days alone.
  const refreshMs = !data ? LIVE_REFRESH_MS : data.counts.live > 0 ? LIVE_REFRESH_MS : params.date === today ? IDLE_REFRESH_MS : null;

  const dateChips = [
    { label: "Yesterday", date: addDays(today, -1) },
    { label: "Today", date: today },
    { label: "Tomorrow", date: addDays(today, 1) },
  ];

  return (
    <main className="mx-auto w-full max-w-[920px] px-4 pb-16 sm:px-6">
      <LiveRefresher intervalMs={refreshMs} />

      <header className="z-10 -mx-4 md:sticky md:top-0 border-b border-line bg-bg/95 px-4 pb-3 pt-5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-3xl font-bold tracking-wide">Matches</h1>
            <p className="text-[15px] font-medium text-muted">{formatLongDate(params.date)}</p>
          </div>
          <div className="md:hidden">
            <ThemeToggle compact />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {dateChips.map((item) => (
            <Link
              key={item.label}
              href={href({ date: item.date })}
              aria-current={params.date === item.date ? "page" : undefined}
              className={`${chip} ${params.date === item.date ? chipActive : chipIdle}`}
            >
              {item.label}
            </Link>
          ))}
          <DatePicker value={params.date} today={today} league={params.league} live={params.live} />
          <span className="flex-1" />
          <Link
            href={href({ live: !params.live })}
            aria-pressed={params.live}
            className={`${chip} gap-2 ${params.live ? "border-live bg-live text-live-ink" : "border-live/50 bg-panel text-live"}`}
          >
            <span className="live-dot size-2 rounded-full bg-current" aria-hidden="true" />
            Live now{data ? ` · ${liveInSelection}` : ""}
          </Link>
        </div>

        <nav aria-label="Leagues" className="-mx-4 mt-3 overflow-x-auto px-4 md:hidden">
          <ul className="flex gap-2">
            <li>
              <Link href={href({ league: undefined })} className={`${chip} ${params.league ? chipIdle : chipActive}`}>
                All
              </Link>
            </li>
            {NAV_LEAGUES.map((league) => (
              <li key={league.id}>
                <Link
                  href={href({ league: league.id })}
                  className={`${chip} whitespace-nowrap ${params.league === league.id ? chipActive : chipIdle}`}
                >
                  {league.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {!data ? (
        <div role="alert" className="mt-6 rounded-xl border border-line bg-panel p-6">
          <h2 className="font-display text-xl font-semibold">Live data isn’t available right now</h2>
          <p className="mt-1.5 text-muted">We couldn’t reach the football data source. This page will keep trying automatically.</p>
          {process.env.NODE_ENV !== "production" ? (
            <p className="mt-3 text-sm text-faint">
              Development tip: the FotMob MCP must be running with{" "}
              <code className="rounded bg-line-soft px-1.5 py-0.5">fotmob-mcp --transport streamable-http --port 8000</code>.
            </p>
          ) : null}
          <Link href={href({})} className={`${chip} ${chipIdle} mt-4`}>
            Try again
          </Link>
        </div>
      ) : leagues.length === 0 ? (
        <div className="mt-6 rounded-xl border border-line bg-panel p-6">
          <h2 className="font-display text-xl font-semibold">No matches to show</h2>
          <p className="mt-1.5 text-muted">
            {params.live
              ? "Nothing is being played right now with these filters."
              : params.league
                ? "This league has no matches on this day."
                : "There are no matches on this day."}
          </p>
          {params.live || params.league ? (
            <Link href={href({ live: false, league: undefined })} className={`${chip} ${chipIdle} mt-4`}>
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-faint">
            {shownMatches} {shownMatches === 1 ? "match" : "matches"}
            {updated ? ` · updated ${updated}` : ""}
          </p>
          <div className="mt-3 flex flex-col gap-4">
            {leagues.map((league) => (
              <LeagueCard key={league.sectionId} league={league} tz={APP_TIMEZONE} fetchedAtMs={fetchedAtMs} />
            ))}
          </div>
          <p className="mt-6 text-xs text-faint">Times shown in {APP_TIMEZONE.replaceAll("_", " ")}.</p>
        </>
      )}
    </main>
  );
}
