import { expect, it } from "vitest";
import { mapFotMobTeam } from "./fotmob-map";
it("normalizes club home grounds and gender while validating team identity", () => {
  const raw = { payload: { details: { id: 2073, name: "FC Nordsjælland (W)", gender: "female", sportsTeamJSONLD: { location: { name: "Fallback", address: { addressCountry: "Denmark", addressLocality: "Farum" } } } }, fixtures: { allFixtures: { fixtures: [] } }, overview: { venue: { widget: { name: "Right to Dream Park", city: "Farum" } } } } };
  expect(mapFotMobTeam(raw, "2073", "2026-10-27T18:00:00Z")).toMatchObject({ gender: "female", homeGround: { stadium: "Right to Dream Park", city: "Farum", country: "Denmark" } });
  expect(() => mapFotMobTeam(raw, "1", "2026-10-27T18:00:00Z")).toThrow();
});
