"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { NAV_LEAGUES } from "@/lib/leagues";
import { matchesHref } from "@/lib/urls";

import { Crest } from "./Crest";
import { ThemeToggle } from "./ThemeToggle";

const base = "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[15px] font-medium transition-colors";
const idle = "text-muted hover:bg-line-soft hover:text-ink";
const active = "bg-brand-soft font-semibold text-brand-strong";

function BallIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7.5l3.4 2.5-1.3 4h-4.2l-1.3-4z" />
      <path d="M12 7.5V2.6M15.4 10l4.7-1.5M14.1 14l2.9 4M9.9 14l-2.9 4M8.6 10L3.9 8.5" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const date = params.get("date") ?? undefined;
  const live = params.get("live") === "1";
  const activeLeague = pathname === "/" ? params.get("league") : null;
  const allActive = pathname === "/" && !activeLeague;

  return (
    <aside
      aria-label="Site"
      className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-line bg-sidebar px-3 py-5 md:flex"
    >
      <Link href="/" className="mb-6 flex items-center gap-2 px-2.5 font-display text-[21px] font-bold leading-none text-brand">
        <BallIcon />
        Football Intelligence
      </Link>
      <nav aria-label="Matches and leagues" className="overflow-y-auto">
        <ul>
          <li>
            <Link
              href={matchesHref({ date, live })}
              aria-current={allActive ? "page" : undefined}
              className={`${base} ${allActive ? active : idle}`}
            >
              All matches
            </Link>
          </li>
        </ul>
        <p className="px-2.5 pb-1.5 pt-6 text-xs font-semibold uppercase tracking-wider text-faint">Leagues</p>
        <ul className="flex flex-col gap-0.5">
          {NAV_LEAGUES.map((league) => {
            const isActive = activeLeague === league.id;
            return (
              <li key={league.id}>
                <Link
                  href={matchesHref({ date, league: league.id, live })}
                  aria-current={isActive ? "page" : undefined}
                  className={`${base} ${isActive ? active : idle}`}
                >
                  <Crest kind="league" id={league.id} name={league.name} size={20} />
                  {league.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto pt-4">
        <ThemeToggle />
      </div>
    </aside>
  );
}
