import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import {
  CANDIDATES_META,
  UF_ORDER,
  byUf,
  type Candidate,
  type Office,
} from "@/data/candidates";
import { pollsFor } from "@/data/race-polls";
import { UF_META } from "@/data/calendar";
import {
  runRaceForecast,
  type RaceForecastResult,
} from "@/lib/forecast/race-engine";
import { useAsOf } from "@/lib/as-of";
import { useHalfLife } from "@/lib/half-life";
import { fmtNum, fmtPct, fmtProb } from "@/lib/format";
import { partyColor, partyTone } from "@/lib/chart-theme";
import { HalfLifeControl } from "@/components/half-life-control";
import { SiteNav } from "@/components/site-nav";
import { cn } from "@/lib/utils";

export type RaceOffice = Exclude<Office, "president">;
export type RaceCargo = "governador" | "senador";

type HeroLeader = {
  key: string;
  name: string;
  party: string;
  number: string;
  pWin: number;
  firstMean: number;
};

type FirstBar = {
  key: string;
  name: string;
  party: string;
  mean: number;
};

const routeApi = getRouteApi("/candidatos");

const OFFICE_OF_CARGO: Record<RaceCargo, RaceOffice> = {
  governador: "governor",
  senador: "senator",
};

const OFFICE_LABEL: Record<RaceOffice, string> = {
  governor: "Governador",
  senator: "Senador",
};

