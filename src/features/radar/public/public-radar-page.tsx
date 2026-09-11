import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Radio } from "lucide-react";
import { BrazilMap as BrazilMapView, MapLayerToggle, type MapLayer } from "@/features/radar/map/brazil-map";
import { HalfLifeControl } from "@/components/half-life-control";
import { ShareBar } from "@/components/share-bar";
import { SiteNav } from "@/components/site-nav";
import { TightRaces } from "@/components/tight-races";
import { GrowthCurve as GrowthCurveView } from "@/features/radar/public/growth-curve";
import { VisitHook } from "@/components/visit-hook";
import { CANDIDATE_META, polls } from "@/data/polls";
import { useAsOf } from "@/lib/as-of";
import {
  housesInAverage,
  runForecast,
  type EngineConfig,
  type ForecastPoll,
} from "@/lib/forecast/engine";
import {
  buildRunoffScenarios,
  type RunoffKey,
} from "@/lib/forecast/runoff-scenarios";
import { extraVarCached, publicEngineConfig } from "@/lib/forecast/extra-var";
import { fieldPeriodLine, fmtMult, isShownTie, pairTightnessLine, shownGap } from "@/lib/format";
import { useHalfLife, useHalfLifeDragging } from "@/lib/half-life";
import { keepRadarSearch, useI18n } from "@/lib/i18n";
import { UF_CHIP_CODES, writeStoredUf } from "@/lib/site";
import { trackRadar } from "@/lib/track";
import { fileStamp } from "@/lib/visit-delta";
import { buildHeroBoard, leadPairOrder, type HeroRow } from "@/lib/hero-board";
import { TWEEN_MS, useHeroFlip, useTweenedProb } from "@/features/radar/public/use-hero-flip";
import { pollsOnLatestDay } from "@/lib/latest-day";
import { exampleGovernorUfs, ufTemCasas } from "@/lib/race-hooks";
import { cn } from "@/lib/utils";

const COMPARE_GOV_UF = exampleGovernorUfs().two;
const GrowthCurve = memo(GrowthCurveView);
const BrazilMap = memo(BrazilMapView);

function useLaggedValue<T>(value: T, delayMs: number): T {
  const [lagged, setLagged] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setLagged(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return lagged;
}

function HeroColSlide({ children }: { children: ReactNode }) {
  return <div className="hero-col-slide">{children}</div>;
}

function HeroCol({
  heroKey,
  className,
  children,
}: {
  heroKey: string;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const flip = el.dataset.flip;
    if (!flip) return;
    const [x, y] = flip.split(",");
    el.style.transform = `translate3d(${x}, ${y}, 0)`;
  });
  return (
    <div ref={ref} className={className} data-hero-key={heroKey}>
      <HeroColSlide>{children}</HeroColSlide>
    </div>
  );
}




function HeroScoreColumns({
  board,
  othersLabel,
  formatProb,
}: {
  board: HeroRow[];
  othersLabel: string;
  formatProb: (p: number) => string;
}) {
  const dragging = useHalfLifeDragging();
  const order = leadPairOrder(board.map((row) => row.key));
  const prevOrder = useRef(order);
  const tweenMs = prevOrder.current !== order || dragging ? 0 : TWEEN_MS;
  prevOrder.current = order;
  const shownP = {
    lula: useTweenedProb(board.find((row) => row.key === "lula")?.p ?? 0, tweenMs),
    flavio: useTweenedProb(board.find((row) => row.key === "flavio")?.p ?? 0, tweenMs),
    outros: useTweenedProb(board.find((row) => row.key === "outros")?.p ?? 0, tweenMs),
  };
  return (
    <div className="hero-score" data-cols={board.length}>
      {board.map((row, index) => {
        const meta = row.key === "outros" ? null : CANDIDATE_META[row.key];
        const color = meta ? meta.color : "var(--color-cream)";
        const label =
          row.key === "outros"
            ? othersLabel
            : row.key === "flavio"
              ? "Flávio"
              : row.key === "lula"
                ? "Lula"
                : (meta?.name.split(" ").pop() ?? "");
        const align =
          board.length === 2
            ? index === 0
              ? "hero-col-l"
              : "hero-col-f"
            : index === 0
              ? "hero-col-l"
              : index === board.length - 1
                ? "hero-col-f"
                : "hero-col-m";
        const shown =
          row.key === "lula" || row.key === "flavio" || row.key === "outros"
            ? shownP[row.key]
            : row.p;
        return (
          <HeroCol key={row.key} heroKey={row.key} className={`hero-col ${align}`}>
              <p className="hero-kicker" style={{ color }}>
                {label}
              </p>
              <p className="hero-num" style={{ color }}>
                {formatProb(shown).replace("%", "")}
                <span className="hero-unit">%</span>
              </p>
          </HeroCol>
        );
      })}
    </div>
  );
}

