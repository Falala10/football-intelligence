import type { PlayerGame, PlayerGameStat } from "../player-model";
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const number = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
export function mapPlayerGames(raw: unknown, matchId: string): { players: PlayerGame[]; heatmapUrl: string | null; heatmapIds: Record<string, string> } {
  const payload = record(record(raw).payload);
  if (String(record(payload.general).matchId) !== matchId) throw new Error("Mismatched player match response");
  const content = record(payload.content);
  const heatmapIds: Record<string, string> = {};
  const players = Object.values(record(content.playerStats)).flatMap(value => {
    const p = record(value);
    if (!/^\d+$/.test(String(p.id)) || typeof p.name !== "string") return [];
    if (/^[1-9]\d*$/.test(String(p.optaId))) heatmapIds[`fotmob:${p.id}`] = String(p.optaId);
    const groups = (Array.isArray(p.stats) ? p.stats : []).map(value => {
      const g = record(value);
      const stats = Object.entries(record(g.stats)).flatMap(([label, value]): PlayerGameStat[] => {
        const s = record(value), stat = record(s.stat), n = number(stat.value);
        // Boolean entries are provider UI flags, not measured player statistics.
        if (n === null || stat.type === "boolean") return [];
        return [{ key: typeof s.key === "string" ? s.key : label, label, value: n, total: number(stat.total), type: typeof stat.type === "string" ? stat.type : "number" }];
      });
      return { title: typeof g.title === "string" ? g.title : "Stats", stats };
    }).filter(g => g.stats.length);
    const minutes = groups.flatMap(g => g.stats).find(s => s.key === "minutes_played")?.value ?? null;
    return [{ id: `fotmob:${p.id}`, name: p.name, team: typeof p.teamName === "string" ? p.teamName : "Team unavailable", goalkeeper: p.isGoalkeeper === true, minutes, groups }];
  });
  return { players, heatmapIds, heatmapUrl: typeof content.heatmapUrl === "string" ? content.heatmapUrl : null };
}
export function mapHeatmaps(raw: unknown, players: PlayerGame[], heatmapIds: Record<string, string>): Record<string, { x: number; y: number }[]> {
  const payload = record(record(raw).payload);
  if (!payload.players || typeof payload.template !== "string" || !/viewBox=["']0 0 105 68["']/.test(payload.template)) throw new Error("Invalid heatmap payload");
  const maps: Record<string, { x: number; y: number }[]> = {};
  for (const player of players) {
    const sourceId = heatmapIds[player.id];
    if (!sourceId) continue;
    const fragment = record(payload.players)[`p${sourceId}`];
    if (typeof fragment !== "string" || fragment.length > 500000) continue;
    // Read only bounded numerical circle coordinates. No provider SVG is rendered.
    const points = [...fragment.matchAll(/<circle\s+cx="([\d.]+)"\s+cy="([\d.]+)"\s+r="[\d.]+"\s*\/>/g)].flatMap(m => {
      const x = Number(m[1]), y = Number(m[2]);
      return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 105 && y >= 0 && y <= 68 ? [{ x, y }] : [];
    });
    if (points.length) maps[player.id] = points.slice(0, 5000);
  }
  return maps;
}
