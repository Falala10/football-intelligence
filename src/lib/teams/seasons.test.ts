import { expect, it } from "vitest";
import { resolveSeasons } from "./seasons";
it("resolves relative, short and full seasons from the league season, not the calendar", () => {
  for (const q of ["How were Barça last season?", "last year? 2025-26 season", "in 2025/2026", "2025–26"]) expect(resolveSeasons(q, "2026/2027").seasons).toEqual(["2025/2026"]);
  expect(resolveSeasons("last season", "2026").seasons).toEqual(["2025"]);
  expect(resolveSeasons("last season", null).seasons).toEqual([]);
  expect(resolveSeasons("last five seasons", "2026/2027").seasons).toEqual(["2025/2026", "2024/2025", "2023/2024", "2022/2023", "2021/2022"]);
});
it("bounds requests and does not fetch invalid, future or contradictory season labels", () => {
  for (const q of ["last 100 seasons", "2024/2026", "2030/31", "1999/2000"]) expect(resolveSeasons(q, "2026/2027").seasons).toEqual([]);
  expect(resolveSeasons("Explain the high line", "2026/2027").seasons).toEqual([]);
});
it("carries user season scope into follow-ups, ignores assistant mistakes and permits current-season switch", () => {
  const history = [{ role: "user" as const, text: "How were they in 2024/25?" }, { role: "assistant" as const, text: "They did well in 2026/27" }];
  expect(resolveSeasons("How many goals did they score?", "2026/2027", history).seasons).toEqual(["2024/2025"]);
  expect(resolveSeasons("Compare that with this season", "2026/2027", history).seasons).toEqual(["2024/2025"]);
  expect(resolveSeasons("How are they doing this season?", "2026/2027", history).seasons).toEqual([]);
  expect(resolveSeasons("last season", "2026/2027", history).seasons).toEqual(["2025/2026"]);
});

it("resolves ten seasons in words/digits, retains all ten in follow-ups and rejects eleven", () => {
  const expected = Array.from({ length: 10 }, (_, i) => `${2025-i}/${2026-i}`);
  for (const q of ["last ten seasons", "past 10 seasons", "previous ten seasons"]) expect(resolveSeasons(q, "2026/2027").seasons).toEqual(expected);
  expect(resolveSeasons("Compare their points", "2026/2027", [{ role: "user", text: "last ten seasons" }]).seasons).toEqual(expected);
  expect(resolveSeasons("What about Real Madrid over the same period?", "2026/2027", [{ role: "user", text: "last ten seasons" }]).seasons).toEqual(expected);
  expect(resolveSeasons("last 11 seasons", "2026/2027").seasons).toEqual([]);
  expect(resolveSeasons("last ten seasons", "2026").seasons).toEqual(Array.from({ length: 10 }, (_, i) => String(2025-i)));
});
it("resolves conversational few/recent/couple season windows and explains the assumption", () => {
  for (const q of ["the last few seasons", "over recent seasons", "past several seasons"]) {
    const r = resolveSeasons(q, "2026/2027");
    expect(r.seasons).toEqual(["2025/2026", "2024/2025", "2023/2024"]);
    expect(r.note).toContain("three completed seasons");
  }
  expect(resolveSeasons("last couple of seasons", "2026/2027").seasons).toEqual(["2025/2026", "2024/2025"]);
});

it("loads both the referenced historical season and the season immediately before it", () => {
  const history = [{ role: "user" as const, text: "How did Barcelona do in 2024-25?" }, { role: "assistant" as const, text: "Incorrect assistant season 2025/2026" }];
  expect(resolveSeasons("Compare that with the season before.", "2026/2027", history).seasons).toEqual(["2024/2025", "2023/2024"]);
  expect(resolveSeasons("Compare that with the season before.", "2026/2027", []).seasons).toEqual([]);
});
