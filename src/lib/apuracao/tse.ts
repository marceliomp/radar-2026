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
  /** Official `s.pst` (2 houses). */
  pctApurado: string;
  /** Official `s.pstn` (9 houses). */
  pctApuradoExact: string;
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
  const top = ranked[0];
  const second = ranked[1];
  const tie = Boolean(top && second && top.votes > 0 && top.votes === second.votes);
  const leader = top && top.votes > 0 && !tie ? top : null;
  const dt = typeof root.dt === "string" ? root.dt : "";
  const ht = typeof root.ht === "string" ? root.ht : "";

  return {
    status: "ok",
    pctApurado,
    pctApuradoExact: publishedPct(sections?.pstn),
    updatedAt: dt && ht ? `${dt} ${ht}` : null,
    leader,
    tie,
    candidates: ranked.slice(0, 8),
  };
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
    const res = await fetchImpl(url, { headers: { accept: "application/json" } });
    if (!res.ok) return { status: "aguardando" };
    return parseCount(await res.json());
  } catch {
    return { status: "aguardando" };
  }
}
