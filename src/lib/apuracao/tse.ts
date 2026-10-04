import { UF_ORDER } from "../../data/candidates.ts";

/**
 * Official TSE count for the 2026 first round (EA20 `-u.json`).
 * Percent of sections is `s.pst` / `s.pstn`. Candidate percent is
 * `cand.pvap` / `cand.pvapn`. Never recompute either from other blocks
 * (`e.pest` is the electorate, `v.p*` is the vote mix).
 *
 * URLs are the live files. A query string is not part of the contract
 * and can 404. Many 404s can get the IP blocked, so state races never
 * request a national candidate file (that URL 404s) and DF "deputado
 * estadual" uses cargo 0008 (distrital), not 0007.
 */

export const APURACAO_REFRESH_MS = 10_000;
export const APURACAO_LABEL = "Apuração TSE";
export const AGUARDANDO = "Aguardando apuração";

const ORIGIN = "https://resultados.tse.jus.br/oficial";

export const CARGOS = [
  "presidente",
  "governador",
  "senador",
  "deputado-federal",
  "deputado-estadual",
] as const;

export type Cargo = (typeof CARGOS)[number];

export type TseCandidate = {
  name: string;
  number: string;
  party: string;
  votes: number;
  /** Official `pvap`, as published. Empty when TSE omitted it. */
  pct: string;
  /** Official `pvapn`, as published. */
  pctExact: string;
};

export type TseCount = {
  status: "ok";
  /** Official `s.pst` (2 houses), or the same ratio summed across UFs. */
  pctApurado: string;
  /** Official `s.pstn` (9 houses), or the summed ratio. */
  pctApuradoExact: string;
  /** Official `s.st`. Zero when the file omitted it. */
  sectionsCounted: number;
  /** Official `s.ts`. Zero when the file omitted it. */
  sectionsTotal: number;
  updatedAt: string | null;
  leader: TseCandidate | null;
  tie: boolean;
  candidates: TseCandidate[];
};

export type Aguardando = { status: "aguardando" };

export type CountResult = TseCount | Aguardando;

const VALID_VOTE = new Set(["válido", "valido"]);

export function parseCargo(raw: unknown): Cargo | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  return (CARGOS as readonly string[]).includes(v) ? (v as Cargo) : undefined;
}

/** Exact TSE file for one scope. `{uf}` is lowercased. `br` is only valid for presidente. */
export function countUrl(cargo: Cargo, uf: string): string {
  const u = uf.trim().toLowerCase();
  if (cargo === "presidente") {
    return `${ORIGIN}/ele2026/6257/dados/${u}/${u}-c0001-e006257-u.json`;
  }
  const cargoCode =
    cargo === "governador"
      ? "0003"
      : cargo === "senador"
        ? "0005"
        : cargo === "deputado-federal"
          ? "0006"
          : u === "df"
            ? "0008"
            : "0007";
  return `${ORIGIN}/ele2026/6259/dados/${u}/${u}-c${cargoCode}-e006259-u.json`;
}

