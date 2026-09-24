import { addDays } from "./dates";

export type WeekDay = { date: string; weekday: string; day: number };

/** Days from `before` to `after` either side of a YYYY-MM-DD date, for the dashboard's day strip. */
export function daysAround(iso: string, before = 3, after = 3): WeekDay[] {
  const weekdayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" });
  const days: WeekDay[] = [];
  for (let offset = -before; offset <= after; offset += 1) {
    const date = addDays(iso, offset);
    days.push({ date, weekday: weekdayFormat.format(new Date(`${date}T00:00:00Z`)), day: Number(date.slice(8, 10)) });
  }
  return days;
}

/** Dashboard URL. Default values are left out so the plain page stays at /dashboard. */
export function dashboardHref(query: { date?: string; league?: string }, today?: string): string {
  const params = new URLSearchParams();
  if (query.date && query.date !== today) params.set("date", query.date);
  if (query.league) params.set("league", query.league);
  const search = params.toString();
  return search ? `/dashboard?${search}` : "/dashboard";
}
