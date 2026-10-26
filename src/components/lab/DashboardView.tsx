import { io } from "next/cache";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";

import { APP_TIMEZONE } from "@/lib/config";
import { dashboardHref } from "@/lib/dashboard";
import { formatLongDate, todayIso } from "@/lib/dates";
import { pickFeaturedMatch, type Entry } from "@/lib/featured";
import { getDaySchedule } from "@/lib/matches/service";
import { selectGroups } from "@/lib/matches/select";
import { getPlayerProfile } from "@/lib/fotmob/player";
import { NAV_LEAGUES } from "@/lib/leagues";
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

  const matchesPromise = getDaySchedule({ date: params.date, timezone: APP_TIMEZONE });
  const playerPromise = getPlayerProfile({ player: SPOTLIGHT_PLAYER.id, recent: 5 });


  return (
    <main className="lab-main">
      <LabRail />
      <div className="lab-wrap">
        <Suspense fallback={null}><DashboardTicker matchesPromise={matchesPromise} /></Suspense>

        <header className="lab-head reveal">
          <div>
            <p className="lab-eyebrow">{formatLongDate(params.date)}</p>
            <h1 className="lab-display lab-title">{params.date === today ? "Today" : "Matches"}</h1>
          </div>
          <Link href={matchesHref({ date: params.date, league: params.league }, today)} className="lab-chip">
            Classic list
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

        <Suspense key={`${params.date}:${params.league ?? "all"}`} fallback={<div className="lab-grid" role="status" aria-label="Loading matches"><div className="lab-skel c-8 r-2" style={{ minHeight: 440 }} /><div className="lab-skel c-4 r-2" style={{ minHeight: 440 }} /></div>}>
          <DashboardMatches matchesPromise={matchesPromise} playerPromise={playerPromise} params={params} today={today} />
        </Suspense>
      </div>
    </main>
  );
}


type MatchesPromise = ReturnType<typeof getDaySchedule>;
type PlayerPromise = ReturnType<typeof getPlayerProfile>;

async function DashboardTicker({ matchesPromise }: { matchesPromise: MatchesPromise }) {
  const result = await matchesPromise;
  const entries: Entry[] = result.status === "ok" ? selectGroups(result.data.groups, { liveOnly: true }).flatMap((league) => league.matches.map((match) => ({ league, match }))) : [];
  return <Marquee entries={entries} />;
}

async function DashboardPlayer({ playerPromise, section }: { playerPromise: PlayerPromise; section: "spotlight" | "stats" | "form" }) {
  const player = await playerPromise;
  if (player.status !== "ok") return <div className="lab-card lab-alert"><h2 className="lab-display">{section === "spotlight" ? "Player spotlight" : section === "stats" ? "Season profile" : "Recent form"}</h2><p>The player profile isn’t available right now.</p></div>;
  if (section === "spotlight") return <PlayerSpotlight profile={player.data} photo={SPOTLIGHT_PLAYER.photo} />;
  if (section === "stats") return <StatRings profile={player.data} />;
  return <FormStrip profile={player.data} />;
}

async function DashboardMatches({ matchesPromise, playerPromise, params, today }: {
  matchesPromise: MatchesPromise;
  playerPromise: PlayerPromise;
  params: ReturnType<typeof parseMatchesParams>;
  today: string;
}) {
  const matches = await matchesPromise;
  const data = matches.status === "ok" ? matches.data : null;
  const leagues = data ? selectGroups(data.groups, { leagueId: params.league }) : [];
  const featured = pickFeaturedMatch(leagues);


  // Refresh faster while matches are live; retry if the data source is down; leave other days alone.
  const refreshMs = !data ? LIVE_REFRESH_MS : data.counts.live > 0 ? LIVE_REFRESH_MS : params.date === today ? IDLE_REFRESH_MS : null;

  return <>
    <LiveRefresher intervalMs={refreshMs} />
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
                <LiveHero featured={featured} tz={data.timezone} />
              ) : (
                <div className="lab-card lab-alert reveal" style={{ "--i": 1 } as CSSProperties}>
                  <h2 className="lab-display">No matches to feature</h2>
                  <p>{leagues.length > 0 ? "See the schedule below for all match statuses." : params.league ? "This league has no matches on this day." : "There are no matches on this day."}</p>
                </div>
              )}
            </div>
            <div className="c-4 r-2" style={{ display: "grid" }}>
              <Suspense fallback={<div className="lab-skel" style={{ minHeight: 440 }} role="status" aria-label="Loading player spotlight" />}>
                <DashboardPlayer playerPromise={playerPromise} section="spotlight" />
              </Suspense>
            </div>
            <div className="c-4" style={{ display: "grid" }}>
              <Suspense fallback={<div className="lab-skel" style={{ minHeight: 240 }} />}><DashboardPlayer playerPromise={playerPromise} section="stats" /></Suspense>
            </div>
            <div className="c-4" style={{ display: "grid" }}>
              <Suspense fallback={<div className="lab-skel" style={{ minHeight: 240 }} />}><DashboardPlayer playerPromise={playerPromise} section="form" /></Suspense>
            </div>
            <div className="c-4" style={{ display: "grid" }}>
              <DayStats
                title={params.date === today ? "Today in numbers" : "The day in numbers"}
                matches={data.counts.matches}
                live={data.counts.live}
                toPlay={data.groups.reduce((total, league) => total + league.matches.filter((match) => match.status === "scheduled").length, 0)}
                leagues={data.counts.competitions}
              />
            </div>
          </div>
        )}

        {data && leagues.length > 0 ? (
          <section aria-label="Day schedule">
            <div className="lab-more"><h2 className="lab-display">All matches</h2></div>
            {leagues.map((league) => (
              <section key={league.id} aria-label={league.competition.name}>
                <div className="lab-more">
                  <h3 className="lab-display">{league.competition.name}</h3>
                  <span className="lab-eyebrow">{league.matches.length} matches</span>
                </div>
                <div className="lab-cards">
                  {league.matches.map((match) => (
                    <LabMatchCard key={match.id} league={league} match={match} tz={data.timezone} index={0} />
                  ))}
                </div>
              </section>
            ))}
          </section>
        ) : null}
  </>;
}