export function countTargets(cargo: Cargo): { scope: string; url: string }[] {
  const scopes = cargo === "presidente" ? ["br", ...UF_ORDER] : [...UF_ORDER];
  return scopes.map((scope) => ({
    scope: scope.toUpperCase(),
    url: countUrl(cargo, scope),
  }));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function intString(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

function publishedPct(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isValidVote(dvt: unknown): boolean {
  if (typeof dvt !== "string" || !dvt.trim()) return true;
  return VALID_VOTE.has(dvt.trim().toLocaleLowerCase("pt-BR"));
}

function readCandidates(root: Record<string, unknown>): TseCandidate[] {
  const carg = root.carg;
  if (!Array.isArray(carg)) return [];
  const out: TseCandidate[] = [];
  for (const cargo of carg) {
    const cargoRec = asRecord(cargo);
    const groups = cargoRec?.agr;
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      const parties = asRecord(group)?.par;
      if (!Array.isArray(parties)) continue;
      for (const party of parties) {
        const partyRec = asRecord(party);
        const cands = partyRec?.cand;
        if (!Array.isArray(cands)) continue;
        const sigla = typeof partyRec?.sg === "string" ? partyRec.sg : "";
        for (const cand of cands) {
          const row = asRecord(cand);
          if (!row || !isValidVote(row.dvt)) continue;
          const votes = intString(row.vap);
          if (votes == null) continue;
          const nmu = typeof row.nmu === "string" ? row.nmu.trim() : "";
          const nm = typeof row.nm === "string" ? row.nm.trim() : "";
          const name = nmu || nm;
          if (!name) continue;
          out.push({
            name,
            number: typeof row.n === "string" ? row.n : "",
            party: sigla,
            votes,
            pct: publishedPct(row.pvap),
            pctExact: publishedPct(row.pvapn),
          });
        }
      }
    }
  }
  out.sort((a, b) => b.votes - a.votes || a.number.localeCompare(b.number));
  return out;
}

/** Parse one `-u.json` body. Anything that is not that file is aguardando — no invented totals. */
export function parseCount(raw: unknown): CountResult {
  const root = asRecord(raw);
  const sections = asRecord(root?.s);
  const pctApurado = sections && typeof sections.pst === "string" ? sections.pst : null;
  if (!root || pctApurado == null) return { status: "aguardando" };

  const ranked = readCandidates(root);
  const finished = finishCount(ranked, {
    pctApurado,
    pctApuradoExact: publishedPct(sections?.pstn),
    sectionsCounted: intString(sections?.st) ?? 0,
    sectionsTotal: intString(sections?.ts) ?? 0,
    updatedAt: stampLabel(root.dt, root.ht),
  });
  return finished;
}

function stampLabel(dt: unknown, ht: unknown): string | null {
  const day = typeof dt === "string" ? dt : "";
  const time = typeof ht === "string" ? ht : "";
  return day && time ? `${day} ${time}` : null;
}

function stampMs(label: string | null): number | null {
  if (!label) return null;
  const match = label.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, mi, ss] = match;
  return Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
}

function ptFixed(value: number, digits: number): string {
  const [ints, frac] = value.toFixed(digits).split(".");
  return frac != null ? `${ints},${frac}` : ints;
}

function finishCount(
  ranked: TseCandidate[],
  meta: {
    pctApurado: string;
    pctApuradoExact: string;
    sectionsCounted: number;
    sectionsTotal: number;
    updatedAt: string | null;
  },
): TseCount {
  const top = ranked[0];
  const second = ranked[1];
  const tie = Boolean(top && second && top.votes > 0 && top.votes === second.votes);
  const leader = top && top.votes > 0 && !tie ? top : null;
  return { status: "ok", ...meta, leader, tie, candidates: ranked };
}

/**
 * Presidente Brasil. The national `-u.json` lags the UF files the TSE
 * already published (64,81% at 19:06 while the UFs summed past 80%).
 * Sum official `vap` and `s.st`/`s.ts`. Do not average `pvap`.
 * When the national file has at least as many sections, keep its `pvap`.
 */
export function rollupPresident(byUf: Record<string, CountResult>): CountResult {
  const br = byUf.BR;
  const parts = Object.entries(byUf).flatMap(([scope, row]) =>
    scope === "BR" || row.status !== "ok" ? [] : [row],
  );
  if (parts.length === 0) return br ?? { status: "aguardando" };

  const merged = new Map<string, TseCandidate>();
  let sectionsCounted = 0;
  let sectionsTotal = 0;
  const stamps: number[] = [];
  for (const row of parts) {
    sectionsCounted += row.sectionsCounted;
    sectionsTotal += row.sectionsTotal;
    const ms = stampMs(row.updatedAt);
    if (ms != null) stamps.push(ms);
    for (const cand of row.candidates) {
      const key = cand.number || cand.name;
      const prev = merged.get(key);
      if (!prev) {
        merged.set(key, { ...cand, pct: "", pctExact: "" });
        continue;
      }
      prev.votes += cand.votes;
    }
  }

  const ranked = [...merged.values()].sort(
    (a, b) => b.votes - a.votes || a.number.localeCompare(b.number),
  );
  const voteTotal = ranked.reduce((sum, cand) => sum + cand.votes, 0);
  for (const cand of ranked) {
    if (voteTotal <= 0) continue;
    const share = (cand.votes / voteTotal) * 100;
    cand.pct = ptFixed(share, 2);
    cand.pctExact = ptFixed(share, 9);
  }

  const rolled = finishCount(ranked, {
    pctApurado: sectionsTotal > 0 ? ptFixed((sectionsCounted / sectionsTotal) * 100, 2) : "",
    pctApuradoExact: sectionsTotal > 0 ? ptFixed((sectionsCounted / sectionsTotal) * 100, 9) : "",
    sectionsCounted,
    sectionsTotal,
    updatedAt: latestStamp(stamps),
  });

  if (
    br?.status === "ok" &&
    br.sectionsCounted > 0 &&
    br.sectionsCounted >= rolled.sectionsCounted
  ) {
    return br;
  }
  return rolled;
}

function latestStamp(stamps: number[]): string | null {
  if (stamps.length === 0) return null;
  const sorted = [...stamps].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)]!;
  const windowMs = 20 * 60 * 1000;
  const kept = sorted.filter((stamp) => Math.abs(stamp - mid) <= windowMs);
  const ms = kept.length > 0 ? kept[kept.length - 1]! : mid;
  const date = new Date(ms);
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()} ${hh}:${mi}:${ss}`;
}

export function displayName(raw: string): string {
  return raw
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1))
    .join(" ");
}

export async function fetchCount(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CountResult> {
  try {
    const res = await fetchImpl(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { status: "aguardando" };
    return parseCount(await res.json());
  } catch {
    return { status: "aguardando" };
  }
}
