import type { ForecastPoll } from "./forecast/engine.ts";

function visibleNational(polls: ForecastPoll[], asOf: string): ForecastPoll[] {
  return polls.filter(
    (poll) => poll.national && poll.date <= asOf && poll.fieldEnd <= asOf,
  );
}

function sortHouses(rows: ForecastPoll[]): ForecastPoll[] {
  return rows.slice().sort(
    (a, b) =>
      b.fieldEnd.localeCompare(a.fieldEnd) ||
      a.institute.localeCompare(b.institute) ||
      a.id.localeCompare(b.id),
  );
}

/** Todas as nacionais divulgadas nesse dia, cada uma com o próprio campo. */
export function pollsOnDate(
  polls: ForecastPoll[],
  date: string,
  asOf: string,
): ForecastPoll[] {
  return sortHouses(visibleNational(polls, asOf).filter((poll) => poll.date === date));
}

/** Todas as nacionais do dia mais recente no arquivo, cada uma com o próprio campo. */
export function pollsOnLatestDay(polls: ForecastPoll[], asOf: string): ForecastPoll[] {
  const visible = visibleNational(polls, asOf);
  if (visible.length === 0) return [];
  const latestDate = visible.reduce(
    (max, poll) => (poll.date > max ? poll.date : max),
    visible[0]!.date,
  );
  return pollsOnDate(polls, latestDate, asOf);
}
