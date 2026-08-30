import type { RaceOffice, RacePoll } from "@/lib/forecast/race-engine";
import racePollsJson from "./race-polls.json" with { type: "json" };

export type { RaceOffice, RacePoll };

export type RacePollsFile = {
  source: string;
  asOf: string;
  polls: RacePoll[];
};

const file = racePollsJson as unknown as RacePollsFile;

export const RACE_POLLS: RacePoll[] = file.polls;

export const RACE_POLLS_META = {
  source: file.source,
  asOf: file.asOf,
};

export function pollsFor(office: RaceOffice, uf: string): RacePoll[] {
  const key = uf.trim().toUpperCase();
  return RACE_POLLS.filter((p) => p.office === office && p.uf === key);
}
