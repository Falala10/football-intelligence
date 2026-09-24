import Image from "next/image";
import type { CSSProperties } from "react";

import type { PlayerProfile } from "@/lib/fotmob/player-parse";

import { CountUp } from "./CountUp";

type Props = { profile: PlayerProfile; photo?: string };

/** A photo-led player tile: giant outlined surname, club colour behind the picture, and animated season numbers. */
export function PlayerSpotlight({ profile, photo }: Props) {
  const surname = profile.name.split(" ").slice(-1)[0];
  const season = profile.season;
  const subtitle = [profile.team?.name, season?.league && season.season ? `${season.league} ${season.season}` : undefined]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className="lab-card lab-spot reveal"
      style={{ "--i": 2, "--club": profile.team?.colors?.primary } as CSSProperties}
      aria-label={`${profile.name}, player spotlight`}
    >
      {photo ? (
        <Image
          src={photo}
          alt={`${profile.name} celebrating`}
          fill
          priority
          // The photo is cropped to a tall tile, so it is shown larger than the tile is wide; ask for extra resolution.
          sizes="(min-width: 1024px) 55vw, 100vw"
          quality={90}
          className="kenburns"
          style={{ objectFit: "cover", objectPosition: "50% 22%" }}
        />
      ) : null}
      <div className="lab-spot-shade" />
      <span className="lab-eyebrow lab-spot-tag">Player spotlight</span>
      {/* Long surnames shrink so the outlined name always fits on one line. */}
      <p className="lab-ghost" aria-hidden="true" style={{ fontSize: `${Math.min(18, 140 / Math.max(surname.length, 1))}cqw` }}>
        {surname}
      </p>

      <div className="lab-spot-bottom">
        <h2 className="lab-display lab-spot-name">{profile.name}</h2>
        {subtitle ? <p className="lab-spot-sub">{subtitle}</p> : null}
        <div className="lab-spot-stats">
          {season?.goals !== undefined ? (
            <div className="lab-stat">
              <small>Goals</small>
              <b className="hl">
                <CountUp value={season.goals} />
              </b>
            </div>
          ) : null}
          {season?.assists !== undefined ? (
            <div className="lab-stat">
              <small>Assists</small>
              <b>
                <CountUp value={season.assists} />
              </b>
            </div>
          ) : null}
          {season?.rating !== undefined ? (
            <div className="lab-stat">
              <small>Rating</small>
              <b>
                <CountUp value={season.rating} decimals={1} />
              </b>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
