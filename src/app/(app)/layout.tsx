import { Suspense } from "react";

import { Sidebar } from "@/components/Sidebar";

/** The classic list layout: sidebar plus content. */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px]">
      <Suspense fallback={<div className="hidden w-[232px] shrink-0 md:block" aria-hidden="true" />}>
        <Sidebar />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
