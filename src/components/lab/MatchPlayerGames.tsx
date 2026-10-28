import { getPlayerGames } from "@/lib/matches/player-service";
import { PlayerGameExplorer } from "./PlayerGameExplorer";
export async function MatchPlayerGames({ id }: { id: string }) {
  const data = await getPlayerGames(id);
  return <section id="player-performance" className="lab-card detail-panel"><h2>Player performance</h2>{data ? <PlayerGameExplorer data={data}/> : <p>Player statistics could not load. Refresh to retry.</p>}</section>;
}
