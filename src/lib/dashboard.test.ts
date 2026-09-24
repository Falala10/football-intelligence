import { describe, expect, it } from "vitest";

import { dashboardHref, daysAround } from "./dashboard";

describe("daysAround", () => {
  it("returns seven days centred on the date by default", () => {
    const days = daysAround("2026-09-24");
    expect(days.map((d) => d.date)).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
    expect(days[3]).toEqual({ date: "2026-09-24", weekday: "Thu", day: 24 });
  });

  it("crosses month boundaries", () => {
    const days = daysAround("2026-09-30", 1, 2);
    expect(days.map((d) => d.date)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(days[2].day).toBe(1);
  });
});

describe("dashboardHref", () => {
  const today = "2026-09-24";

  it("keeps the plain page at /dashboard", () => {
    expect(dashboardHref({}, today)).toBe("/dashboard");
    expect(dashboardHref({ date: today }, today)).toBe("/dashboard");
  });

  it("includes only non-default values", () => {
    expect(dashboardHref({ date: "2026-09-25" }, today)).toBe("/dashboard?date=2026-09-25");
    expect(dashboardHref({ league: "87" }, today)).toBe("/dashboard?league=87");
    expect(dashboardHref({ date: "2026-09-25", league: "87" }, today)).toBe("/dashboard?date=2026-09-25&league=87");
  });

  it("keeps an explicit date when today is unknown", () => {
    expect(dashboardHref({ date: today })).toBe("/dashboard?date=2026-09-24");
  });
});
