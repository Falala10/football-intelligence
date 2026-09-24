import { io } from "next/cache";
import Link from "next/link";
import type { CSSProperties } from "react";

import { APP_TIMEZONE } from "@/lib/config";
import { dashboardHref } from "@/lib/dashboard";
import { formatLongDate, todayIso } from "@/lib/dates";
import { pickFeaturedMatch, pickOtherMatches, type Entry } from "@/lib/featured";
import { getMatchesByDate } from "@/lib/fotmob/matches";
import { getPlayerProfile } from "@/lib/fotmob/player";
import { NAV_LEAGUES, selectLeagues } from "@/lib/leagues";
import { SPOTLIGHT_PLAYER } from "@/lib/players";
import { matchesHref, parseMatchesParams } from "@/lib/urls";

import { LiveRefresher } from "../LiveRefresher";
import { DayStats } from "./DayStats";
import { FormStrip } from "./FormStrip";
import { LabDateStrip } from "./LabDateStrip";
import { LabMatchCard } from "./LabMatchCard";
import { LabRail } from "./LabRail";
import { LiveHero } from "./LiveHero";
import { Marquee } from "./Marquee";
import { PlayerSpotlight } from "./PlayerSpotlight";
import { StatRings } from "./StatRings";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const LIVE_REFRESH_MS = 30_000;
const IDLE_REFRESH_MS = 90_000;

export async function DashboardView({ searchParams }: { searchParams: SearchParams }) {
  // The current time and URL are only known per request, so this page renders at view time.
  await io();
  const today = todayIso(APP_TIMEZONE, new Date());
  const params = parseMatchesParams(await searchParams, today);

  const [matches, player] = await Promise.all([
    getMatchesByDate({ date: params.date, tz: APP_TIMEZONE }),
    getPlayerProfile({ player: SPOTLIGHT_PLAYER.id, recent: 5 }),
  ]);

  const data = matches.status === "ok" ? matches.data : null;
  const leagues = data ? selectLeagues(data.leagues, { leagueId: params.league }) : [];
  const featured = pickFeaturedMatch(leagues);
  const others = pickOtherMatches(leagues, featured, 6);
  const liveEntries: Entry[] = data
    ? selectLeagues(data.leagues, { liveOnly: true }).flatMap((league) => league.matches.map((match) => ({ league, match })))
    : [];
  const fetchedAtMs = data ? Date.parse(data.fetchedAtUtc) : 0;
  const profile = player.status === "ok" ? player.data : null;

  // Refresh faster while matches are live; retry if the data source is down; leave other days alone.
  const refreshMs = !data ? LIVE_REFRESH_MS : data.counts.live > 0 ? LIVE_REFRESH_MS : params.date === today ? IDLE_REFRESH_MS : null;

  return (
    <main className="lab-main">
      <LabRail />
      <LiveRefresher intervalMs={refreshMs} />
      <div className="lab-wrap">
        <Marquee entries={liveEntries} />

        <header className="lab-head reveal">
          <div>
            <p className="lab-eyebrow">{formatLongDate(params.date)}</p>
            <h1 className="lab-display lab-title">{params.date === today ? "Today" : "Matches"}</h1>
          </div>
          <Link href={matchesHref({ date: params.date, league: params.league }, today)} className="lab-chip">
            Full list
          </Link>
        </header>

        <LabDateStrip selected={params.date} today={today} league={params.league} />

        <nav aria-label="Leagues" className="lab-pills">
          <Link href={dashboardHref({ date: params.date }, today)} aria-current={params.league ? undefined : "page"} className="lab-chip">
            All
          </Link>
          {NAV_LEAGUES.map((league) => (
            <Link
              key={league.id}
              href={dashboardHref({ date: params.date, league: league.id }, today)}
              aria-current={params.league === league.id ? "page" : undefined}
              className="lab-chip"
            >
              {league.name}
            </Link>
          ))}
        </nav>

        {!data ? (
          <div role="alert" className="lab-card lab-alert">
            <h2 className="lab-display">Live data isn’t available right now</h2>
            <p>We couldn’t reach the football data source. This page keeps trying automatically.</p>
            {process.env.NODE_ENV !== "production" ? (
              <p style={{ marginTop: 12 }}>
                Development tip: run <code>fotmob-mcp --transport streamable-http --port 8000</code>.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="lab-grid">
            <div className="c-8 r-2" style={{ display: "grid" }}>
              {featured ? (
                <LiveHero featured={featured} tz={APP_TIMEZONE} fetchedAtMs={fetchedAtMs} />
              ) : (
                <div className="lab-card lab-alert reveal" style={{ "--i": 1 } as CSSProperties}>
                  <h2 className="lab-display">No matches to feature</h2>
                  <p>{params.league ? "This league has no matches on this day." : "There are no matches on this day."}</p>
                </div>
              )}
            </div>
            <div className="c-4 r-2" style={{ display: "grid" }}>
              {profile ? (
                <PlayerSpotlight profile={profile} photo={SPOTLIGHT_PLAYER.photo} />
              ) : (
                <div className="lab-card lab-alert reveal" style={{ "--i": 2 } as CSSProperties}>
                  <h2 className="lab-display">Player spotlight</h2>
                  <p>The player profile isn’t available right now.</p>
                </div>
              )}
            </div>
            {profile ? (
              <>
                <div className="c-4" style={{ display: "grid" }}>
                  <StatRings profile={profile} />
                </div>
                <div className="c-4" style={{ display: "grid" }}>
                  <FormStrip profile={profile} />
                </div>
              </>
            ) : null}
            <div className="c-4" style={{ display: "grid" }}>
              <DayStats
                title={params.date === today ? "Today in numbers" : "The day in numbers"}
                matches={data.counts.matches}
                live={data.counts.live}
                toPlay={data.leagues.reduce((total, league) => total + league.matches.filter((match) => match.state === "scheduled").length, 0)}
                leagues={data.counts.leagues}
              />
            </div>
          </div>
        )}

        {data && others.length > 0 ? (
          <>
            <div className="lab-more">
              <h2 className="lab-display">More matches</h2>
              <Link href={matchesHref({ date: params.date, league: params.league }, today)} className="lab-chip">
                See every match
              </Link>
            </div>
            <div className="lab-cards">
              {others.map(({ league, match }, index) => (
                <LabMatchCard key={match.matchId} league={league} match={match} tz={APP_TIMEZONE} fetchedAtMs={fetchedAtMs} index={index} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
