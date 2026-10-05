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
  /**
   * TSE mark. `e` is "s", or `st` names the candidate eleito.
   * "n", an empty `st`, and any other situation are not a mark.
   */
  tseElected: boolean;
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
  /** `carg.nv`. Zero when the file omitted the seat count. */
  seats: number;
  /** Proportional race: `carg.qe` is present and there is more than one seat. */
  proportional: boolean;
  /**
   * Max votes still out: `e.esnt`. Zero once `s.st` has reached `s.ts`.
   * Null when the file omitted both, so the math lock stays off.
   */
  remainingVotes: number | null;
  /** Official `v.vv`, or the sum of valid `vap` when TSE omitted it. */
  validVotes: number;
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

function situationText(row: Record<string, unknown>): string {
  return typeof row.st === "string" ? row.st.trim().toLocaleLowerCase("pt-BR") : "";
}

/** TSE `st` "2º turno" is a runoff finalist, not someone who won the seat. */
function isRunoffSituation(situation: string): boolean {
  if (!situation) return false;
  return (
    situation.includes("2º") ||
    situation.includes("2°") ||
    situation.includes("segundo turno") ||
    /2\s*o?\s*turno/.test(situation)
  );
}

/**
 * `e === "s"` or a situation that says eleito and does not say não.
 * "2º turno" wins over `e: "s"`: that pair is who advances, not who won.
 */
function markedElected(row: Record<string, unknown>): boolean {
  const situation = situationText(row);
  if (isRunoffSituation(situation)) return false;
  const flag = typeof row.e === "string" ? row.e.trim().toLowerCase() : "";
  if (flag === "s") return true;
  if (!situation) return false;
  if (situation.includes("não") || situation.includes("nao")) return false;
  return situation.includes("eleito");
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
            tseElected: markedElected(row),
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
  const race = readRace(root);
  const finished = finishCount(ranked, {
    pctApurado,
    pctApuradoExact: publishedPct(sections?.pstn),
    sectionsCounted: intString(sections?.st) ?? 0,
    sectionsTotal: intString(sections?.ts) ?? 0,
    updatedAt: stampLabel(root.dt, root.ht),
    seats: race.seats,
    proportional: race.proportional,
    remainingVotes: race.remainingVotes,
    validVotes: race.validVotes ?? ranked.reduce((sum, cand) => sum + cand.votes, 0),
  });
  return finished;
}

function readRace(root: Record<string, unknown>): {
  seats: number;
  proportional: boolean;
  remainingVotes: number | null;
  validVotes: number | null;
} {
  const carg = Array.isArray(root.carg) ? asRecord(root.carg[0]) : null;
  const cargoCode = carg ? intString(carg.cd) : null;
  // Presidente (1) and governador (3) are one seat. A stray `nv` of 2 is not a second chair.
  const majorityCargo = cargoCode === 1 || cargoCode === 3;
  const seats = majorityCargo ? 1 : carg ? (intString(carg.nv) ?? 0) : 0;
  const quotient = carg ? intString(carg.qe) : null;
  const sections = asRecord(root.s);
  const counted = intString(sections?.st) ?? 0;
  const total = intString(sections?.ts) ?? 0;
  const ele = asRecord(root.e);
  let remainingVotes = ele ? intString(ele.esnt) : null;
  if (remainingVotes == null && total > 0 && counted >= total) remainingVotes = 0;
  const votes = asRecord(root.v);
  return {
    seats,
    proportional: !majorityCargo && quotient != null && seats > 1,
    remainingVotes,
    validVotes: votes ? intString(votes.vv) : null,
  };
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
    seats: number;
    proportional: boolean;
    remainingVotes: number | null;
    validVotes: number;
  },
): TseCount {
  const top = ranked[0];
  const second = ranked[1];
  const tie = Boolean(top && second && top.votes > 0 && top.votes === second.votes);
  const leader = top && top.votes > 0 && !tie ? top : null;
  return { status: "ok", ...meta, leader, tie, candidates: ranked };
}

export type CountCall = {
  kind: "eleito" | "segundo-turno" | "na-frente" | "empate" | "aberto";
  elected: TseCandidate[];
  runoff: TseCandidate[];
  leading: TseCandidate | null;
  rest: TseCandidate[];
};

/**
 * Eleito is not "na frente".
 * Majority (presidente, governador, one seat): at most one Eleito, and only
 * when that person is still strictly above half of valid votes after every
 * remaining vote (`2 * L > V + R`). Exactly half is not eleito. TSE `e: "s"`
 * does not elect a second name and does not elect someone at or under half.
 * If the count is finished, or the leader can no longer reach half and the
 * second is safe, the top two are 2º turno. A tie is not a single eleito.
 * Senate (`nv` seats, no quotient): a seat is locked when the candidate
 * beats the first person outside those seats by more than the remaining
 * votes. Ties at the cutoff stay open.
 * Deputies (`qe` present): certain quotient seats use the highest the
 * quotient can still reach, `floor((V + R) / seats)`. A name in that
 * party slice is locked only when the next name in the party cannot catch
 * them. Unknown remaining votes turn the math off.
 */
