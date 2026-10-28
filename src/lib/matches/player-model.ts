export type PlayerGameStat = { key: string; label: string; value: number; total: number | null; type: string };
export type PlayerGame = {
  id: string; name: string; team: string; goalkeeper: boolean; minutes: number | null;
  groups: { title: string; stats: PlayerGameStat[] }[];
};
export type PlayerGames = { matchId: string; fetchedAtUtc: string; players: PlayerGame[]; heatmaps: Record<string, { x: number; y: number }[]>; heatmapStatus: "available" | "not-provided" | "unavailable" };
