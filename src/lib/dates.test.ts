import { describe, expect, it } from "vitest";

import { addDays, formatKickoff, formatLongDate, formatUpdatedTime, isIsoDate, todayIso } from "./dates";

describe("isIsoDate", () => {
  it("accepts real calendar dates", () => {
    expect(isIsoDate("2026-09-24")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  it("rejects impossible dates, other formats and non-strings", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("24-09-2026")).toBe(false);
    expect(isIsoDate("20260924")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
    expect(isIsoDate(20260924)).toBe(false);
  });
});

describe("todayIso", () => {
  it("uses the calendar day in the given timezone", () => {
    const lateNightUtc = new Date("2026-09-25T02:30:00Z");
    expect(todayIso("UTC", lateNightUtc)).toBe("2026-09-25");
    expect(todayIso("America/New_York", lateNightUtc)).toBe("2026-09-24");
    expect(todayIso("Asia/Tokyo", new Date("2026-09-24T20:00:00Z"))).toBe("2026-09-25");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
});

describe("formatKickoff", () => {
  it("formats 24-hour time in the timezone", () => {
    expect(formatKickoff("2026-09-24T18:45:00.000Z", "UTC")).toBe("18:45");
    expect(formatKickoff("2026-09-24T18:45:00.000Z", "America/New_York")).toBe("14:45");
  });

  it("shows just after midnight as 00:xx, not 24:xx", () => {
    expect(formatKickoff("2026-09-24T00:05:00Z", "UTC")).toBe("00:05");
  });

  it("returns undefined for a missing or invalid time", () => {
    expect(formatKickoff(undefined, "UTC")).toBeUndefined();
    expect(formatKickoff("not a date", "UTC")).toBeUndefined();
  });
});

describe("formatUpdatedTime", () => {
  it("includes seconds", () => {
    expect(formatUpdatedTime("2026-09-24T17:35:17Z", "UTC")).toBe("17:35:17");
  });

  it("returns undefined for an invalid time", () => {
    expect(formatUpdatedTime("nope", "UTC")).toBeUndefined();
  });
});

describe("formatLongDate", () => {
  it("names the weekday, day and month", () => {
    expect(formatLongDate("2026-09-24")).toMatch(/^Thursday,? 24 September$/);
  });
});
