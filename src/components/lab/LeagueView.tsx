import { io } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeagueSeason } from "@/lib/competitions/service";
import { selectLeagueMatches } from "@/lib/competitions/select";
import type { Competition, Match } from "@/lib/matches/model";
import { APP_TIMEZONE } from "@/lib/config";
import { formatUpdatedTime } from "@/lib/dates";
import { Crest } from "../Crest";
import { LiveRefresher } from "../LiveRefresher";
import { LabRail } from "./LabRail";
import { LabMatchCard } from "./LabMatchCard";
function Fixtures({ title, matches, competition }: { title: string; matches: Match[]; competition: Competition }) {
  return <section className="league-fixtures"><h2 className="lab-display">{title}</h2>{matches.length === 0 ? <p>No matches listed.</p> : <div className="lab-cards">{matches.map((match) => <div key={match.id}>{match.kickoffUtc ? <p className="lab-eyebrow">{new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, dateStyle: "medium" }).format(new Date(match.kickoffUtc))}</p> : <p className="lab-eyebrow">Date to be confirmed</p>}<LabMatchCard league={{ id: competition.id, competition, matches }} match={match} tz={APP_TIMEZONE} index={0} /></div>)}</div>}</section>;
}
export async function LeagueView({ params }: { params: Promise<{ id: string }> }) {
  await io(); const { id } = await params;
  let decoded: string; try { decoded = decodeURIComponent(id); } catch { notFound(); }
  const result = await getLeagueSeason(decoded);
  if (result.status === "invalid") notFound();
  if (result.status !== "ok") return <main className="lab-main"><LabRail current="leagues" /><LiveRefresher intervalMs={30000} /><div className="lab-wrap"><Link href="/leagues" className="lab-chip">← Leagues</Link><section className="lab-card detail-panel" role="alert"><h1>League data unavailable</h1><p>We couldn’t load this competition. We’ll retry automatically.</p></section></div></main>;
  const { data } = result; const selected = selectLeagueMatches(data.matches ?? []);
  return <main className="lab-main"><LabRail current="leagues" /><LiveRefresher intervalMs={selected.live.length ? 90000 : null} /><div className="lab-wrap"><Link href="/leagues" className="lab-chip">← Leagues</Link>
    <header className="lab-head league-heading"><Crest src={data.competition.logoUrl} name={data.competition.name} size={64} /><div><p className="lab-eyebrow">{data.season ?? "Current season"}</p><h1 className="lab-display league-title">{data.competition.name}</h1><small>Updated {formatUpdatedTime(data.fetchedAtUtc, APP_TIMEZONE)} · {APP_TIMEZONE.replaceAll("_", " ")}</small></div></header>
    <section><h2 className="lab-display">Standings</h2>{!data.tables ? <p>Standings aren’t available for this competition.</p> : data.tables.map((table, index) => <section key={index} className="lab-card detail-panel"><h3>{table.name}</h3><div className="league-table-scroll"><table className="league-table"><caption className="sr-only">{table.name} standings</caption><thead><tr>{["Pos", "Team", "P", "W", "D", "L", "GD", "Pts"].map((label) => <th scope="col" key={label} title={{ P: "Played", W: "Wins", D: "Draws", L: "Losses", GD: "Goal difference", Pts: "Points", Pos: "Position", Team: "Team" }[label]}>{label}</th>)}</tr></thead><tbody>{table.rows.map((row, i) => <tr key={`${row.team.id}-${i}`}><td>{row.position ?? "—"}</td><th scope="row"><span className="league-team"><Crest src={row.team.crestUrl} name={row.team.name} size={24} />{row.team.name}</span></th>{[row.played, row.wins, row.draws, row.losses, row.goalDifference, row.points].map((n, j) => <td key={j}>{n ?? "—"}</td>)}</tr>)}</tbody></table></div></section>)}</section>
    {!data.matches ? <section className="lab-card detail-panel"><h2>Matches</h2><p>Fixtures and results aren’t available for this competition.</p></section> : <>{selected.live.length > 0 ? <Fixtures title="Live matches" matches={selected.live} competition={data.competition} /> : null}<Fixtures title="Recent results · latest 10" matches={selected.results} competition={data.competition} /><Fixtures title="Upcoming fixtures · next 10" matches={selected.upcoming} competition={data.competition} /></>}
  </div></main>;
}
