import Link from "next/link";

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Icon navigation. Only pages that exist are listed. */
export function LabRail() {
  return (
    <nav aria-label="Main" className="lab-rail">
      <span className="lab-logo" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 7.5l3.4 2.5-1.3 4h-4.2l-1.3-4z" />
          <path d="M12 7.5V2.6M15.4 10l4.7-1.5M14.1 14l2.9 4M9.9 14l-2.9 4M8.6 10L3.9 8.5" />
        </svg>
      </span>
      <Link href="/dashboard" aria-current="page" aria-label="Dashboard" title="Dashboard">
        <Svg>
          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </Svg>
      </Link>
      <Link href="/" aria-label="All matches, classic list" title="All matches (classic list)">
        <Svg>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </Svg>
      </Link>
    </nav>
  );
}
