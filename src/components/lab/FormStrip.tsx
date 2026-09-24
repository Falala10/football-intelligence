import type { CSSProperties } from "react";

import type { PlayerProfile, PlayerRecentMatch } from "@/lib/fotmob/player-parse";

function contribution(match: PlayerRecentMatch): string {
  const parts: string[] = [];
  if (match.goals) parts.push(`${match.goals} ${match.goals === 1 ? "goal" : "goals"}`);
  if (match.assists) parts.push(`${match.assists} ${match.assists === 1 ? "assist" : "assists"}`);
  return parts.length > 0 ? parts.join(" · ") : "No goal involvement";
}

/** Recent matches with a result badge and a rating bar that grows in. */
export function FormStrip({ profile }: { profile: PlayerProfile }) {
  const matches = profile.recentMatches.filter((match) => match.opponent).slice(0, 5);
  if (matches.length === 0) return null;

  return (
    <section className="lab-card lab-panel reveal" style={{ "--i": 4 } as CSSProperties} aria-labelledby="form-title">
      <h2 id="form-title" className="lab-display">
        Recent form
      </h2>
      <p className="sub">{profile.name}, last {matches.length} matches</p>
      <div>
        {matches.map((match, index) => (
          <div key={match.matchId ?? `${match.opponent}-${index}`} className="lab-form-row" style={{ "--i": index } as CSSProperties}>
            <div className="op">
              {match.result ? (
                <span className={`lab-res ${match.result}`} title={match.result === "W" ? "Win" : match.result === "D" ? "Draw" : "Defeat"}>
                  {match.result}
                </span>
              ) : null}
              <span>
                {match.opponent}
                {match.score ? ` ${match.score}` : ""}
              </span>
            </div>
            {match.rating !== undefined ? (
              <div className="rt">
                <span className="sr-only">Rating </span>
                {match.rating.toFixed(1)}
              </div>
            ) : null}
            <div className="meta">{contribution(match)}</div>
            {match.rating !== undefined ? (
              <div className="lab-bar" aria-hidden="true">
                <i style={{ "--w": Math.max(0, Math.min(100, match.rating * 10)) } as CSSProperties} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
