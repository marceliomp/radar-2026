import { Link } from "@tanstack/react-router";
import type { RaceForecastResult } from "@/lib/forecast/race-engine";
import { fmtPct, fmtProb } from "@/lib/format";
import { partyTone } from "@/lib/chart-theme";
import { keepRadarSearch, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { exampleGovernorUfs, ufTemCasas } from "@/lib/race-hooks";
import {
  type HeroLeader,
  type RaceOffice,
} from "./race-types";

const COMPARE_GOV_UF = exampleGovernorUfs().two;

function fmtHeroProb(probability: number, locale: "pt" | "en") {
  if (probability >= 0.995) return locale === "en" ? "99.5" : "99,5";
  if (probability < 0.005) return "<1";
  return fmtProb(probability, 1, locale).replace("%", "");
}

export function RaceHero({
  ufName,
  office,
  leaders,
  result,
}: {
  ufName: string;
  office: RaceOffice;
  leaders: HeroLeader[];
  result: RaceForecastResult | null;
}) {
  const { locale, m } = useI18n();
  const officeLabel = office === "senator" ? m.race.senator : m.race.governor;
  if (!result || leaders.length === 0) {
    return (
      <section className="border-b border-border px-4 py-8 md:px-6">
        <p className="kicker">{ufName} · {officeLabel}</p>
        <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-[-0.03em] text-cream">n/d</p>
        <p className="mt-2 max-w-xl text-sm font-medium text-muted">{m.race.noAgg}</p>
        <p className="tight-next mt-4">
          <Link
            to="/"
            search={(prev) => keepRadarSearch(prev as Record<string, unknown>)}
            className="hook-link"
          >
            {m.race.backPres}
          </Link>
          {COMPARE_GOV_UF ? (
            <>
              <span className="text-cream/35"> · </span>
              <Link
                to="/candidatos"
                search={(prev) => ({ ...prev, uf: COMPARE_GOV_UF, cargo: "governador" as const })}
                className="hook-link"
              >
                {ufTemCasas(COMPARE_GOV_UF, locale)}. {m.curve.compare}
              </Link>
            </>
          ) : null}
        </p>
      </section>
    );
  }

  const columns = Math.max(leaders.length, 1);
  const publish = result.evidence.canPublishProbability;
  const chanceLabel = office === "senator" ? m.race.chanceSenate : m.race.chanceSeat;
  return (
    <>
      <section
        className={cn(
          "grid border-b border-border",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 md:grid-cols-2",
          columns === 3 && "grid-cols-1 md:grid-cols-3",
          columns >= 4 && "grid-cols-1 sm:grid-cols-2",
        )}
      >
        {leaders.map((leader, index) => {
          const tone = partyTone(leader.party);
          return (
            <div
              key={leader.key}
              className={cn(
                "flex flex-col justify-end px-4 py-7 md:px-6 md:py-9",
                index > 0 && "border-t border-border md:border-t-0 md:border-l",
                columns >= 4 && index >= 2 && "sm:border-t",
              )}
              style={{ background: tone.bg }}
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: tone.fg }}>{leader.name}</p>
              <p
                className="mt-2 flex items-end gap-1 font-black leading-[0.84] tracking-[-0.04em]"
                style={{
                  fontFamily: '"Archivo Black", "DM Sans", sans-serif',
                  fontSize: columns >= 3 ? "clamp(2.6rem, 8vw, 4.5rem)" : "clamp(3.2rem, 11vw, 6rem)",
                  color: tone.fg,
                }}
              >
                <span className="tabular-nums">{fmtPct(leader.firstMean, 1, locale).replace("%", "")}</span>
                <span className="mb-[0.08em] font-mono text-[0.28em] font-semibold tracking-[0.08em]">%</span>
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#eaeaea]/65">
                {m.race.intent}
              </p>
              {publish ? (
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#eaeaea]/80">
                  {chanceLabel}{" "}
                  <span className="tabular-nums" style={{ color: tone.fg }}>
                    {fmtHeroProb(leader.pWin, locale)}%
                  </span>
                </p>
              ) : null}
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#eaeaea]/75">
                {leader.party ? <span>{leader.party}</span> : null}
                {leader.number ? <span>{leader.party ? " · " : ""}{m.race.num(leader.number)}</span> : null}
              </p>
            </div>
          );
        })}
      </section>
      {!publish ? (
        <p className="border-b border-border bg-gold/8 px-4 py-3 font-mono text-xs uppercase tracking-[0.1em] text-gold md:px-6">
          {m.race.thin(result.evidence.houses)}
        </p>
      ) : null}
    </>
  );
}
