import type { CSSProperties } from "react";

import type { PlayerProfile } from "@/lib/fotmob/player-parse";

import { CountUp } from "./CountUp";

const RINGS = [
  { key: "goals", label: "Goals", decimals: 0 },
  { key: "xG", label: "Expected goals", decimals: 1 },
  { key: "chancesCreated", label: "Chances created", decimals: 0 },
] as const;

/** Circular meters that draw themselves. The ring fills to FotMob's percentile against players in the same position. */
export function StatRings({ profile }: { profile: PlayerProfile }) {
  const rings = RINGS.flatMap((ring) => {
    const stat = profile.stats[ring.key];
    return stat && stat.percentile !== undefined ? [{ ...ring, value: stat.value, percentile: stat.percentile }] : [];
  });
  if (rings.length === 0) return null;

  return (
    <section className="lab-card lab-panel reveal" style={{ "--i": 3 } as CSSProperties} aria-labelledby="rings-title">
      <h2 id="rings-title" className="lab-display">
        Season profile
      </h2>
      <p className="sub">Percentile against players in the same position</p>
      <div className="lab-rings">
        {rings.map((ring, index) => (
          <div key={ring.key} className="lab-ring" style={{ "--i": index } as CSSProperties}>
            <div className="lab-ring-box">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle className="lab-ring-track" cx="50" cy="50" r="42" />
                <circle
                  className="lab-ring-fill"
                  cx="50"
                  cy="50"
                  r="42"
                  style={{ "--pct": Math.max(0, Math.min(100, ring.percentile)) / 100 } as CSSProperties}
                />
              </svg>
              <span className="lab-ring-value">
                <CountUp value={ring.value} decimals={ring.decimals} />
              </span>
            </div>
            <p>{ring.label}</p>
            <small>{Math.round(ring.percentile)}th percentile</small>
          </div>
        ))}
      </div>
    </section>
  );
}
