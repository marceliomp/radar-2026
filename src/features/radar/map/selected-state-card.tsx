import { Link } from "@tanstack/react-router";
import { UF_META } from "@/data/calendar";
import { ELECTION_2022, gap1t, gap2t, leader1t, leader2t, type Election2022Uf } from "@/data/election-2022";
import { STATE_BY_UF, cardMarginPp, type RoundKey } from "@/data/state-polls";
import { mapRoundView, shareBarPct } from "@/lib/forecast/map-round";
import { runAllStateForecasts } from "@/lib/forecast/states";
import { fmtNum, fmtPct, fmtProb } from "@/lib/format";
import { leadLine, radarKeep } from "./map-helpers";

type Forecasts = ReturnType<typeof runAllStateForecasts>;
type RoundView = ReturnType<typeof mapRoundView>;

function ShareBar({ lula, flavio }: { lula: number; flavio: number }) {
  const bar = shareBarPct(lula, flavio);
  return (
    <div className="h-2 overflow-hidden bg-bg">
      <div
        className="h-full"
        style={{
          width: `${bar.lula}%`,
          background: "var(--color-lula)",
          float: "left",
        }}
      />
      <div
        className="h-full"
        style={{
          width: `${bar.flavio}%`,
          background: "var(--color-flavio)",
          float: "left",
        }}
      />
    </div>
  );
}


export function Urna2022Card({ uf, row }: { uf: string; row: Election2022Uf }) {
  const meta = UF_META[uf];
  const elec = UF_META[uf]?.electorateM;
  const won2 = leader2t(row);
  return (
    <div className="dossier">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="dossier-name">
          {uf} · {meta?.name ?? uf}
        </p>
        <p className="text-xs font-semibold uppercase tracking-wide text-cream/80">
          Presidente 2022 · {won2} no 2º
        </p>
      </div>
      <div className="space-y-3 text-sm">
        {elec != null && (
          <p className="text-xs font-medium text-gold">
            ~{fmtNum(elec, 1)} mi eleitores (TSE 2024/26)
          </p>
        )}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            1º turno 2022
          </p>
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="num-lula font-semibold">Lula {fmtPct(row.lula1, 2)}</span>
            <span className="num-flavio font-semibold">
              Bolsonaro {fmtPct(row.bolsonaro1, 2)}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-gold">
            {leadLine(leader1t(row), gap1t(row))}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            2º turno 2022
          </p>
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="num-lula font-semibold">Lula {fmtPct(row.lula2, 2)}</span>
            <span className="num-flavio font-semibold">
              Bolsonaro {fmtPct(row.bolsonaro2, 2)}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden bg-bg">
            <div
              className="h-full"
              style={{
                width: `${(row.lula2 / Math.max(row.lula2 + row.bolsonaro2, 1)) * 100}%`,
                background: "var(--color-lula)",
                float: "left",
              }}
            />
            <div
              className="h-full"
              style={{
                width: `${(row.bolsonaro2 / Math.max(row.lula2 + row.bolsonaro2, 1)) * 100}%`,
                background: "var(--color-flavio)",
                float: "left",
              }}
            />
          </div>
          <p className="mt-1 text-xs font-medium text-gold">
            {leadLine(won2, gap2t(row))}
          </p>
        </div>
        <p className="text-xs font-medium leading-relaxed text-muted">
          TSE, votos validos. Urna, nao pesquisa.
        </p>
      </div>
    </div>
  );
}

