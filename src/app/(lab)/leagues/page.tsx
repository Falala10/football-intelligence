import Link from "next/link";
import type { Metadata } from "next";
import { NAV_LEAGUES } from "@/lib/leagues";
import { LabRail } from "@/components/lab/LabRail";
import { Crest } from "@/components/Crest";
export const metadata: Metadata = { title: "Leagues · Football Intelligence" };
export default function LeaguesPage() {
  return <main className="lab-main"><LabRail current="leagues" /><div className="lab-wrap"><header className="lab-head"><div><p className="lab-eyebrow">Follow a competition</p><h1 className="lab-display lab-title">Leagues</h1></div></header><div className="lab-cards">{NAV_LEAGUES.map((league) => <Link key={league.id} href={`/leagues/fotmob%3A${league.id}`} className="lab-card league-directory-card"><Crest kind="league" id={league.id} name={league.name} size={48} /><div><h2>{league.name}</h2><p>Standings, results & fixtures →</p></div></Link>)}</div></div></main>;
}
