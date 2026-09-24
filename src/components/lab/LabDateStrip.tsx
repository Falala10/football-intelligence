import Link from "next/link";

import { dashboardHref, daysAround } from "@/lib/dashboard";

type Props = { selected: string; today: string; league?: string };

/** A week of day pills centred on the selected day, with today marked by a dot. */
export function LabDateStrip({ selected, today, league }: Props) {
  return (
    <nav aria-label="Choose a day" className="lab-days reveal">
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
    </nav>
  );
}