const FIELD_KEYS = ["lula", "flavio", "renan", "caiado", "zema", "cury"] as const;

function FirstRoundField({
  first,
  fmtPct,
}: {
  first: Record<(typeof FIELD_KEYS)[number], { mean: number; nPolls?: number }>;
  fmtPct: (n: number) => string;
}) {
  const rows = FIELD_KEYS.map((key) => ({
    key,
    ...CANDIDATE_META[key],
    value: first[key].mean,
    nPolls: first[key].nPolls ?? 0,
  }))
    .filter((row) => row.key === "lula" || row.key === "flavio" || (row.nPolls > 0 && row.value > 0))
    .sort((a, b) => b.value - a.value);

  return (
    <ol className="mt-2">
      {rows.map((row, index) => (
        <li key={row.key} className="score-row">
          <span className="min-w-0 truncate">
            <span className="mr-2 font-mono text-xs text-cream/55">{index + 1}</span>
            <span className="font-semibold" style={{ color: row.color }}>{row.name}</span>
            <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-cream">
              {row.party}
            </span>
          </span>
          <span
            className={cn(
              "shrink-0 font-mono tabular-nums",
              index === 0 ? "text-xl font-semibold sm:text-2xl" : "text-sm font-semibold",
            )}
            style={{ color: row.color }}
          >
            {fmtPct(row.value)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function pairChance(probability: number, fmtProb: (p: number) => string) {
  if (probability >= 0.995) return ">99%";
  if (probability < 0.005) return "<1%";
  return fmtProb(probability);
}

function SecondRoundScenarios({
  first,
  second,
  pollsForPairs,
}: {
  first: Record<RunoffKey, { mean: number; se: number; nPolls: number }>;
  second: Record<RunoffKey, { mean: number; se: number; nPolls: number }> | null;
  pollsForPairs: (Pick<ForecastPoll, "secondRound" | "secondPairs"> & { weight?: number })[];
}) {
  const { m, fmt } = useI18n();
  const scenarios = useMemo(
    () => buildRunoffScenarios({ first, second, polls: pollsForPairs }),
    [first, second, pollsForPairs],
  );
  const hero =
    scenarios.find((scenario) => scenario.pairKey === "flavio|lula" && scenario.asked) ??
    scenarios.find((scenario) => scenario.asked) ??
    null;
  const rest = scenarios.filter(
    (scenario) => scenario.pairKey !== hero?.pairKey && scenario.asked,
  );

  if (!hero) {
    return <p className="mt-2 text-sm font-medium text-fg">{m.home.fewSecond}</p>;
  }

  const left = CANDIDATE_META[hero.a];
  const right = CANDIDATE_META[hero.b];
  return (
    <div className="mt-2">
      {hero.a2 != null && hero.b2 != null ? (
        <div className="matchup">
          <div>
            <p className="text-sm font-semibold" style={{ color: left.color }}>{left.name}</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream">{left.party}</p>
            <p className="matchup-num mt-1" style={{ color: left.color }}>{fmt.pct(hero.a2)}</p>
          </div>
          <p className="pb-3 font-mono text-xs text-cream/40">×</p>
          <div className="text-right">
            <p className="text-sm font-semibold" style={{ color: right.color }}>{right.name}</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream">{right.party}</p>
            <p className="matchup-num mt-1" style={{ color: right.color }}>{fmt.pct(hero.b2)}</p>
          </div>
        </div>
      ) : null}
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-cream/85">
        {m.home.pollsPair(hero.nAsked, pairChance(hero.pPair, fmt.prob))}
      </p>
      {rest.length > 0 ? (
        <ol className="mt-3">
          {rest.map((scenario) => {
            const a = CANDIDATE_META[scenario.a];
            const b = CANDIDATE_META[scenario.b];
            return (
              <li key={scenario.pairKey} className="score-row">
                <span className="min-w-0 text-sm">
                  <span style={{ color: a.color }}>{a.name}</span>
                  <span className="text-cream/40"> × </span>
                  <span style={{ color: b.color }}>{b.name}</span>
                </span>
                <span className="shrink-0 text-right font-mono text-xs tabular-nums">
                  {scenario.a2 != null && scenario.b2 != null ? (
                    <>
                      <span style={{ color: a.color }}>{fmt.pct(scenario.a2)}</span>
                      <span className="text-cream/40"> × </span>
                      <span style={{ color: b.color }}>{fmt.pct(scenario.b2)}</span>
                      <span className="ml-2 text-cream/50">
                        {scenario.nAsked} · par {pairChance(scenario.pPair, fmt.prob)}
                      </span>
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

function latestPairRows(poll: ForecastPoll) {
  const rows: { a: RunoffKey; b: RunoffKey; aPct: number; bPct: number }[] = [];
  if (poll.secondRound?.lula != null && poll.secondRound.flavio != null) {
    rows.push({ a: "lula", b: "flavio", aPct: poll.secondRound.lula, bPct: poll.secondRound.flavio });
  }
  for (const pair of poll.secondPairs ?? []) {
    if (!FIELD_KEYS.includes(pair.a as RunoffKey) || !FIELD_KEYS.includes(pair.b as RunoffKey)) continue;
    rows.push({ a: pair.a as RunoffKey, b: pair.b as RunoffKey, aPct: pair.aPct, bPct: pair.bPct });
  }
  return rows;
}

function LatestHouseCard({ poll }: { poll: ForecastPoll }) {
  const { locale, m, fmt } = useI18n();
  return (
    <div className="board-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="font-display text-xl font-semibold">{poll.institute}</p>
          <p className="text-sm font-medium text-gold">
            {fieldPeriodLine(poll.fieldStart, poll.fieldEnd, locale)}
          </p>
          <p className="text-sm font-medium text-cream/80">
            {poll.mode}
            {" · "}
            {poll.sample.toLocaleString(locale === "en" ? "en-US" : "pt-BR")} {m.home.people}
            {" · "}{m.home.moe}
            {fmt.num(poll.moe)} pp
          </p>
          {poll.source?.tseProtocol ? (
            <p className="font-mono text-xs font-medium text-cream/80">
              TSE {poll.source.tseProtocol}
            </p>
          ) : null}
          {poll.secondRound?.lula != null && poll.secondRound?.flavio != null ? (
            <p className="max-w-xl text-sm font-medium leading-relaxed text-cream">
              {pairTightnessLine(
                "Lula",
                "Flávio",
                poll.secondRound.lula,
                poll.secondRound.flavio,
                poll.moe,
                locale,
              )}
            </p>
          ) : null}
        </div>
        <div className="grid gap-6 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-medium text-gold">{m.home.firstRound}</p>
            <ul className="mt-1 space-y-0.5 text-sm font-semibold tabular-nums">
              {FIELD_KEYS
                .filter((key) => poll.firstRound[key] != null)
                .sort((a, b) => (poll.firstRound[b] ?? 0) - (poll.firstRound[a] ?? 0))
                .map((key) => (
                  <li key={key} className="flex justify-between gap-3">
                    <span style={{ color: CANDIDATE_META[key].color }}>{CANDIDATE_META[key].name}</span>
                    <span style={{ color: CANDIDATE_META[key].color }}>{fmt.pct(poll.firstRound[key] ?? 0)}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-gold">{m.home.secondRound}</p>
            <ul className="mt-1">
              {latestPairRows(poll).map((pair) => (
                <li key={`${pair.a}|${pair.b}`} className="score-row py-1">
                  <span className="min-w-0 text-sm">
                    <span style={{ color: CANDIDATE_META[pair.a].color }}>{CANDIDATE_META[pair.a].name}</span>
                    <span className="text-cream/40"> × </span>
                    <span style={{ color: CANDIDATE_META[pair.b].color }}>{CANDIDATE_META[pair.b].name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums">{fmt.pct(pair.aPct)} × {fmt.pct(pair.bPct)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicRadarPage() {
  const { locale, m, fmt } = useI18n();
  const [asOf] = useAsOf();
  const [halfLife] = useHalfLife();
  const curveHalfLife = useLaggedValue(halfLife, 240);
  const mapHalfLife = useLaggedValue(halfLife, 520);
  const [mapLayer, setMapLayer] = useState<MapLayer>("agg2026");

  const extraVarPp = useMemo(
    () => extraVarCached(publicEngineConfig(asOf, halfLife)),
    [asOf],
  );
  const config = useMemo<EngineConfig>(
    () => publicEngineConfig(asOf, halfLife, extraVarPp),
    [asOf, halfLife, extraVarPp],
  );
  const deferredConfig = useMemo<EngineConfig>(
    () => publicEngineConfig(asOf, mapHalfLife, extraVarPp),
    [asOf, mapHalfLife, extraVarPp],
  );

  const forecast = useMemo(() => runForecast(polls, config), [config]);
  const { probs, rows, first, second } = forecast;
  const latestDayPolls = useMemo(() => pollsOnLatestDay(polls, asOf), [asOf]);
  const pLula = Math.round(probs.lulaWinsElection * 1000) / 10;
  const pFlavio = Math.round(probs.flavioWinsElection * 1000) / 10;
  const heroBoard = useMemo(() => buildHeroBoard(probs), [probs]);
  const heroFlipRef = useHeroFlip(leadPairOrder(heroBoard.map((row) => row.key)));

  function gapPlain(a: number | undefined, b: number | undefined, se?: number) {
    if (a == null || b == null) return m.home.fewSecond;
    const gap = shownGap(a, b);
    const pts = fmt.num(Math.abs(gap));
    if (se != null && isShownTie(a, b, se)) {
      return m.home.technicalTie(pts);
    }
    return m.home.aheadIntent(gap > 0 ? "Lula" : "Flávio", pts);
  }

  function leadPlain(lulaLead: number, flavioLead: number) {
    const lula = lulaLead >= flavioLead;
    return m.home.leadsFirst(lula ? "Lula" : "Flávio", fmt.prob(lula ? lulaLead : flavioLead));
  }

  return (
    <div className="pb-[max(4rem,env(safe-area-inset-bottom))]">
      <a href="#conteudo" className="skip-link">{m.skip}</a>
      <section className="hero-mast" ref={heroFlipRef}>
        <div className="hero-chrome">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <SiteNav className="min-w-0 flex-1" />
            <span className="hero-badge">{m.badge}</span>
          </div>
        </div>
        <h1 className="hero-method">
          {m.hero.chance}
          <span className="hero-method-sub">{m.hero.sub}</span>
        </h1>
        <HeroScoreColumns board={heroBoard} othersLabel={m.hero.others} formatProb={fmt.prob} />
        <p className="hero-fresh">{fileStamp(latestDayPolls, locale)}</p>
        <VisitHook
          pLula={pLula}
          pFlavio={pFlavio}
          hl={halfLife}
          newestId={latestDayPolls.map((poll) => poll.id).sort().join("|")}
        />
        <div className="hero-share">
          <ShareBar
            compact
            asOf={fmt.date(config.asOf)}
            lula1={first.lula.mean}
            flavio1={first.flavio.mean}
            lula2={second?.lula.mean ?? 0}
            flavio2={second?.flavio.mean ?? 0}
            pLula={probs.lulaWinsElection}
            pFlavio={probs.flavioWinsElection}
          />
          <nav aria-label={m.home.ufChipsAria} className="uf-chips">
            {UF_CHIP_CODES.map((code) => (
              <Link
                key={code}
                to="/candidatos"
                search={(prev) => ({
                  uf: code,
                  cargo: "governador" as const,
                  ...keepRadarSearch(prev as Record<string, unknown>),
                })}
                className="uf-chip"
                onClick={() => {
                  writeStoredUf(code);
                  trackRadar("uf_click");
                }}
              >
                {code}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <main id="conteudo" className="page-body page-body-home mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 pt-5 sm:px-6 sm:pt-8">
        <HalfLifeControl />
        <GrowthCurve polls={polls} asOf={asOf} halfLifeDays={curveHalfLife} />
        <section id="media" className="mb-6 space-y-4 scroll-mt-24">
          <div className="story-head">
            <p className="kicker">{m.home.avgKicker}</p>
            <h2 className="story-title">{m.home.avgTitle}</h2>
            <p className="story-lede">{m.home.avgLede}</p>
          </div>
          <div className="board-split">
            <div className="board-card border-0 sm:border-r sm:border-border">
              <p className="kicker">{m.home.firstRound}</p>
              <FirstRoundField first={first} fmtPct={fmt.pct} />
              <p className="mt-3 text-xs font-medium leading-relaxed text-cream/85">
                {gapPlain(first.lula.mean, first.flavio.mean, first.seGap)} · {leadPlain(probs.lulaLeadsFirst, probs.flavioLeadsFirst)}
              </p>
              <p className="mt-3"><a href="#pares" className="hook-link">{m.home.toSecond}</a></p>
            </div>
            <div className="board-card border-0 border-t border-border sm:border-t-0">
              <p className="kicker" id="pares">{m.home.secondRound}</p>
              <SecondRoundScenarios
                first={first}
                second={second}
                pollsForPairs={rows.map((row) => ({ ...row.poll, weight: row.weight }))}
              />
              <p className="mt-3"><a href="#mapa" className="hook-link">{m.home.toState}</a></p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-fg">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 shrink-0 text-primary" />{m.home.updated(fmt.date(config.asOf))}</span>
              <span className="inline-flex items-center gap-1.5"><Radio className="size-4 shrink-0 text-primary" />{m.home.inFile(rows.length, halfLife)}</span>
            </div>
          </div>
        </section>

        {latestDayPolls.length > 0 ? (
          <section id="novo" className="mb-6 space-y-3">
            <div className="story-head mb-0">
              <p className="eyebrow">{latestDayPolls.length > 1 ? m.home.thisDay : m.home.newPoll}</p>
              {latestDayPolls.length > 1 ? (
                <h2 className="story-title">{m.home.sameDay(latestDayPolls.length)}</h2>
              ) : null}
            </div>
            {latestDayPolls.map((poll) => (
              <LatestHouseCard key={poll.id} poll={poll} />
            ))}
            <p>
              <a href="#mapa" className="hook-link">{m.home.toState}</a>
            </p>
          </section>
        ) : null}

        <TightRaces />
        <section id="mapa" className="space-y-3 scroll-mt-24">
          <div className="story-head">
            <p className="kicker">{m.home.territory}</p>
            <h2 className="story-title">{m.home.yourState}</h2>
            <p className="story-lede">{m.home.mapLede}</p>
          </div>
          <MapLayerToggle layer={mapLayer} onChange={setMapLayer} />
          <BrazilMap config={deferredConfig} layer={mapLayer} />
          {COMPARE_GOV_UF ? (
            <p className="tight-next">
              <Link to="/candidatos" search={{ uf: COMPARE_GOV_UF, cargo: "governador", asOf, hl: halfLife }} className="hook-link">
                {ufTemCasas(COMPARE_GOV_UF, locale)}. {locale === "en" ? "Compare." : "Compara."}
              </Link>
            </p>
          ) : null}
        </section>
        <section id="metodo" className="mb-6 mt-8 space-y-4 scroll-mt-24">
          <div className="story-head">
            <p className="kicker">{m.home.methodKicker}</p>
            <h2 className="story-title">{m.home.methodTitle}</h2>
            <p className="story-lede">{m.home.methodLede}</p>
          </div>
          <div className="board-card">
            <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {housesInAverage(rows).slice(0, 6).map((house, index) => (
                <span key={house.institute} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg">
                  <span className="text-gold">{index + 1}.</span>{house.institute}
                  <span className="tabular-nums text-cream/80">{fmt.pct(house.share * 100, 0)} {m.home.ofWeight}</span>
                  <span className="tabular-nums text-primary">×{fmtMult(house.quality, 2, locale)}</span>
                </span>
              ))}
            </div>
            <p className="mt-4">
              <Link to="/lab" className="hook-link">{m.home.methodLink}</Link>
            </p>
          </div>
        </section>
        <footer className="mt-10 border-t border-border pt-6 text-center text-xs font-medium text-muted">
          <nav aria-label={m.home.footerNav} className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link to="/" className="hook-link">{m.nav.president}</Link>
            <Link to="/candidatos" search={{ uf: "SP", cargo: "governador", asOf, hl: halfLife }} className="hook-link">{m.nav.governors}</Link>
            <Link to="/candidatos" search={{ uf: "SP", cargo: "senador", asOf, hl: halfLife }} className="hook-link">{m.nav.senators}</Link>
            <Link to="/lab" className="hook-link">{m.nav.method}</Link>
          </nav>
          <p>{m.home.footer}</p>
        </footer>
      </main>
    </div>
  );
}
