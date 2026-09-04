import { Link } from "@tanstack/react-router";
import type { RaceForecastResult } from "@/lib/forecast/race-engine";
import { fmtPct, fmtProb } from "@/lib/format";
import { partyTone } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";
import {
  OFFICE_LABEL,
  type HeroLeader,
  type RaceOffice,
} from "./race-types";

function fmtHeroProb(probability: number) {
  if (probability >= 0.995) return "99,5";
  if (probability < 0.005) return "<1";
  return fmtProb(probability).replace("%", "");
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
  if (!result || leaders.length === 0) {
    return (
      <section className="border-b border-border px-4 py-8 md:px-6">
        <p className="kicker">{ufName} · {OFFICE_LABEL[office]}</p>
        <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-[-0.03em] text-cream">n/d</p>
        <p className="mt-2 max-w-xl text-sm font-medium text-muted">Sem agregado nesta cadeira. Lista TSE abaixo.</p>
        <p className="tight-next mt-4">
          <Link
            to="/"
            search={(prev) => {
              const current = prev as Record<string, unknown>;
              const out: Record<string, unknown> = {};
              if (typeof current.asOf === "string") out.asOf = current.asOf;
              if (typeof current.hl === "number") out.hl = current.hl;
              return out;
            }}
            className="hook-link"
          >
            Volta ao presidente
          </Link>
          <span className="text-cream/35"> · </span>
          <Link
            to="/candidatos"
            search={(prev) => ({ ...prev, uf: "SP", cargo: "governador" as const })}
            className="hook-link"
          >
            SP tem 2 casas. Compara.
          </Link>
        </p>
      </section>
    );
  }

  const columns = Math.max(leaders.length, 1);
  const publish = result.evidence.canPublishProbability;
  const chanceLabel = office === "senator" ? "chance de uma cadeira" : "chance da cadeira";
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
                <span className="tabular-nums">{fmtPct(leader.firstMean).replace("%", "")}</span>
                <span className="mb-[0.08em] font-mono text-[0.28em] font-semibold tracking-[0.08em]">%</span>
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#eaeaea]/65">
                Intenção agregada
              </p>
              {publish ? (
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#eaeaea]/80">
                  {chanceLabel}{" "}
                  <span className="tabular-nums" style={{ color: tone.fg }}>
                    {fmtHeroProb(leader.pWin)}%
                  </span>
                </p>
              ) : null}
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#eaeaea]/75">
                {leader.party ? <span>{leader.party}</span> : null}
                {leader.number ? <span>{leader.party ? " · " : ""}nº {leader.number}</span> : null}
              </p>
            </div>
          );
        })}
      </section>
      {!publish ? (
        <p className="border-b border-border bg-gold/8 px-4 py-3 font-mono text-xs uppercase tracking-[0.1em] text-gold md:px-6">
          Evidência insuficiente para publicar chance · {result.evidence.houses} instituto
        </p>
      ) : null}
    </>
  );
}
