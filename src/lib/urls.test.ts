import { describe, expect, it } from "vitest";

import { matchesHref, parseMatchesParams } from "./urls";

const today = "2026-09-24";

describe("parseMatchesParams", () => {
  it("defaults to today with no filters", () => {
    expect(parseMatchesParams({}, today)).toEqual({ date: today, league: undefined, live: false });
  });

  it("reads a valid date and ignores an invalid one", () => {
    expect(parseMatchesParams({ date: "2026-09-25" }, today).date).toBe("2026-09-25");
    expect(parseMatchesParams({ date: "2026-02-30" }, today).date).toBe(today);
    expect(parseMatchesParams({ date: "yesterday" }, today).date).toBe(today);
  });

  it("uses the first value when a parameter is repeated", () => {
    expect(parseMatchesParams({ date: ["2026-09-25", "2026-09-26"] }, today).date).toBe("2026-09-25");
  });

  it("accepts only sidebar league ids", () => {
    expect(parseMatchesParams({ league: "87" }, today).league).toBe("87");
    expect(parseMatchesParams({ league: "1" }, today).league).toBeUndefined();
  });

  it("turns live on only for live=1", () => {
    expect(parseMatchesParams({ live: "1" }, today).live).toBe(true);
    expect(parseMatchesParams({ live: "true" }, today).live).toBe(false);
  });
});

describe("matchesHref", () => {
  it("keeps the plain page at /", () => {
    expect(matchesHref({}, today)).toBe("/");
    expect(matchesHref({ date: today }, today)).toBe("/");
  });

  it("includes only non-default values", () => {
    expect(matchesHref({ date: "2026-09-25" }, today)).toBe("/?date=2026-09-25");
    expect(matchesHref({ league: "87", live: true }, today)).toBe("/?league=87&live=1");
    expect(matchesHref({ date: "2026-09-25", league: "87", live: true }, today)).toBe("/?date=2026-09-25&league=87&live=1");
  });

  it("keeps an explicit date when today is unknown", () => {
    expect(matchesHref({ date: today })).toBe("/?date=2026-09-24");
  });
});
