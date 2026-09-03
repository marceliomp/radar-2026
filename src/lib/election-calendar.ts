/** Eixo das pesquisas até as urnas. Tempo proporcional, não blocos iguais. */

export const ELECTION_2026 = {
  firstRound: "2026-10-04",
  secondRound: "2026-10-25",
} as const;

export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const wd = dt.getUTCDay();
  const back = wd === 0 ? 6 : wd - 1;
  dt.setUTCDate(dt.getUTCDate() - back);
  return dt.toISOString().slice(0, 10);
}

function dateBr(iso: string): string {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function dayMs(iso: string): number {
  return Date.parse(`${iso}T12:00:00Z`);
}

export function axisPct(iso: string, start: string, end: string): number {
  const span = Math.max(dayMs(end) - dayMs(start), 1);
  const raw = (dayMs(iso) - dayMs(start)) / span;
  return Math.round(1000 * Math.min(1, Math.max(0, raw))) / 10;
}

export type AxisTick = {
  iso: string;
  left: number;
  houses: string[];
  title: string;
};

export type AxisLabel = {
  iso: string;
  text: string;
  left: number;
  align: "start" | "mid" | "end";
};

export function pollTimeAxis(
  polls: { national?: boolean; date: string; fieldEnd: string; institute?: string }[],
  asOf: string,
): {
  start: string;
  end: string;
  asOf: string;
  fill: number;
  ticks: AxisTick[];
  labels: AxisLabel[];
  label: string;
} {
  const end = ELECTION_2026.secondRound;
  const visible = polls.filter(
    (poll) => poll.national && poll.date <= asOf && poll.fieldEnd <= asOf,
  );
  if (!visible.length) {
    return {
      start: asOf,
      end,
      asOf,
      fill: axisPct(asOf, asOf, end),
      ticks: [],
      labels: [],
      label: "",
    };
  }
  const start = visible.reduce(
    (min, poll) => (poll.date < min ? poll.date : min),
    visible[0]!.date,
  );
  const byWeek = new Map<string, { last: string; houses: string[] }>();
  for (const poll of visible) {
    const week = mondayOf(poll.date);
    const cur = byWeek.get(week) ?? { last: poll.date, houses: [] };
    if (poll.date > cur.last) cur.last = poll.date;
    const name = poll.institute?.trim();
    if (name && !cur.houses.includes(name)) cur.houses.push(name);
    byWeek.set(week, cur);
  }
  const ticks: AxisTick[] = [...byWeek.values()]
    .sort((a, b) => a.last.localeCompare(b.last))
    .map((row) => {
      const houses = row.houses.slice().sort((a, b) => a.localeCompare(b));
      return {
        iso: row.last,
        left: axisPct(row.last, start, end),
        houses,
        title: `${dateBr(row.last)}: ${houses.join(", ")}`,
      };
    });
  const labels: AxisLabel[] = [
    { iso: start, text: dateBr(start), left: 0, align: "start" },
    {
      iso: ELECTION_2026.firstRound,
      text: "1º 04/10",
      left: axisPct(ELECTION_2026.firstRound, start, end),
      align: "mid",
    },
    { iso: end, text: "2º 25/10", left: 100, align: "end" },
  ];
  return {
    start,
    end,
    asOf,
    fill: axisPct(asOf, start, end),
    ticks,
    labels,
    label: `Pesquisas de ${dateBr(start)} a ${dateBr(asOf)}. 1º turno 04/10. 2º 25/10.`,
  };
}
