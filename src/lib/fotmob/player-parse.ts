// Shapes returned by the FotMob MCP `get_player_profile` tool, and the checks that guard against bad data.
// Absent fields mean FotMob did not provide them; absent never means zero.

export type PlayerStat = { value: number; per90?: number; /** FotMob percentile vs players in the same position; 100 is best. */ percentile?: number };

export type PlayerRecentMatch = {
  matchId?: string;
  date?: string;
  competition?: string;
  team?: string;
  opponent?: string;
  home?: boolean;
  /** Score from the player's side first, e.g. "3-1". */
  score?: string;
  result?: "W" | "D" | "L";
  minutes?: number;
  goals?: number;
  assists?: number;
  rating?: number;
};

export type PlayerProfile = {
  id: string;
  name: string;
  team?: { id?: string; name?: string; colors?: { primary?: string; secondary?: string } };
  info?: { shirt?: number; age?: number; country?: string; height?: string; foot?: string; marketValue?: string };
  position?: { primary?: string; recentUsage: { position: string; appearances: number }[] };
  season?: {
    league?: string;
    season?: string;
    matches?: number;
    started?: number;
    minutes?: number;
    goals?: number;
    assists?: number;
    rating?: number;
  };
  stats: Record<string, PlayerStat>;
  recentMatches: PlayerRecentMatch[];
  fetchedAtUtc: string;
};

type Json = Record<string, unknown>;

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

// Colours end up in inline styles, so only well-formed #rrggbb values are accepted.
function colour(value: unknown): string | undefined {
  return typeof value === "string" && HEX_COLOUR.test(value) ? value : undefined;
}

function parseStat(value: unknown): PlayerStat | null {
  if (!isRecord(value)) return null;
  const amount = num(value.value);
  if (amount === undefined) return null;
  return { value: amount, per90: num(value.per90), percentile: num(value.percentile) };
}

function parseRecent(value: unknown): PlayerRecentMatch | null {
  if (!isRecord(value)) return null;
  const result = value.result === "W" || value.result === "D" || value.result === "L" ? value.result : undefined;
  return {
    matchId: str(value.matchId),
    date: str(value.date),
    competition: str(value.competition),
    team: str(value.team),
    opponent: str(value.opponent),
    home: typeof value.home === "boolean" ? value.home : undefined,
    score: str(value.score),
    result,
    minutes: num(value.minutes),
    goals: num(value.goals),
    assists: num(value.assists),
    rating: num(value.rating),
  };
}

/** Validate the MCP `get_player_profile` result. Returns null when it is not a usable "ok" profile. */
export function parsePlayerProfile(raw: unknown): PlayerProfile | null {
  if (!isRecord(raw) || raw.state !== "ok") return null;
  const id = str(raw.id);
  const name = str(raw.name);
  const fetchedAtUtc = str(raw.fetchedAtUtc);
  if (!id || !name || !fetchedAtUtc) return null;

  const team = isRecord(raw.team)
    ? {
        id: str(raw.team.id),
        name: str(raw.team.name),
        colors: isRecord(raw.team.colors)
          ? { primary: colour(raw.team.colors.primary), secondary: colour(raw.team.colors.secondary) }
          : undefined,
      }
    : undefined;

  const info = isRecord(raw.info)
    ? {
        shirt: num(raw.info.shirt),
        age: num(raw.info.age),
        country: str(raw.info.country),
        height: str(raw.info.height),
        foot: str(raw.info.foot),
        marketValue: str(raw.info.marketValue),
      }
    : undefined;

  const position = isRecord(raw.position)
    ? {
        primary: str(raw.position.primary),
        recentUsage: (Array.isArray(raw.position.recentUsage) ? raw.position.recentUsage : []).flatMap((entry: unknown) => {
          if (!isRecord(entry)) return [];
          const label = str(entry.position);
          const appearances = num(entry.appearances);
          return label && appearances !== undefined ? [{ position: label, appearances }] : [];
        }),
      }
    : undefined;

  const season = isRecord(raw.season)
    ? {
        league: str(raw.season.league),
        season: str(raw.season.season),
        matches: num(raw.season.matches),
        started: num(raw.season.started),
        minutes: num(raw.season.minutes),
        goals: num(raw.season.goals),
        assists: num(raw.season.assists),
        rating: num(raw.season.rating),
      }
    : undefined;

  const stats: Record<string, PlayerStat> = {};
  for (const [key, value] of Object.entries(isRecord(raw.stats) ? raw.stats : {})) {
    const stat = parseStat(value);
    if (stat) stats[key] = stat;
  }

  const recentMatches = (Array.isArray(raw.recentMatches) ? raw.recentMatches : [])
    .map(parseRecent)
    .filter((match): match is PlayerRecentMatch => match !== null);

  return { id, name, team, info, position, season, stats, recentMatches, fetchedAtUtc };
}
