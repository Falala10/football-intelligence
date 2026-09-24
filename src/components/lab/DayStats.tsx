import type { CSSProperties } from "react";

import { CountUp } from "./CountUp";

type Props = { title: string; matches: number; live: number; toPlay: number; leagues: number };

/** The day at a glance: three animated counts. */
export function DayStats({ title, matches, live, toPlay, leagues }: Props) {
  return (
    <section className="lab-card lab-panel reveal" style={{ "--i": 5 } as CSSProperties} aria-labelledby="day-title">
      <h2 id="day-title" className="lab-display">
        {title}
      </h2>
      <p className="sub">
        Across {leagues} {leagues === 1 ? "competition" : "competitions"}
      </p>
      <div className="lab-daystats">
        <div>
          <b>
            <CountUp value={matches} />
          </b>
          <small>Matches</small>
        </div>
        <div>
          <b className="hl">
            <CountUp value={live} />
          </b>
          <small>Live now</small>
        </div>
        <div>
          <b>
            <CountUp value={toPlay} />
          </b>
          <small>To play</small>
        </div>
      </div>
    </section>
  );
}
