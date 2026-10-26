import type { DaySchedule } from "./model";

export type DayQuery = {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** IANA timezone that defines the day's boundaries. */
  timezone: string;
};

/** A source of matches. Implementations throw when the source cannot be used; they never return an empty day for a failure. */
export interface MatchProvider {
  readonly id: string;
  getDay(query: DayQuery): Promise<DaySchedule>;
}
