import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { MastBar } from "@/components/site-nav";
import { UF_META } from "@/data/calendar";
import { ApuracaoMap } from "@/features/apuracao/apuracao-map";
import {
  APURACAO_REFRESH_MS,
  CARGOS,
  callCount,
  countTargets,
  displayName,
  fetchCount,
  rollupPresident,
  type Cargo,
  type CountCall,
  type CountResult,
  type TseCandidate,
  type TseCount,
} from "@/lib/apuracao/tse";
import { useI18n } from "@/lib/i18n";
import { parseUfCode, readStoredUf, writeStoredUf } from "@/lib/site";

const routeApi = getRouteApi("/apuracao");

const OFFICE_KEY = {
  presidente: "presidente",
  governador: "governador",
  senador: "senador",
  "deputado-federal": "deputadoFederal",
  "deputado-estadual": "deputadoEstadual",
} as const;

function fmtVotes(votes: number, locale: "pt" | "en"): string {
  return votes.toLocaleString(locale === "en" ? "en-US" : "pt-BR");
}

function restLimit(count: TseCount): number {
  if (count.seats > 1) return Math.min(24, Math.max(count.seats, 12));
  return 8;
}

function CountCard({
  title,
  count,
  loaded,
}: {
  title: string;
  count: CountResult | undefined;
  loaded: boolean;
}) {
  const { locale, m } = useI18n();
  const waiting = !loaded || !count || count.status !== "ok";
  const call = count?.status === "ok" ? callCount(count) : null;

  return (
    <section className="apuracao-card" aria-live="polite">
      <p className="kicker">{m.apuracao.label}</p>
      <h2 className="apuracao-card-title">{title}</h2>
      {waiting || !count || count.status !== "ok" || !call ? (
        <p className="apuracao-wait">{loaded ? m.apuracao.waiting : m.apuracao.source}</p>
      ) : (
        <>
          <p className="apuracao-pct" aria-label={m.apuracao.counted(count.pctApurado)}>
            <span className="apuracao-pct-num">{count.pctApurado}</span>
            <span className="apuracao-pct-unit">%</span>
          </p>
          <p className="apuracao-meta">
            {m.apuracao.countedWord}
            {count.seats > 1 ? ` · ${m.apuracao.seats(count.seats)}` : ""}
            {count.updatedAt ? ` · ${m.apuracao.updated(count.updatedAt)}` : ""}
          </p>
          <CallBlock call={call} count={count} locale={locale} />
        </>
      )}
    </section>
  );
}

function CallBlock({
  call,
  count,
  locale,
}: {
  call: CountCall;
  count: TseCount;
  locale: "pt" | "en";
}) {
  const { m } = useI18n();
  const rest = call.rest.slice(0, restLimit(count));

  return (
    <>
      {call.kind === "empate" ? (
        <>
          <p className="apuracao-status">{m.apuracao.tie}</p>
          <TiedNames candidates={count.candidates} />
        </>
      ) : null}

      {call.elected.length > 0 ? (
        <div className="apuracao-elected">
          <p className="apuracao-status">
            {call.elected.length > 1 ? m.apuracao.electedMany : m.apuracao.elected}
          </p>
          <ul>
            {call.elected.map((cand) => (
              <Person
                key={`${cand.number}-${cand.name}`}
                cand={cand}
                locale={locale}
                badge={m.apuracao.elected}
                prominent
              />
            ))}
          </ul>
        </div>
      ) : null}

      {call.kind === "segundo-turno" ? (
        <div className="apuracao-elected">
          <p className="apuracao-status">{m.apuracao.runoff}</p>
          <ul>
            {call.runoff.map((cand) => (
              <Person
                key={`${cand.number}-${cand.name}`}
                cand={cand}
                locale={locale}
                badge={m.apuracao.runoff}
                prominent
                open
              />
            ))}
          </ul>
        </div>
      ) : null}

      {call.kind === "na-frente" && call.leading ? (
        <div className="apuracao-elected">
          <ul>
            <Person cand={call.leading} locale={locale} badge={m.apuracao.leading} prominent open />
          </ul>
        </div>
      ) : null}

      {rest.length > 0 && call.kind !== "empate" ? (
        <ol className="apuracao-rank">
          {rest.map((cand) => (
            <Person key={`${cand.number}-${cand.name}`} cand={cand} locale={locale} />
          ))}
        </ol>
      ) : null}

      {call.kind === "empate" ? (
        <ol className="apuracao-rank">
          {count.candidates.slice(0, restLimit(count)).map((cand) => (
            <Person key={`${cand.number}-${cand.name}`} cand={cand} locale={locale} />
          ))}
        </ol>
      ) : null}
    </>
  );
}

