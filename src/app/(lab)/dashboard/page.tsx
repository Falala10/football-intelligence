import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/lab/DashboardSkeleton";
import { DashboardView } from "@/components/lab/DashboardView";

export const metadata: Metadata = { title: "Dashboard · Football Intelligence" };

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardView searchParams={searchParams} />
    </Suspense>
  );
}
