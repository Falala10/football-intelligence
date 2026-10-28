"use client";
import { useId, useState } from "react";
import type { PlayerGames } from "@/lib/matches/player-model";

export function PlayerGameExplorer({ data }: { data: PlayerGames }) {
  const [selected, setSelected] = useState(data.players.find(p => (p.minutes ?? 0) > 0)?.id ?? data.players[0]?.id);
  const uid = useId().replaceAll(":", "");
  const player = data.players.find(p => p.id === selected) ?? data.players[0];
  if (!player) return <p>Player game statistics are not available yet for this match.</p>;
  const points = data.heatmaps[player.id];
  const format = (n: number) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(n);
  return <>
    <label className="player-game-label" htmlFor={`${uid}-select`}>Choose a player</label>
    <select className="player-game-select" id={`${uid}-select`} value={player.id} onChange={e => setSelected(e.target.value)}>
      {[...new Set(data.players.map(p => p.team))].map(team => <optgroup key={team} label={team}>{data.players.filter(p => p.team === team).map(p => <option key={p.id} value={p.id}>{p.name}{p.goalkeeper ? " · GK" : ""}{p.minutes !== null ? ` · ${p.minutes} min` : " · minutes unavailable"}</option>)}</optgroup>)}
    </select>
    <div aria-live="polite"><h3>{player.name}</h3><p>{player.team}{player.goalkeeper ? " · Goalkeeper" : ""} · {player.minutes === null ? "Minutes unavailable" : player.minutes === 0 ? "0 minutes reported; no playing time recorded" : `${player.minutes} minutes`}</p></div>
    <div className="player-game-layout">
      <section><h4>Heatmap</h4>{points?.length ? <>
        <svg className="player-game-pitch" viewBox="-3 -3 111 74" role="img" aria-label={`${player.name} activity heatmap`}>
          <defs><radialGradient id={`${uid}-spot`}><stop stopColor="#d5ff34" stopOpacity=".6"/><stop offset="1" stopColor="#d5ff34" stopOpacity="0"/></radialGradient></defs>
          <rect x="0" y="0" width="105" height="68" fill="#143d2c"/>
          {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="6" fill={`url(#${uid}-spot)`}/>)}
          <g fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth=".35"><rect width="105" height="68"/><path d="M52.5 0v68M0 13.84h16.5v40.32H0m105-40.32H88.5v40.32H105M0 24.84h5.5v18.32H0m105-18.32h-5.5v18.32H105"/><circle cx="52.5" cy="34" r="9.15"/></g>
        </svg><p className="player-game-note">Activity density from FotMob’s supplied locations. Brighter areas mean more recorded points; this is not continuous tracking or time spent. Attacking direction is not inferred.</p>
      </> : <p>{data.heatmapStatus === "unavailable" ? "Heatmaps could not load. Refresh to retry." : "No heatmap supplied for this player in this match."}</p>}</section>
      <section><h4>Game statistics</h4>{player.groups.length ? player.groups.map((group, i) => <div key={i}><h4>{group.title}</h4><dl className="player-game-stats">{group.stats.map((stat, j) => <div key={j}><dt>{stat.label}</dt><dd>{format(stat.value)}{stat.total !== null ? ` / ${format(stat.total)}` : ""}{stat.type === "distance" || stat.type === "distanceWithPercentage" || stat.type === "speed" ? <small> provider units</small> : null}</dd></div>)}</dl></div>) : <p>No detailed statistics supplied.</p>}</section>
    </div>
    <p className="player-game-note">Source: FotMob · Retrieved {new Date(data.fetchedAtUtc).toISOString().replace("T", " ").slice(0, 19)} UTC. Missing values are omitted, not counted as zero. Coverage varies by match.</p>
  </>;
}
