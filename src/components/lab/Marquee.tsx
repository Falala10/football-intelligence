import type { Entry } from "@/lib/featured";

function Items({ entries }: { entries: Entry[] }) {
  return (
    <>
      {entries.map(({ match }) => (
        <span key={match.id} className="lab-tick">
          <b>
            {match.home.name} {match.score?.home ?? "-"}–{match.score?.away ?? "-"} {match.away.name}
          </b>
          <em>{match.status === "halftime" ? "HT" : (match.live?.minuteLabel ?? "LIVE")}</em>
        </span>
      ))}
    </>
  );
}

/** A scrolling strip of live scores. It pauses on hover; the repeated copy is hidden from screen readers. */
export function Marquee({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="lab-marquee reveal" role="region" aria-label="Live scores">
      <div className="lab-marquee-track">
        <Items entries={entries} />
        <span aria-hidden="true" style={{ display: "contents" }}>
          <Items entries={entries} />
        </span>
      </div>
    </div>
  );
}
