"use client";

import { useRouter } from "next/navigation";

import { isIsoDate } from "@/lib/dates";
import { matchesHref } from "@/lib/urls";

type Props = { value: string; today: string; league?: string; live: boolean };

/** Native date picker that keeps the current league and live filters when the date changes. */
export function DatePicker({ value, today, league, live }: Props) {
  const router = useRouter();

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">Pick a date</span>
      <input
        type="date"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (isIsoDate(next)) router.push(matchesHref({ date: next, league, live }, today));
        }}
        className="h-9 cursor-pointer rounded-full border border-line bg-panel px-3 text-sm font-medium text-ink"
      />
    </label>
  );
}