function fold(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function fmtDateBr(iso: string) {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function pickLeaders(
  office: RaceOffice,
  candidates: Candidate[],
  result: RaceForecastResult,
): HeroLeader[] {
  const ranked = candidates
    .map((c) => ({
      key: c.slug,
      name: c.name,
      party: c.party,
      number: c.number,
      pWin: result.probs[c.slug] ?? 0,
      firstMean: result.first[c.slug]?.mean ?? 0,
    }))
    .sort(
      (a, b) =>
        b.pWin - a.pWin ||
        b.firstMean - a.firstMean ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  if (office === "governor") return ranked.slice(0, 2);
  return ranked.filter((l) => l.pWin >= 0.02).slice(0, 4);
}

function firstBars(
  candidates: Candidate[],
  result: RaceForecastResult,
): FirstBar[] {
  const bySlug = new Map(candidates.map((c) => [c.slug, c]));
  return result.ordered
    .filter((row) => row.mean > 0)
    .slice(0, 8)
    .map((row) => {
      const c = bySlug.get(row.slug);
      return {
        key: row.slug,
        name: c?.name ?? row.slug,
        party: c?.party ?? "",
        mean: row.mean,
      };
    });
}

/** Hero mostra P(ganhar) 0-1. Nunca 100,0 / 0,0 como fato. */
function fmtHeroProb(p: number): string {
  if (p >= 0.995) return "99,5";
  if (p < 0.005) return "<1";
  return fmtProb(p).replace("%", "");
}

function MetaKicker({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "kicker",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function RaceDashboard() {
  const search = routeApi.useSearch();
  const uf = search.uf ?? "SC";
  const cargo: RaceCargo = search.cargo === "senador" ? "senador" : "governador";
  const navigate = routeApi.useNavigate();
  const [q, setQ] = useState("");
  const office = OFFICE_OF_CARGO[cargo];
  const [asOf] = useAsOf();
  const [halfLife] = useHalfLife();

  useEffect(() => {
    try {
      sessionStorage.setItem("radar2026:uf", uf);
    } catch {
      /* ignore */
    }
  }, [uf]);

  const candidates = useMemo(
    () => byUf(uf).filter((c) => c.office === office),
    [uf, office],
  );

  const polls = useMemo(() => pollsFor(office, uf), [office, uf]);

  const result = useMemo(() => {
    if (!polls.length) return null;
    return runRaceForecast(polls, candidates, {
      office,
      uf,
      asOf,
      halfLifeDays: halfLife,
      simulations: 4000,
    });
  }, [polls, candidates, office, uf, asOf, halfLife]);

  const empty = polls.length === 0;
  const leaders = result ? pickLeaders(office, candidates, result) : [];
  const bars = result ? firstBars(candidates, result) : [];
  const marked = useMemo(() => {
    const keys = new Set<string>();
    for (const b of bars) {
      keys.add(fold(b.key));
      keys.add(fold(b.name));
    }
    return keys;
  }, [bars]);

  const roster = useMemo(() => {
    const needle = fold(q.trim());
    if (!needle) return candidates;
    return candidates.filter((c) => {
      const blob = fold(`${c.name} ${c.party} ${c.number} ${c.slug ?? ""}`);
      return blob.includes(needle);
    });
  }, [candidates, q]);

  const ufName = UF_META[uf]?.name ?? uf;
  const tseAsOf = fmtDateBr(CANDIDATES_META.asOf);
  const heroCols = Math.max(leaders.length, 1);

  return (
    <div className="pb-[max(3rem,env(safe-area-inset-bottom))]">
      <header className="border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <SiteNav className="min-w-0 flex-1" />
          <span className="shrink-0 border border-border px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-cream">
            Nao e pesquisa
          </span>
        </div>

        <div className="hl-strip sticky top-0 z-20 border-t border-border bg-bg px-4 py-2.5 md:px-6">
          <label className="block min-w-[10rem] flex-1 sm:max-w-[16rem]">
            <span className="sr-only">Estado</span>
            <select
              className="min-h-11 w-full border border-border bg-surface px-3 font-mono text-sm uppercase tracking-[0.08em] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={uf}
              onChange={(e) => {
                try {
                  sessionStorage.setItem("radar2026:uf", e.target.value);
                } catch {
                  /* ignore */
                }
                void navigate({
                  search: (prev) => ({ ...prev, uf: e.target.value, cargo }),
                  replace: true,
                });
              }}
            >
              {UF_ORDER.map((code) => (
                <option key={code} value={code}>
                  {code} · {UF_META[code].name}
                </option>
              ))}
            </select>
          </label>
          <HalfLifeControl />
        </div>
      </header>

      {empty || leaders.length === 0 ? (
        <section className="border-b border-border px-4 py-8 md:px-6">
          <MetaKicker>
            {ufName} · {OFFICE_LABEL[office]}
          </MetaKicker>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-[-0.03em] text-cream">
            n/d
          </p>
          <p className="mt-2 max-w-xl text-sm font-medium text-muted">
            Sem agregado nesta cadeira. Lista TSE abaixo.
          </p>
          <p className="tight-next mt-4">
            <Link
              to="/"
              search={(prev) => {
                const p = prev as Record<string, unknown>;
                const out: Record<string, unknown> = {};
                if (typeof p.asOf === "string") out.asOf = p.asOf;
                if (typeof p.hl === "number") out.hl = p.hl;
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
      ) : (
        <section
          className={cn(
            "grid border-b border-border",
            heroCols === 1 && "grid-cols-1",
            heroCols === 2 && "grid-cols-1 md:grid-cols-2",
            heroCols === 3 && "grid-cols-1 md:grid-cols-3",
            heroCols >= 4 && "grid-cols-1 sm:grid-cols-2",
          )}
        >
          {leaders.map((leader, i) => {
            const tone = partyTone(leader.party);
            const p = fmtHeroProb(leader.pWin);
            return (
              <div
                key={leader.key}
                className={cn(
                  "flex flex-col justify-end px-4 py-7 md:px-6 md:py-9",
                  i > 0 && "border-t border-border md:border-t-0 md:border-l",
                  heroCols >= 4 && i >= 2 && "sm:border-t",
                )}
                style={{ background: tone.bg }}
              >
                <p
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: tone.fg }}
                >
                  {leader.name}
                </p>
                <p
                  className="mt-2 flex items-end gap-1 font-black leading-[0.84] tracking-[-0.04em]"
                  style={{
                    fontFamily: '"Archivo Black", "DM Sans", sans-serif',
                    fontSize:
                      heroCols >= 3
                        ? "clamp(2.6rem, 8vw, 4.5rem)"
                        : "clamp(3.2rem, 11vw, 6rem)",
                    color: tone.fg,
                  }}
                >
                  <span className="tabular-nums">{p}</span>
                  <span className="mb-[0.08em] font-mono text-[0.28em] font-semibold tracking-[0.08em]">
                    %
                  </span>
                </p>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#eaeaea]/75">
                  {leader.party ? (
                    <span>
                      {leader.party}
                      {leader.number ? ` · ${leader.number}` : ""}
                    </span>
                  ) : null}
                  {leader.firstMean > 0 ? (
                    <span className="tabular-nums" style={{ color: tone.fg }}>
                      1T {fmtPct(leader.firstMean)}
                    </span>
                  ) : null}
                </p>
              </div>
            );
          })}
        </section>
      )}

      <p className="border-b border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-cream/85 md:px-6">
        {polls.length
          ? `${polls.length} pesquisa${polls.length === 1 ? "" : "s"} · chance nao e intencao${polls.length < 3 ? " · poucas casas" : ""}`
          : "Lista TSE · sem peso de casa nesta cadeira"}
        {tseAsOf ? ` · urna ${tseAsOf}` : ""}
      </p>
      <div className="hook-rail">
        {cargo === "governador" ? (
          <Link
            to="/candidatos"
            search={(prev) => ({ ...prev, uf, cargo: "senador" as const })}
            className="hook-link"
          >
            E no Senado de {uf}?
          </Link>
        ) : (
          <Link
            to="/candidatos"
            search={(prev) => ({ ...prev, uf, cargo: "governador" as const })}
            className="hook-link"
          >
            E no governo de {uf}?
          </Link>
        )}
        {uf === "SP" ? (
          <Link
            to="/candidatos"
            search={(prev) => ({ ...prev, uf: "SC", cargo: "governador" as const })}
            className="hook-link"
          >
            SC tem 1 casa. Compara.
          </Link>
        ) : (
          <Link
            to="/candidatos"
            search={(prev) => ({ ...prev, uf: "SP", cargo: "governador" as const })}
            className="hook-link"
          >
            SP tem 2 casas. Compara.
          </Link>
        )}
        <Link to="/" className="hook-link">
          Volta ao presidente
        </Link>
      </div>

      {!empty && bars.length > 0 ? (
        <section className="border-b border-border">
          <div className="flex items-baseline justify-between gap-4 px-4 py-3 md:px-6">
            <MetaKicker>1º turno</MetaKicker>
            {result?.goesToSecond != null ? (
              <p className="font-mono text-[11px] font-semibold tabular-nums text-cream">
                2º {fmtProb(result.goesToSecond)}
              </p>
            ) : null}
          </div>
          <ul>
            {bars.map((b) => {
              const w = Math.max(0, Math.min(100, b.mean));
              const fg = partyColor(b.party);
              return (
                <li
                  key={b.key}
                  className="border-t border-border px-4 py-2.5 md:px-6"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold text-cream">
                      {b.name}
                      {b.party ? (
                        <span className="ml-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-cream">
                          {b.party}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className="shrink-0 font-mono text-sm font-semibold tabular-nums"
                      style={{ color: fg }}
                    >
                      {fmtPct(b.mean)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-surface-2">
                    <div
                      className="h-full"
                      style={{ width: `${w}%`, background: fg }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!empty && result && result.rows.length > 0 ? (
        <section className="border-b border-border">
          <div className="flex items-baseline justify-between gap-4 px-4 py-3 md:px-6">
            <MetaKicker>Casas</MetaKicker>
            <p className="font-mono text-[11px] tabular-nums text-muted">
              {result.rows.length}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-cream/80">
                <tr className="border-t border-border">
                  <th className="px-4 py-2 font-semibold md:px-6">Instituto</th>
                  <th className="px-3 py-2 font-semibold">Campo</th>
                  <th className="px-3 py-2 font-semibold">Modo</th>
                  <th className="px-3 py-2 font-semibold tabular-nums">n</th>
                  <th className="px-3 py-2 font-semibold tabular-nums">MOE</th>
                  <th className="px-4 py-2 font-semibold tabular-nums md:px-6">
                    Peso
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.poll.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium text-cream md:px-6">
                      {r.poll.institute}
                      {r.poll.notes ? (
                        <span className="mt-0.5 block text-xs font-medium text-muted">
                          {r.poll.notes}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted">
                      {fmtDateBr(r.poll.fieldEnd) || r.poll.fieldEnd}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs uppercase tracking-[0.08em] text-muted">
                      {r.poll.mode || "n/d"}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {r.poll.sample ? fmtNum(r.poll.sample, 0) : "n/d"}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {r.poll.moe ? `±${fmtNum(r.poll.moe, 0)}` : "n/d"}
                    </td>
                    <td className="px-4 py-2 font-mono font-medium tabular-nums text-cream md:px-6">
                      {fmtNum(r.weightShare * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3 md:px-6">
          <div className="mr-auto">
            <MetaKicker>Lista TSE</MetaKicker>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              {ufName} · {roster.length}{" "}
              {roster.length === 1 ? "nome" : "nomes"} · {CANDIDATES_META.source}
            </p>
          </div>
          <label className="block w-full sm:w-64">
            <span className="sr-only">Busca na lista TSE</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, partido, número"
              className="min-h-11 w-full border border-border bg-surface px-3 text-sm font-medium text-fg placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
        <div className="px-4 md:px-6">
          <CandidateList rows={roster} marked={marked} />
        </div>
        <p className="tight-next px-4 py-4 md:px-6">
          {cargo === "governador" ? (
            <Link
              to="/candidatos"
              search={(prev) => ({ ...prev, uf, cargo: "senador" as const })}
              className="hook-link"
            >
              E no Senado de {uf}?
            </Link>
          ) : (
            <Link
              to="/candidatos"
              search={(prev) => ({ ...prev, uf, cargo: "governador" as const })}
              className="hook-link"
            >
              E no governo de {uf}?
            </Link>
          )}
          <span className="text-cream/35"> · </span>
          <Link to="/" className="hook-link">
            Volta ao presidente
          </Link>
        </p>
      </section>
    </div>
  );
}

function CandidateList({
  rows,
  marked,
}: {
  rows: Candidate[];
  marked: Set<string>;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 font-mono text-sm text-muted">Nenhum nome neste filtro.</p>
    );
  }

  const sorted = [...rows].sort((a, b) => {
    const aHit = marked.has(fold(a.slug)) || marked.has(fold(a.name));
    const bHit = marked.has(fold(b.slug)) || marked.has(fold(b.name));
    if (aHit !== bHit) return aHit ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return (
    <div>
      <div className="cand-head">
        <span>UF</span>
        <span>Cargo</span>
        <span>Nome de urna</span>
        <span>Partido</span>
        <span>Nº</span>
      </div>
      <ul className="divide-y divide-border border-t border-border">
        {sorted.map((c) => {
          const inPoll = marked.has(fold(c.slug)) || marked.has(fold(c.name));
          const fg = partyColor(c.party);
          return (
            <li key={`${c.office}-${c.uf}-${c.number}-${c.slug ?? c.name}`}>
              <article className="cand-row">
                <span className="font-mono text-xs font-semibold tracking-[0.12em] text-muted">
                  {c.uf}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  {OFFICE_LABEL[c.office as RaceOffice]}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-snug text-cream">
                    {c.name}
                  </p>
                  {c.currentOffice ? (
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-cream/80">
                      {c.currentOffice}
                    </p>
                  ) : inPoll ? (
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-cream">
                      Na pesquisa
                    </p>
                  ) : (
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-cream/80">
                      Só na urna
                    </p>
                  )}
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
                  {c.party}
                </span>
                <span
                  className="font-mono text-sm font-semibold tabular-nums"
                  style={{ color: fg }}
                >
                  {c.number}
                </span>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
