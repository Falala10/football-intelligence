import { Suspense } from "react";
import type { Metadata } from "next";
import { LeagueView } from "@/components/lab/LeagueView";
export const metadata: Metadata = { title: "League · Football Intelligence" };
export default function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="lab-main"><div className="lab-wrap"><p role="status">Loading league…</p></div></main>}><LeagueView params={params} /></Suspense>;
}
