import Link from "next/link";

import { addDays } from "@/lib/dates";
import { dashboardHref, daysAround } from "@/lib/dashboard";

type Props = { selected: string; today: string; league?: string };

/** A week of day pills centred on the selected day, with today marked by a dot. */
export function LabDateStrip({ selected, today, league }: Props) {
  return (
    <nav aria-label="Choose a day" className="lab-week-nav reveal">
      <Link href={dashboardHref({ date: addDays(selected, -7), league }, today)} className="lab-week-arrow" aria-label="Previous week" title="Previous week" prefetch={false}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </Link>
      <div className="lab-days">
      {daysAround(selected).map((day) => (
        <Link
          key={day.date}
          href={dashboardHref({ date: day.date, league }, today)}
          aria-current={day.date === selected ? "page" : undefined}
          className="lab-day"
        >
          <span>{day.weekday}</span>
          <b>{day.day}</b>
          {day.date === today ? <i className="lab-today-dot" aria-label="Today" /> : null}
        </Link>
      ))}
      </div>
      <Link href={dashboardHref({ date: addDays(selected, 7), league }, today)} className="lab-week-arrow" aria-label="Next week" title="Next week" prefetch={false}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </Link>
    </nav>
  );
}