export function SelectedStatePanel({
  is2022,
  sel,
  row2022,
  urnaBolso,
  urnaLula,
  flavioLead,
  ties,
  lulaLead,
  f,
  m,
  meta,
  statusLabel,
  round,
}: {
  is2022: boolean;
  sel: string;
  row2022: Election2022Uf | undefined;
  urnaBolso: number;
  urnaLula: number;
  flavioLead: number;
  ties: number;
  lulaLead: number;
  f: Forecasts[string] | undefined;
  m: RoundView | undefined;
  meta: (typeof UF_META)[string] | undefined;
  statusLabel: string;
  round: RoundKey;
}) {
  return (
        <div className="space-y-3">
          {is2022 ? (
            <>
              <p className="map-tally">
                <span className="num-flavio">{urnaBolso} Bolsonaro</span>
                <span className="num-lula">{urnaLula} Lula</span>
                <span className="text-muted">no 2º turno</span>
              </p>
              {row2022 ? (
                <Urna2022Card uf={sel} row={row2022} />
              ) : (
                <p className="text-sm font-medium text-muted">Sem urna 2022 nesta UF.</p>
              )}
              <Link
                to="/candidatos"
                search={(prev) => ({
                  uf: sel,
                  cargo: "governador" as const,
                  ...radarKeep(prev as Record<string, unknown>),
                })}
                className="hook-link mt-3 inline-block"
              >
                Ver governadores de {sel}
              </Link>
            </>
          ) : (
            <>
              <p className="map-tally">
                <span className="num-flavio">{flavioLead} Flávio</span>
                <span className="text-gold">{ties} empate</span>
                <span className="num-lula">{lulaLead} Lula</span>
              </p>

              <div className="dossier">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="dossier-name">
                    {sel} · {meta?.name ?? sel}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-cream/80">
                    Presidente · {statusLabel}
                    {m?.implied ? " · 1º" : ""}
                  </p>
                </div>
                {f && m ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-xs font-medium text-gold">
                      {f.n === 1 ? "1 pesquisa no 1º" : `${f.n} pesquisas no 1º`}
                      {f.n2 ? ` · ${f.n2} com 2º perguntado` : " · 2º nao perguntado"}
                      {meta ? ` · ~${fmtNum(meta.electorateM, 1)} mi eleitores` : ""}
                    </p>
                    {round === 2 && m.implied && (
                      <p className="text-xs font-medium text-muted">
                        2º nao perguntado · two-way do 1º
                      </p>
                    )}
                    {m.polled && (
                      <>
                        <div className="flex justify-between tabular-nums">
                          <span className="num-lula font-semibold">
                            Lula {fmtPct(m.lula)}
                          </span>
                          <span className="num-flavio font-semibold">
                            Flávio {fmtPct(m.flavio)}
                          </span>
                        </div>
                        <ShareBar lula={m.lula} flavio={m.flavio} />
                        <p className="text-xs font-medium text-gold">
                          Margem ~ ±{fmtNum(cardMarginPp(m.se), 1)} pp · {m.implied
                            ? "chance de Flávio no two-way do 1º"
                            : "chance de Flávio neste turno"}{" "}
                          <span className="num-flavio">
                            {fmtProb(m.pFlavio ?? 0)}
                          </span>
                        </p>
                      </>
                    )}
                    {STATE_BY_UF[sel]?.note && (
                      <p className="text-xs font-medium leading-relaxed text-muted">
                        {STATE_BY_UF[sel]!.note}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-muted">Sem pesquisa neste estado.</p>
                )}
                <Link
                  to="/candidatos"
                  search={(prev) => ({
                    uf: sel,
                    cargo: "governador" as const,
                    ...radarKeep(prev as Record<string, unknown>),
                  })}
                  className="hook-link mt-3 inline-block"
                >
                  Ver governadores de {sel}
                </Link>
              </div>

              {f && (
                <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
                  {f.snapshot.rows
                    .filter((r) =>
                      round === 1 || m?.implied
                        ? true
                        : Boolean(r.poll.secondRound && r.adjFlavio2 != null && r.adjLula2 != null),
                    )
                    .map((r) => (
                    <li
                      key={r.poll.id}
                      className="flex items-center justify-between px-0 py-1.5 text-muted"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {r.poll.institute.split("/")[0]} {r.poll.date.slice(8)}/
                        {r.poll.date.slice(5, 7)}
                        {r.poll.secondRound ? "" : " · 1º"}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <span className="num-flavio">
                          {fmtNum(
                            round === 2 && !m?.implied ? r.adjFlavio2! : r.adjFlavio1,
                          )}
                        </span>
                        <span className="mx-1 opacity-40">×</span>
                        <span className="num-lula">
                          {fmtNum(
                            round === 2 && !m?.implied ? r.adjLula2! : r.adjLula1,
                          )}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
  );
}
