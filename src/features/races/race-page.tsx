import { useEffect, useMemo, useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { CANDIDATES_META, UF_ORDER, byUf } from "@/data/candidates";
import { pollsFor } from "@/data/race-polls";
import { UF_META } from "@/data/calendar";
import { runRaceForecast } from "@/lib/forecast/race-engine";
import { useAsOf } from "@/lib/as-of";
import { useHalfLife } from "@/lib/half-life";
import { HalfLifeControl } from "@/components/half-life-control";
import { SiteNav } from "@/components/site-nav";
import { CandidateList } from "./candidate-list";
import { RaceHero } from "./race-hero";
import { RacePollsTable } from "./race-polls-table";
import { RaceResults } from "./race-results";
import {
  OFFICE_LABEL,
  OFFICE_OF_CARGO,
  firstBars,
  fold,
  fmtDateBr,
  pickLeaders,
  type RaceCargo,
} from "./race-types";

const routeApi = getRouteApi("/candidatos");

export function RacePage() {
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
    () => byUf(uf).filter((candidate) => candidate.office === office),
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

  const leaders = result ? pickLeaders(office, candidates, result) : [];
  const bars = useMemo(
    () => (result ? firstBars(candidates, result) : []),
    [candidates, result],
  );
  const marked = useMemo(() => {
    const keys = new Set<string>();
    for (const bar of bars) {
      keys.add(fold(bar.key));
      keys.add(fold(bar.name));
    }
    return keys;
  }, [bars]);

  const roster = useMemo(() => {
    const needle = fold(q.trim());
    if (!needle) return candidates;
    return candidates.filter((candidate) => {
      const blob = fold(
        `${candidate.name} ${candidate.party} ${candidate.number} ${candidate.slug ?? ""}`,
      );
      return blob.includes(needle);
    });
  }, [candidates, q]);

  const ufName = UF_META[uf]?.name ?? uf;
  const tseAsOf = fmtDateBr(CANDIDATES_META.asOf);

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
              onChange={(event) => {
                try {
                  sessionStorage.setItem("radar2026:uf", event.target.value);
                } catch {
                  /* ignore */
                }
                void navigate({
                  search: (prev) => ({ ...prev, uf: event.target.value, cargo }),
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

      <RaceHero ufName={ufName} office={office} leaders={leaders} result={result} />

      <p className="border-b border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-cream/85 md:px-6">
        {result
          ? `${result.evidence.polls} pesquisa${result.evidence.polls === 1 ? "" : "s"} · ${result.evidence.houses} instituto${result.evidence.houses === 1 ? "" : "s"} · ${result.evidence.reason}`
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

      <RaceResults bars={bars} result={result} />
      <RacePollsTable result={result} />

      <section>
        <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3 md:px-6">
          <div className="mr-auto">
            <p className="kicker">Lista TSE</p>
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
              onChange={(event) => setQ(event.target.value)}
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
