import type { Tournament } from "./model";
export const EFL_CALENDAR_URL = "https://www.efl.com/competitions/carabao-cup/";
/** Read dated list entries from HTML, including embedded data strings; never execute scripts. */
export function parseEflCalendar(html: string, season: string | null, checkedAtUtc: string): Tournament["calendar"] {
  const year = /^(20\d{2})\/(20\d{2})$/.exec(season ?? ""); if (!year || +year[2] !== +year[1] + 1) return null;
  const dates = [...html.matchAll(/<li>\s*((?:Round (?:One|Two|Three|Four|Five)|Semi-Final (?:First|Second) Leg|Final)):\s*([^<]{3,100})<\/li>/gi)].map(m => ({ stage: m[1], dateText: m[2].replace(/\\n/g, " ").trim() }));
  if (!dates.some(d => d.stage.toLowerCase() === "round one" && d.dateText.includes(year[1]))) return null;
  const finals = dates.filter(d => d.stage.toLowerCase() === "final"), months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const days = [...new Set(finals.flatMap(d => {
    const m = /(\d{1,2}) ([A-Za-z]+) (20\d{2})/.exec(d.dateText); if (!m || m[3] !== year[2] || !months.includes(m[2])) return [];
    const iso = `${m[3]}-${String(months.indexOf(m[2]) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const date = new Date(`${iso}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? [iso] : [];
  }))];
  if (days.length !== 1) return null;
  return { finalDate: days[0], dates: [...new Map(dates.map(d => [d.stage, d])).values()], sourceUrl: EFL_CALENDAR_URL, checkedAtUtc };
}
