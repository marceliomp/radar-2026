/** Calendário TSE 2026: 1º turno 04/10, 2º 25/10. */

export const ELECTION_2026 = {
  campaignStart: "2026-08-16",
  firstRound: "2026-10-04",
  secondRound: "2026-10-25",
} as const;

function dayMs(iso: string) {
  return Date.parse(`${iso}T12:00:00Z`);
}

export function electionBarView(asOf: string): {
  pct: number;
  label: string;
  marks: { iso: string; text: string; left: number }[];
} {
  const start = dayMs(ELECTION_2026.campaignStart);
  const end = dayMs(ELECTION_2026.secondRound);
  const now = dayMs(asOf);
  const span = Math.max(end - start, 1);
  const pct = Math.round((1000 * Math.min(1, Math.max(0, (now - start) / span)))) / 10;
  const days1 = Math.round((dayMs(ELECTION_2026.firstRound) - now) / 86_400_000);
  const days2 = Math.round((dayMs(ELECTION_2026.secondRound) - now) / 86_400_000);
  let label: string;
  if (asOf < ELECTION_2026.firstRound) {
    label =
      days1 === 1
        ? "Falta 1 dia para o 1º turno, 04/10"
        : `Faltam ${days1} dias para o 1º turno, 04/10`;
  } else if (asOf === ELECTION_2026.firstRound) {
    label = "1º turno hoje, 04/10";
  } else if (asOf < ELECTION_2026.secondRound) {
    label =
      days2 === 1
        ? "Falta 1 dia para o 2º turno, 25/10"
        : `Faltam ${days2} dias para o 2º turno, 25/10`;
  } else if (asOf === ELECTION_2026.secondRound) {
    label = "2º turno hoje, 25/10";
  } else {
    label = "Urnas em 04/10 e 25/10";
  }
  const marks = [
    { iso: ELECTION_2026.campaignStart, text: "Campanha" },
    { iso: ELECTION_2026.firstRound, text: "1º 04/10" },
    { iso: ELECTION_2026.secondRound, text: "2º 25/10" },
  ].map((mark) => ({
    ...mark,
    left: Math.round((1000 * (dayMs(mark.iso) - start)) / span) / 10,
  }));
  return { pct, label, marks };
}