export function callCount(count: TseCount): CountCall {
  const ranked = count.candidates.filter((cand) => cand.votes > 0 || cand.tseElected);
  const elected = new Set<TseCandidate>();
  const remaining = count.remainingVotes;
  const valid = count.validVotes;
  const top = ranked[0];
  const second = ranked[1];
  const tied = Boolean(top && second && top.votes > 0 && top.votes === second.votes);
  const majority = count.seats === 1 && !count.proportional;

  if (!majority) {
    for (const cand of ranked) {
      if (cand.tseElected) elected.add(cand);
    }
  }

  const pool = majorityPool(top, valid);
  if (majority && remaining != null && !tied && top && aboveHalf(top.votes, pool, remaining)) {
    elected.add(top);
  }

  if (count.seats > 1 && !count.proportional && remaining != null) {
    const barrier = ranked[count.seats]?.votes ?? 0;
    for (let i = 0; i < count.seats && i < ranked.length; i++) {
      const cand = ranked[i];
      if (cand && cand.votes > barrier + remaining) elected.add(cand);
    }
  }

  if (count.proportional && count.seats > 1 && remaining != null) {
    for (const cand of proportionalLocked(ranked, count.seats, valid, remaining)) {
      elected.add(cand);
    }
  }

  const electedList = ranked.filter((cand) => elected.has(cand));
  if (majority && tied && electedList.length === 0) {
    return { kind: "empate", elected: [], runoff: [], leading: null, rest: ranked };
  }
  if (electedList.length > 0) {
    return {
      kind: "eleito",
      elected: electedList,
      runoff: [],
      leading: null,
      rest: ranked.filter((cand) => !elected.has(cand)),
    };
  }

  if (majority && remaining != null && top && second && !tied) {
    const third = ranked[2];
    const leaderOver = aboveHalf(top.votes, pool, remaining);
    const leaderCannot = cannotReachHalf(top.votes, pool, remaining);
    const secondSafe = second.votes > (third?.votes ?? 0) + remaining;
    const finished = remaining === 0;
    if (!leaderOver && (finished || (leaderCannot && secondSafe))) {
      return {
        kind: "segundo-turno",
        elected: [],
        runoff: [top, second],
        leading: null,
        rest: ranked.slice(2),
      };
    }
  }

  if (majority && top && !tied) {
    return { kind: "na-frente", elected: [], runoff: [], leading: top, rest: ranked.slice(1) };
  }

  return { kind: "aberto", elected: [], runoff: [], leading: null, rest: ranked };
}

/**
 * Denominator of the published candidate percent (`pvapn`).
 * `v.vv` drops anulado sub judice, so a name can be over half of `v.vv`
 * while TSE still prints 49%. The printed percent is the one on screen.
 */
function majorityPool(cand: TseCandidate | undefined, validVotes: number): number {
  if (!cand || cand.votes <= 0) return validVotes;
  const raw = cand.pctExact || cand.pct;
  if (!raw) return validVotes;
  const pct = Number(raw.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(pct) || pct <= 0) return validVotes;
  const base = Math.round((cand.votes * 100) / pct);
  if (!Number.isSafeInteger(base) || base < cand.votes) return validVotes;
  return base;
}

function aboveHalf(votes: number, valid: number, remaining: number): boolean {
  return votes * 2 > valid + remaining;
}

function cannotReachHalf(votes: number, valid: number, remaining: number): boolean {
  return (votes + remaining) * 2 <= valid + remaining;
}

function proportionalLocked(
  ranked: TseCandidate[],
  seats: number,
  valid: number,
  remaining: number,
): TseCandidate[] {
  const quotientMax = Math.floor((valid + remaining) / seats);
  if (quotientMax <= 0) return [];
  const byParty = new Map<string, TseCandidate[]>();
  for (const cand of ranked) {
    const key = cand.party || `solo:${cand.number}`;
    const list = byParty.get(key) ?? [];
    list.push(cand);
    byParty.set(key, list);
  }
  const locked: TseCandidate[] = [];
  for (const list of byParty.values()) {
    const partyVotes = list.reduce((sum, cand) => sum + cand.votes, 0);
    const certain = Math.floor(partyVotes / quotientMax);
    if (certain <= 0) continue;
    const ordered = [...list].sort(
      (a, b) => b.votes - a.votes || a.number.localeCompare(b.number),
    );
    const outside = ordered[certain]?.votes ?? 0;
    for (let i = 0; i < certain && i < ordered.length; i++) {
      const cand = ordered[i];
      if (cand && cand.votes > outside + remaining) locked.push(cand);
    }
  }
  return locked;
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

  const merged = new Map<string, TseCandidate & { electedUfs: number }>();
  let sectionsCounted = 0;
  let sectionsTotal = 0;
  let validVotes = 0;
  let remainingVotes: number | null = 0;
  let seats = 0;
  const stamps: number[] = [];
  for (const row of parts) {
    sectionsCounted += row.sectionsCounted;
    sectionsTotal += row.sectionsTotal;
    validVotes += row.validVotes;
    seats = Math.max(seats, row.seats);
    if (row.remainingVotes == null) remainingVotes = null;
    else if (remainingVotes != null) remainingVotes += row.remainingVotes;
    const ms = stampMs(row.updatedAt);
    if (ms != null) stamps.push(ms);
    for (const cand of row.candidates) {
      const key = cand.number || cand.name;
      const prev = merged.get(key);
      if (!prev) {
        merged.set(key, {
          ...cand,
          pct: "",
          pctExact: "",
          tseElected: false,
          electedUfs: cand.tseElected ? 1 : 0,
        });
        continue;
      }
      prev.votes += cand.votes;
      if (cand.tseElected) prev.electedUfs += 1;
    }
  }

  const ranked = [...merged.values()]
    .sort((a, b) => b.votes - a.votes || a.number.localeCompare(b.number))
    .map(({ electedUfs, ...cand }) => ({
      ...cand,
      tseElected: parts.length > 0 && electedUfs === parts.length,
    }));
  if (br?.status === "ok") {
    const flagged = new Set(
      br.candidates.filter((cand) => cand.tseElected).map((cand) => cand.number || cand.name),
    );
    for (const cand of ranked) {
      if (flagged.has(cand.number || cand.name)) cand.tseElected = true;
    }
  }
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
    seats: seats || 1,
    proportional: false,
    remainingVotes,
    validVotes,
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
