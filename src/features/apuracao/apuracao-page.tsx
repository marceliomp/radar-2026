import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { MastBar } from "@/components/site-nav";
import { UF_META } from "@/data/calendar";
import { ApuracaoMap } from "@/features/apuracao/apuracao-map";
import { SegGroup } from "@/features/radar/map/map-layer-toggle";
import {
  APURACAO_REFRESH_MS,
  CARGOS,
  countTargets,
  displayName,
  fetchCount,
  type Cargo,
  type CountResult,
  type TseCandidate,
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
  const ahead =
    count?.status === "ok" && count.tie
      ? m.apuracao.tie
      : count?.status === "ok" && count.leader
        ? m.apuracao.ahead(displayName(count.leader.name))
        : m.apuracao.waiting;

  return (
    <section className="border border-border bg-surface/60 p-4" aria-live="polite">
      <p className="kicker">{m.apuracao.label}</p>
      <h2 className="story-title mt-1 text-2xl">{title}</h2>
      {waiting ? (
        <p className="mt-3 text-lg font-semibold">
          {loaded ? m.apuracao.waiting : m.apuracao.source}
        </p>
      ) : (
        <>
          <p className="mt-3 text-lg font-semibold">{ahead}</p>
          <p className="mt-1 text-sm text-muted">
            {m.apuracao.counted(count.pctApurado)}
            {count.updatedAt ? ` · ${m.apuracao.updated(count.updatedAt)}` : ""}
          </p>
          {count.tie ? <TiedNames candidates={count.candidates} /> : null}
          <ol className="mt-4">
            {(count.tie ? [] : count.candidates).slice(0, 6).map((cand) => (
              <CandidateRow key={`${cand.number}-${cand.name}`} cand={cand} locale={locale} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function TiedNames({ candidates }: { candidates: TseCandidate[] }) {
  const top = candidates[0]?.votes;
  const tied = candidates.filter((c) => c.votes === top);
  return (
    <p className="mt-2 text-sm text-muted">
      {tied.map((c) => `${displayName(c.name)}${c.pct ? ` ${c.pct}%` : ""}`).join(" · ")}
    </p>
  );
}

function CandidateRow({ cand, locale }: { cand: TseCandidate; locale: "pt" | "en" }) {
  const { m } = useI18n();
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-border py-2 text-sm">
      <span>
        {displayName(cand.name)}{" "}
        <span className="text-muted">
          {cand.party} {cand.number}
        </span>
      </span>
      <span className="shrink-0 text-right tabular-nums">
        {cand.pct ? <span className="font-semibold">{cand.pct}%</span> : null}
        <span className="mt-0.5 block text-xs text-muted">
          {m.apuracao.votes(fmtVotes(cand.votes, locale))}
        </span>
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
    return () => {
      alive = false;
      window.clearInterval(id);
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
  const national = cargo === "presidente" ? counts?.BR : undefined;
  const office =
    cargo === "deputado-estadual" && sel === "DF"
      ? m.apuracao.distrital
      : m.apuracao.offices[OFFICE_KEY[cargo]];
  const ufTitle = `${UF_META[sel]?.name ?? sel} · ${office}`;

  return (
    <div className="pb-[max(4rem,env(safe-area-inset-bottom))]">
      <div className="page-body mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 pt-5 sm:px-6 sm:pt-8">
        <MastBar className="mb-5" />
        <main id="conteudo">
          <p className="kicker">{m.apuracao.label}</p>
          <h1 className="story-title mt-1 text-3xl sm:text-4xl">{m.apuracao.label}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">{m.apuracao.source}</p>
          <p className="mt-1 text-xs text-muted">{m.apuracao.refresh}</p>

          <div className="mt-5">
            <SegGroup ariaLabel={m.apuracao.switchAria}>
              {CARGOS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="seg-btn"
                  aria-pressed={cargo === id}
                  onClick={() => setCargo(id)}
                >
                  <span className="seg-label">{m.apuracao.offices[OFFICE_KEY[id]]}</span>
                </button>
              ))}
            </SegGroup>
          </div>

          {cargo === "presidente" ? (
            <div className="mt-5">
              <CountCard title={m.apuracao.national} count={national} loaded={Boolean(counts)} />
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_17.5rem]">
            <ApuracaoMap counts={counts} sel={sel} onSelectUf={selectUf} />
            <CountCard title={ufTitle} count={ufCount} loaded={Boolean(counts)} />
          </div>
        </main>
      </div>
    </div>
  );
}
