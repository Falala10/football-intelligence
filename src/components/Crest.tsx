"use client";

import { useState } from "react";

type Props = { kind?: "team" | "league"; id?: string; src?: string | null; name: string; size?: number };

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

/** Club or league logo from FotMob, falling back to initials if the image is missing or fails. */
export function Crest({ kind, id, src, name, size = 24 }: Props) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };

  const url = src ?? (kind && id ? `https://images.fotmob.com/image_resources/logo/${kind}logo/${id}.png` : null);

  if (!url || failed) {
    return (
      <span
        aria-hidden="true"
        style={{ ...box, fontSize: Math.round(size * 0.4) }}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-strong"
      >
        {initials(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- small third-party logo with its own fallback
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={box}
      className="crest shrink-0 object-contain"
    />
  );
}
