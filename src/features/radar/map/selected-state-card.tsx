import { Link } from "@tanstack/react-router";
import { UF_META } from "@/data/calendar";
import { ELECTION_2022, gap1t, gap2t, leader1t, leader2t, type Election2022Uf } from "@/data/election-2022";
import { STATE_BY_UF, cardMarginPp, type RoundKey } from "@/data/state-polls";
import { mapRoundView, shareBarPct } from "@/lib/forecast/map-round";
import { runAllStateForecasts } from "@/lib/forecast/states";
import { fmtNum, fmtPct } from "@/lib/format";
import { keepRadarSearch, useI18n } from "@/lib/i18n";
import { leadLine } from "./map-helpers";

type Forecasts = ReturnType<typeof runAllStateForecasts>;
type RoundView = ReturnType<typeof mapRoundView>;

function ShareBar({ lula, flavio }: { lula: number; flavio: number }) {
  const { m } = useI18n();
  const bar = shareBarPct(lula, flavio);
  return (
    <div className="h-2 overflow-hidden bg-surface-2">
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
      <div
        className="h-full"
        style={{
          width: `${bar.rest}%`,
          background: "var(--color-cream)",
          float: "left",
        }}
        title={m.map.restTitle}
      />
    </div>
  );
}

export function Urna2022Card({ uf, row }: { uf: string; row: Election2022Uf }) {
  const { locale, m, fmt } = useI18n();
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
          {m.map.pres2022(won2)}
        </p>
      </div>
      <div className="space-y-3 text-sm">
        {elec != null && (
          <p className="text-xs font-medium text-gold">
            {m.map.voters(fmt.num(elec, 1))}
          </p>
        )}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {m.map.first2022}
          </p>
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="num-lula font-semibold">Lula {fmtPct(row.lula1, 2, locale)}</span>
            <span className="num-flavio font-semibold">
              Bolsonaro {fmtPct(row.bolsonaro1, 2, locale)}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-gold">
            {leadLine(leader1t(row), gap1t(row), locale)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {m.map.second2022}
          </p>
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="num-lula font-semibold">Lula {fmtPct(row.lula2, 2, locale)}</span>
            <span className="num-flavio font-semibold">
              Bolsonaro {fmtPct(row.bolsonaro2, 2, locale)}
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
            {leadLine(won2, gap2t(row), locale)}
          </p>
        </div>
        <p className="text-xs font-medium leading-relaxed text-muted">
          {m.map.urnaNote}
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
  view,
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
  view: RoundView | undefined;
  meta: (typeof UF_META)[string] | undefined;
  statusLabel: string;
  round: RoundKey;
}) {
  const { locale, m, fmt } = useI18n();
  return (
        <div className="space-y-3">
          {is2022 ? (
            <>
              <p className="map-tally">
                <span className="num-flavio">{urnaBolso} Bolsonaro</span>
                <span className="num-lula">{urnaLula} Lula</span>
                <span className="text-muted">{m.map.inSecond}</span>
              </p>
              {row2022 ? (
                <Urna2022Card uf={sel} row={row2022} />
              ) : (
                <p className="text-sm font-medium text-muted">{m.map.noUrna}</p>
              )}
              <Link
                to="/candidatos"
                search={(prev) => ({
                  uf: sel,
                  cargo: "governador" as const,
                  ...keepRadarSearch(prev as Record<string, unknown>),
                })}
                className="hook-link mt-3 inline-block"
              >
                {m.map.seeGov(sel)}
              </Link>
            </>
          ) : (
            <>
              <p className="map-tally">
                <span className="num-flavio">{flavioLead} Flávio</span>
                <span className="text-gold">{ties} {m.map.tie}</span>
                <span className="num-lula">{lulaLead} Lula</span>
              </p>

              <div className="dossier">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="dossier-name">
                    {sel} · {meta?.name ?? sel}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-cream/80">
                    {m.map.president} · {statusLabel}
                    {view?.implied ? ` · ${m.map.firstRoundShort}` : ""}
                  </p>
                </div>
                {f && view ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-xs font-medium text-gold">
                      {m.map.nFirst(f.n)}
                      {f.n2 ? ` · ${m.map.withSecond(f.n2)}` : ` · ${m.map.noSecondAsked}`}
                      {meta ? ` · ${m.map.votersShort(fmt.num(meta.electorateM, 1))}` : ""}
                    </p>
                    {round === 2 && view.implied && (
                      <p className="text-xs font-medium text-muted">
                        {m.map.impliedLine}
                      </p>
                    )}
                    {view.polled && (
                      <>
                        <div className="flex justify-between tabular-nums">
                          <span className="num-lula font-semibold">
                            Lula {fmtPct(view.lula, 1, locale)}
                          </span>
                          <span className="num-flavio font-semibold">
                            Flávio {fmtPct(view.flavio, 1, locale)}
                          </span>
                        </div>
                        <ShareBar lula={view.lula} flavio={view.flavio} />
                        <p className="text-xs font-medium text-gold">
                          {m.map.margin(fmt.num(cardMarginPp(view.se), 1))}
                          {view.implied ? m.map.impliedMargin : ""}
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
                  <p className="text-sm font-medium text-muted">{m.map.noPoll}</p>
                )}
                <Link
                  to="/candidatos"
                  search={(prev) => ({
                    uf: sel,
                    cargo: "governador" as const,
                    ...keepRadarSearch(prev as Record<string, unknown>),
                  })}
                  className="hook-link mt-3 inline-block"
                >
                  {m.map.seeGov(sel)}
                </Link>
              </div>

              {f && (
                <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
                  {f.snapshot.rows
                    .filter((r) =>
                      round === 1 || view?.implied
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
                        {r.poll.secondRound ? "" : ` · ${m.map.firstRoundShort}`}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <span className="num-flavio">
                          {fmtNum(
                            round === 2 && !view?.implied ? r.adjFlavio2! : r.adjFlavio1,
                            1,
                            locale,
                          )}
                        </span>
                        <span className="mx-1 opacity-40">×</span>
                        <span className="num-lula">
                          {fmtNum(
                            round === 2 && !view?.implied ? r.adjLula2! : r.adjLula1,
                            1,
                            locale,
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
