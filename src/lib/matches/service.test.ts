import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./providers/fotmob", () => ({ fotmobProvider: { id: "fotmob", getDay: vi.fn() } }));

import { getDaySchedule } from "./service";
import type { DaySchedule } from "./model";

const query = { date: "2026-10-01", timezone: "UTC" };
const emptyDay: DaySchedule = { ...query, fetchedAtUtc: "2026-10-01T12:00:00Z", counts: { competitions: 0, matches: 0, live: 0 }, groups: [] };

describe("day schedule service", () => {
  afterEach(() => vi.restoreAllMocks());
  it("preserves a successful empty day", async () => {
    expect(await getDaySchedule(query, { id: "test", getDay: async () => emptyDay })).toEqual({ status: "ok", data: emptyDay });
  });
  it("reports failure and allows the next request to recover", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const getDay = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(emptyDay);
    const provider = { id: "test", getDay };
    expect(await getDaySchedule(query, provider)).toEqual({ status: "unavailable" });
    expect(await getDaySchedule(query, provider)).toEqual({ status: "ok", data: emptyDay });
    expect(getDay).toHaveBeenCalledTimes(2);
  });
});
