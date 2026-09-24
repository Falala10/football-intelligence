import { Suspense } from "react";

import { MatchesSkeleton } from "@/components/MatchesSkeleton";
import { MatchesView } from "@/components/MatchesView";

export default function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<MatchesSkeleton />}>
      <MatchesView searchParams={searchParams} />
    </Suspense>
  );
}
