import { describe, expect, it } from "vitest";

import { isStoppageMinute, liveMinuteLabel, parseClockSeconds } from "./clock";

describe("parseClockSeconds", () => {
  it("reads minutes and seconds", () => {
    expect(parseClockSeconds("65:16")).toBe(3916);
    expect(parseClockSeconds("5:07")).toBe(307);
    expect(parseClockSeconds(" 90:00 ")).toBe(5400);
  });

  it("returns null when the clock is missing or malformed", () => {
    expect(parseClockSeconds(undefined)).toBeNull();
    expect(parseClockSeconds("")).toBeNull();
    expect(parseClockSeconds("abc")).toBeNull();
    expect(parseClockSeconds("65:1")).toBeNull();
    expect(parseClockSeconds("65")).toBeNull();
  });
});

describe("liveMinuteLabel", () => {
  const clock = 66 * 60 + 21; // 66:21, which FotMob labels 67'

  it("rounds up like FotMob", () => {
    expect(liveMinuteLabel(clock, 0)).toBe("67’");
  });

  it("moves to the next minute when the clock passes the boundary", () => {
    expect(liveMinuteLabel(clock, 38_000)).toBe("67’"); // 66:59
    expect(liveMinuteLabel(clock, 39_000)).toBe("68’"); // 67:00
  });

  it("stops counting when the page is stale", () => {
    expect(liveMinuteLabel(0, 10 * 60 * 1000)).toBe("3’");
  });

  it("does not count backwards if the local clock is behind", () => {
    expect(liveMinuteLabel(60, -5000)).toBe("2’");
  });
});

describe("isStoppageMinute", () => {
  it("detects stoppage-time labels", () => {
    expect(isStoppageMinute("45+2’")).toBe(true);
    expect(isStoppageMinute("67’")).toBe(false);
  });
});
