import { getMatchCommentary } from "@/lib/matches/commentary-service";
import { APP_TIMEZONE } from "@/lib/config";
import { formatUpdatedTime } from "@/lib/dates";
export async function MatchCommentary({ id }: { id: string }) {
  const result = await getMatchCommentary(id);
  return <section id="match-commentary" className="lab-card detail-panel" aria-label="Commentary"><h2>Commentary</h2>
    {result.status === "none" ? <p>Commentary isn’t provided for this match.</p> : result.status === "unavailable" ? <p>Commentary couldn’t be loaded right now.</p> : <>
      <p className="lab-eyebrow">{result.data.source === "human" ? "Human-written commentary" : "Automatic match updates"} · Newest first</p>
      <small>Updated {formatUpdatedTime(result.data.fetchedAtUtc, APP_TIMEZONE)} · Up to 50 latest updates</small>
      {result.data.items.length === 0 ? <p>No commentary updates yet.</p> : <ol className="detail-events commentary-list">{result.data.items.map((item) => <li key={item.id}><strong>{item.minute ?? "—"}</strong><p>{item.text}</p></li>)}</ol>}
    </>}
  </section>;
}
