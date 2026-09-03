/** Semanas de pesquisa no arquivo, segunda a domingo. */

export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const wd = dt.getUTCDay();
  const back = wd === 0 ? 6 : wd - 1;
  dt.setUTCDate(dt.getUTCDate() - back);
  return dt.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + days));
  return dt.toISOString().slice(0, 10);
}

function dateBr(iso: string): string {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export type WeekCell = { start: string; count: number; houses: string[] };

export function pollWeekBar(
  polls: { national?: boolean; date: string; fieldEnd: string; institute?: string }[],
  asOf: string,
): {
  weeks: WeekCell[];
  asOf: string;
  nWithPolls: number;
  from: string;
  to: string;
  label: string;
} {
  const visible = polls.filter(
    (poll) => poll.national && poll.date <= asOf && poll.fieldEnd <= asOf,
  );
  if (!visible.length) {
    return {
      weeks: [],
      asOf,
      nWithPolls: 0,
      from: asOf,
      to: asOf,
      label: `Pesquisas por semana`,
    };
  }
  const first = visible.reduce((min, poll) => (poll.date < min ? poll.date : min), visible[0]!.date);
  const houses = new Map<string, string[]>();
  for (const poll of visible) {
    const week = mondayOf(poll.date);
    const list = houses.get(week) ?? [];
    const name = poll.institute?.trim();
    if (name && !list.includes(name)) list.push(name);
    houses.set(week, list);
  }
  const weeks: WeekCell[] = [];
  let cur = mondayOf(first);
  const last = mondayOf(asOf);
  while (cur <= last) {
    const list = (houses.get(cur) ?? []).slice().sort((a, b) => a.localeCompare(b));
    weeks.push({ start: cur, count: list.length, houses: list });
    cur = addDays(cur, 7);
  }
  const nWithPolls = weeks.filter((week) => week.count > 0).length;
  return {
    weeks,
    asOf,
    nWithPolls,
    from: first,
    to: asOf,
    label: `Pesquisas por semana · ${dateBr(first)} a ${dateBr(asOf)}`,
  };
}
