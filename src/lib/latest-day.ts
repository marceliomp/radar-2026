import type { ForecastPoll } from "./forecast/engine.ts";

/** Todas as nacionais do dia mais recente no arquivo, cada uma com o próprio campo. */
export function pollsOnLatestDay(polls: ForecastPoll[], asOf: string): ForecastPoll[] {
  const visible = polls.filter(
    (poll) => poll.national && poll.date <= asOf && poll.fieldEnd <= asOf,
  );
  if (visible.length === 0) return [];
  const latestDate = visible.reduce(
    (max, poll) => (poll.date > max ? poll.date : max),
    visible[0]!.date,
  );
  return visible
    .filter((poll) => poll.date === latestDate)
    .slice()
    .sort(
      (a, b) =>
        b.fieldEnd.localeCompare(a.fieldEnd) ||
        a.institute.localeCompare(b.institute) ||
        a.id.localeCompare(b.id),
    );
}
