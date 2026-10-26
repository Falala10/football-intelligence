import { Suspense } from "react";
import type { Metadata } from "next";
import { MatchDetailView } from "@/components/lab/MatchDetailView";
export const metadata: Metadata = { title: "Match · Football Intelligence" };
export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="lab-main"><div className="lab-wrap"><p role="status">Loading match…</p></div></main>}><MatchDetailView params={params} /></Suspense>;
}
