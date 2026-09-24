/** Placeholder while the dashboard loads, laid out like the real page so nothing jumps. */
export function DashboardSkeleton() {
  return (
    <main role="status" className="lab-main">
      <span className="sr-only">Loading the dashboard</span>
      <div className="lab-wrap">
        <div className="lab-skel" style={{ height: 84, width: 280, marginBottom: 22 }} />
        <div className="lab-skel" style={{ height: 78, marginBottom: 26 }} />
        <div className="lab-grid">
          <div className="lab-skel c-8 r-2" style={{ minHeight: 440 }} />
          <div className="lab-skel c-4 r-2" style={{ minHeight: 440 }} />
          <div className="lab-skel c-4" style={{ minHeight: 240 }} />
          <div className="lab-skel c-4" style={{ minHeight: 240 }} />
        </div>
      </div>
    </main>
  );
}
