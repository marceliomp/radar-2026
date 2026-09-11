import { useEffect, useMemo, useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { CANDIDATES_META, UF_ORDER, byUf } from "@/data/candidates";
import { pollsFor } from "@/data/race-polls";
import { UF_META } from "@/data/calendar";
import { runRaceForecast } from "@/lib/forecast/race-engine";
import { exampleGovernorUfs, ufTemCasas } from "@/lib/race-hooks";
import { useAsOf } from "@/lib/as-of";
import { useHalfLife } from "@/lib/half-life";
import { dateFull, fmtPct } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { HalfLifeControl } from "@/components/half-life-control";
import { ShareBar } from "@/components/share-bar";
import { SiteNav } from "@/components/site-nav";
import { locationUrl, parseUfCode, readStoredUf, writeStoredUf } from "@/lib/site";
import { trackRadar } from "@/lib/track";
import { CandidateList } from "./candidate-list";
import { RaceHero } from "./race-hero";
import { RacePollsTable } from "./race-polls-table";
import { RaceResults } from "./race-results";
import {
  OFFICE_OF_CARGO,
  firstBars,
  fold,
  pickLeaders,
  type RaceCargo,
} from "./race-types";

const routeApi = getRouteApi("/candidatos");

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function RacePage() {
  const { locale, m } = useI18n();
  const search = routeApi.useSearch();
  const uf = search.uf;
  const cargo: RaceCargo = search.cargo === "senador" ? "senador" : "governador";
  const navigate = routeApi.useNavigate();
  const [q, setQ] = useState("");
  const office = OFFICE_OF_CARGO[cargo];
  const [asOf] = useAsOf();
  const [halfLife] = useHalfLife();

  useEffect(() => {
    if (uf) {
      writeStoredUf(uf);
      return;
    }
    const stored = readStoredUf();
    if (!stored) return;
    void navigate({
      search: (prev) => ({ ...prev, uf: stored, cargo }),
      replace: true,
    });
  }, [uf, cargo, navigate]);

  const candidates = useMemo(
    () => (uf ? byUf(uf).filter((candidate) => candidate.office === office) : []),
    [uf, office],
  );

  const polls = useMemo(
    () => (uf ? pollsFor(office, uf) : []),
    [office, uf],
  );

  const result = useMemo(() => {
    if (!uf || !polls.length) return null;
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

  const ufName = uf ? (UF_META[uf]?.name ?? uf) : "";
  const tseAsOf = dateFull(CANDIDATES_META.asOf, locale);
  const examples = exampleGovernorUfs();
  const peerUf = uf && uf === examples.two ? examples.one : examples.two;
  const officeLabel = office === "senator" ? m.race.senator : m.race.governor;
  const shareHref = uf
    ? locationUrl("/candidatos", { uf, cargo, asOf, hl: halfLife, lang: locale })
    : undefined;
  const shareText = uf
    ? `${
        leaders[0]
          ? m.share.raceLine(
              officeLabel,
              uf,
              firstName(leaders[0].name),
              fmtPct(leaders[0].firstMean, 0, locale),
            )
          : `${officeLabel} ${uf} · Radar 2026`
      }\n${shareHref}`
    : undefined;

  function evidenceReason() {
    if (!result) return m.race.listTse;
    const ev = result.evidence;
    const reason =
      ev.polls === 0
        ? m.race.reasonNone
        : ev.grade === "insufficient"
          ? m.race.reasonFew
          : ev.grade === "thin"
            ? m.race.reasonThin
            : m.race.reasonEnough;
    return m.race.pollsLine(ev.polls, ev.houses, reason);
  }

  return (
    <div className="pb-[max(3rem,env(safe-area-inset-bottom))]">
      <header className="border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <SiteNav className="min-w-0 flex-1" />
          <span className="shrink-0 border border-border px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-cream">
            {m.badge}
          </span>
        </div>
        <div className="hl-strip sticky top-0 z-20 border-t border-border bg-bg px-4 py-2.5 md:px-6">
          <label className="block min-w-[10rem] flex-1 sm:max-w-[16rem]">
            <span className="sr-only">{m.race.state}</span>
            <select
              className="min-h-11 w-full border border-border bg-surface px-3 font-mono text-sm uppercase tracking-[0.08em] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={uf ?? ""}
              onChange={(event) => {
                const next = parseUfCode(event.target.value);
                if (!next) return;
                writeStoredUf(next);
                trackRadar("uf_click");
                void navigate({
                  search: (prev) => ({ ...prev, uf: next, cargo }),
                  replace: true,
                });
              }}
            >
              <option value="">{m.race.pickState}</option>
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

      {!uf ? (
        <section className="border-b border-border px-4 py-8 md:px-6">
          <p className="kicker">{officeLabel}</p>
          <p className="mt-2 max-w-xl text-sm font-medium text-muted">{m.race.pickState}</p>
        </section>
      ) : (
        <>
          <RaceHero ufName={ufName} office={office} leaders={leaders} result={result} />
          {shareText && shareHref ? (
            <div className="border-b border-border px-4 py-3 md:px-6">
              <ShareBar compact url={shareHref} text={shareText} />
            </div>
          ) : null}

          <p className="border-b border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-cream/85 md:px-6">
            {evidenceReason()}
            {tseAsOf ? ` · ${m.race.urna(tseAsOf)}` : ""}
          </p>
          <div className="hook-rail">
            {cargo === "governador" ? (
              <Link
                to="/candidatos"
                search={(prev) => ({ ...prev, uf, cargo: "senador" as const })}
                className="hook-link"
              >
                {m.race.senateOf(uf)}
              </Link>
            ) : (
              <Link
                to="/candidatos"
                search={(prev) => ({ ...prev, uf, cargo: "governador" as const })}
                className="hook-link"
              >
                {m.race.govOf(uf)}
              </Link>
            )}
            {peerUf ? (
              <Link
                to="/candidatos"
                search={(prev) => ({ ...prev, uf: peerUf, cargo: "governador" as const })}
                className="hook-link"
              >
                {ufTemCasas(peerUf, locale)}. {m.curve.compare}
              </Link>
            ) : null}
            <Link to="/" className="hook-link">
              {m.race.backPres}
            </Link>
          </div>

          <RaceResults bars={bars} result={result} />
          <RacePollsTable result={result} />

          <section>
            <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3 md:px-6">
              <div className="mr-auto">
                <p className="kicker">{m.race.tseKicker}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  {ufName} · {roster.length}{" "}
                  {m.race.names(roster.length)} · {CANDIDATES_META.source}
                </p>
              </div>
              <label className="block w-full sm:w-64">
                <span className="sr-only">{m.race.searchAria}</span>
                <input
                  type="search"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder={m.race.searchPh}
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
                  {m.race.senateOf(uf)}
                </Link>
              ) : (
                <Link
                  to="/candidatos"
                  search={(prev) => ({ ...prev, uf, cargo: "governador" as const })}
                  className="hook-link"
                >
                  {m.race.govOf(uf)}
                </Link>
              )}
              <span className="text-cream/35"> · </span>
              <Link to="/" className="hook-link">
                {m.race.backPres}
              </Link>
            </p>
          </section>
        </>
      )}
    </div>
  );
}
