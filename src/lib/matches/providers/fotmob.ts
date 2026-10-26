import "server-only";

import { getMatchesByDate } from "../../fotmob/matches";
import type { MatchProvider } from "../provider";
import { FOTMOB, mapFotMobDay } from "./fotmob-map";

export const fotmobProvider: MatchProvider = {
  id: FOTMOB,
  async getDay({ date, timezone }) {
    const result = await getMatchesByDate({ date, tz: timezone });
    if (result.status !== "ok") throw new Error("FotMob matches are unavailable.");
    return mapFotMobDay(result.data);
  },
};