function TiedNames({ candidates }: { candidates: TseCandidate[] }) {
  const top = candidates[0]?.votes;
  const tied = candidates.filter((cand) => cand.votes === top);
  return (
    <p className="apuracao-tie-names">
      {tied.map((cand) => `${displayName(cand.name)}${cand.pct ? ` ${cand.pct}%` : ""}`).join(" · ")}
    </p>
  );
}

function Person({
  cand,
  locale,
  badge,
  prominent = false,
  open = false,
}: {
  cand: TseCandidate;
  locale: "pt" | "en";
  badge?: string;
  prominent?: boolean;
  open?: boolean;
}) {
  const { m } = useI18n();
  return (
    <li className={prominent ? "apuracao-person" : "apuracao-row"}>
      <span className="apuracao-who">
        {badge ? (
          <span className={open ? "apuracao-badge apuracao-badge-open" : "apuracao-badge"}>
            {badge}
          </span>
        ) : null}
        <span className={prominent ? "apuracao-elected-name" : "apuracao-name"}>
          {displayName(cand.name)}
        </span>
        <span className="apuracao-party">
          {cand.party} {cand.number}
        </span>
      </span>
      <span className="apuracao-figures">
        {cand.pct ? <span className="apuracao-share">{cand.pct}%</span> : null}
        <span className="apuracao-votes">{m.apuracao.votes(fmtVotes(cand.votes, locale))}</span>
      </span>
    </li>
  );
}

export function ApuracaoPage() {
  const { m } = useI18n();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const cargo = search.cargo;
  const sel = search.uf ?? "SP";
  const [snap, setSnap] = useState<{ cargo: Cargo; byUf: Record<string, CountResult> } | null>(
    null,
  );
  const counts = snap?.cargo === cargo ? snap.byUf : null;

  useEffect(() => {
    if (search.uf) {
      writeStoredUf(search.uf);
      return;
    }
    const stored = readStoredUf();
    if (!stored) return;
    void navigate({
      search: (prev) => ({ ...prev, uf: stored }),
      replace: true,
    });
  }, [search.uf, navigate]);

  useEffect(() => {
    let alive = true;
    const targets = countTargets(cargo);

    async function pull() {
      const rows = await Promise.all(
        targets.map(async (target) => [target.scope, await fetchCount(target.url)] as const),
      );
      if (!alive) return;
      setSnap({ cargo, byUf: Object.fromEntries(rows) });
    }

    void pull();
    const id = window.setInterval(() => void pull(), APURACAO_REFRESH_MS);
    function onVisible() {
      if (document.visibilityState === "visible") void pull();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [cargo]);

  function setCargo(next: Cargo) {
    void navigate({
      search: (prev) => ({ ...prev, cargo: next }),
    });
  }

  function selectUf(uf: string) {
    const code = parseUfCode(uf);
    if (!code) return;
    writeStoredUf(code);
    void navigate({
      search: (prev) => ({ ...prev, uf: code }),
    });
  }

  const ufCount = counts?.[sel];
  const national = cargo === "presidente" && counts ? rollupPresident(counts) : undefined;
  const office =
    cargo === "deputado-estadual" && sel === "DF"
      ? m.apuracao.distrital
      : m.apuracao.offices[OFFICE_KEY[cargo]];
  const ufTitle = `${UF_META[sel]?.name ?? sel} · ${office}`;

  return (
    <div className="pb-[max(4rem,env(safe-area-inset-bottom))]">
      <div className="page-body mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 pt-5 sm:px-6 sm:pt-8">
        <MastBar className="mb-5" />
        <main id="conteudo" className="apuracao-page">
          <header className="apuracao-head">
            <p className="kicker">{m.apuracao.label}</p>
            <h1 className="apuracao-title">{m.apuracao.label}</h1>
            <p className="apuracao-source">{m.apuracao.source}</p>
            <p className="apuracao-refresh">{m.apuracao.refresh}</p>
          </header>

          <div className="apuracao-cargos" role="group" aria-label={m.apuracao.switchAria}>
            {CARGOS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={cargo === id}
                onClick={() => setCargo(id)}
              >
                {m.apuracao.offices[OFFICE_KEY[id]]}
              </button>
            ))}
          </div>

          {cargo === "presidente" ? (
            <CountCard title={m.apuracao.national} count={national} loaded={Boolean(counts)} />
          ) : null}

          <div className="apuracao-board">
            <ApuracaoMap counts={counts} sel={sel} onSelectUf={selectUf} />
            <div className="apuracao-uf">
              <CountCard title={ufTitle} count={ufCount} loaded={Boolean(counts)} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
