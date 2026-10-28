import { MatchAiPanel } from "./MatchAiPanel";
import { aiConfigured } from "@/lib/ai/gemini";
import { Suspense } from "react";
import { MatchPlayerGames } from "./MatchPlayerGames";
import { MatchCommentary } from "./MatchCommentary";
import { io } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { APP_TIMEZONE } from "@/lib/config";
import { formatKickoff, formatUpdatedTime } from "@/lib/dates";
import { getMatchDetail } from "@/lib/matches/detail-service";
import type { Lineup } from "@/lib/matches/detail-model";
import { Crest } from "../Crest";
import { LiveMinute } from "../LiveMinute";
import { LiveRefresher } from "../LiveRefresher";
import { LabRail } from "./LabRail";

function LineupList({ name, lineup }: { name: string; lineup: Lineup | null }) {
  return <section className="lab-card detail-panel"><h3>{name}</h3>{!lineup ? <p>Lineup not available.</p> : <>
    <p className="lab-eyebrow">{lineup.formation ?? "Formation unavailable"}{lineup.coach ? ` · ${lineup.coach}` : ""}</p>
    {[{ title: "Starting XI", players: lineup.starters }, { title: "Substitutes", players: lineup.substitutes }].map(({ title, players }) => <div key={title}><h4>{title}</h4>{players.length === 0 ? <p>No players listed yet.</p> : <ul className="detail-players">{players.map((player, i) => <li key={`${player.id ?? player.name}-${i}`}><span className="detail-shirt">{player.shirt ?? "—"}</span><span>{player.name}<small>{player.position ?? ""}</small></span><span aria-label="Rating">{player.rating ?? "—"}</span></li>)}</ul>}</div>)}
  </>}</section>;
}

export async function MatchDetailView({ params }: { params: Promise<{ id: string }> }) {
  await io();
  const { id } = await params;
  let decodedId: string;
  try { decodedId = decodeURIComponent(id); } catch { notFound(); }
  const result = await getMatchDetail(decodedId);
  if (result.status === "invalid") notFound();
  if (result.status !== "ok") return <main className="lab-main"><LabRail /><LiveRefresher intervalMs={30000} /><div className="lab-wrap"><Link href="/dashboard" className="lab-chip">← Dashboard</Link><div className="lab-card lab-alert" role="alert"><h1>Match data unavailable</h1><p>We couldn’t load this match. We’ll retry automatically.</p></div></div></main>;
  const { data } = result, { match } = data;
  const inPlay = match.status === "live" || match.status === "halftime";
  const label = { scheduled: "Scheduled", live: "Live", halftime: "Half-time", finished: "Full time", postponed: "Postponed", cancelled: "Cancelled" }[match.status];
  return <main className="lab-main"><LabRail /><LiveRefresher intervalMs={inPlay ? 30000 : match.status === "scheduled" ? 90000 : null} /><div className="lab-wrap">
    <Link href="/dashboard" className="lab-chip">← Dashboard</Link>
    <header id="match-summary" className="lab-card detail-header"><p className="lab-eyebrow">{data.competitionName ?? "Match"}</p><h1 className="detail-title">{match.home.name} vs {match.away.name}</h1>
      <p className={inPlay ? "lab-live" : "lab-pill"}>{label}{match.status === "live" && match.live?.minuteLabel ? <> · <LiveMinute minute={match.live.minuteLabel} clockSeconds={match.live.clockSeconds} fetchedAtMs={Date.parse(match.live.asOfUtc)} /></> : null}</p>
      <div className="detail-score"><Crest src={match.home.crestUrl} name={match.home.name} size={64} /><strong>{match.score ? `${match.score.home}–${match.score.away}` : "VS"}</strong><Crest src={match.away.crestUrl} name={match.away.name} size={64} /></div>
      <p>{match.kickoffUtc ? `${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, dateStyle: "medium" }).format(new Date(match.kickoffUtc))} · ${formatKickoff(match.kickoffUtc, APP_TIMEZONE)}` : "Kick-off to be confirmed"} · {APP_TIMEZONE.replaceAll("_", " ")}</p>
      <p>{[data.venue.stadium, data.venue.city].filter(Boolean).join(" · ") || "Venue unavailable"}{data.venue.referee ? ` · Referee: ${data.venue.referee}` : ""}</p><small>Updated {formatUpdatedTime(data.fetchedAtUtc, APP_TIMEZONE)}</small>
    </header>
    <MatchAiPanel key={`ai-${match.id}`} matchId={match.id} title={`${match.home.name} vs ${match.away.name}`} configured={aiConfigured()} />
    <section id="match-events" className="lab-card detail-panel"><h2>Match events</h2>{data.events === null ? <p>Events are not available for this match.</p> : data.events.length === 0 ? <p>No events reported yet.</p> : <ol className="detail-events">{data.events.map((event, i) => <li key={i}><strong>{event.minute ?? "—"}</strong><span>{event.description}<small>{event.side === "home" ? match.home.name : event.side === "away" ? match.away.name : ""}</small></span></li>)}</ol>}</section>
    <Suspense key={`players-${match.id}`} fallback={<section className="lab-card detail-panel" role="status"><h2>Player performance</h2><p>Loading player stats and heatmaps…</p></section>}><MatchPlayerGames id={match.id} /></Suspense>
    <Suspense key={match.id} fallback={<section className="lab-card detail-panel" role="status"><h2>Commentary</h2><p>Loading commentary…</p></section>}><MatchCommentary id={match.id} /></Suspense>
    <section id="match-lineups"><h2 className="lab-display">Lineups</h2><div className="detail-columns"><LineupList name={match.home.name} lineup={data.lineups.home} /><LineupList name={match.away.name} lineup={data.lineups.away} /></div></section>
    <section id="team-stats" className="lab-card detail-panel"><h2>Team stats</h2>{!data.stats?.length ? <p>Team stats are not available for this match.</p> : data.stats.map((group, i) => <div key={i}><h3>{group.title}</h3><table className="detail-stats"><caption className="sr-only">{group.title}</caption><thead><tr><th scope="col">{match.home.name}</th><th scope="col">Statistic</th><th scope="col">{match.away.name}</th></tr></thead><tbody>{group.items.map((stat, n) => <tr key={n}><td>{stat.home ?? "—"}</td><th scope="row">{stat.label}</th><td>{stat.away ?? "—"}</td></tr>)}</tbody></table></div>)}</section>
  </div></main>;
}
