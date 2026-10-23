#!/usr/bin/env node
/**
 * Grava a urna do 1º turno 2026 (presidente, por UF) que a projeção do 2º
 * turno usa como base. Rodar uma vez: os arquivos 6257 estão fechados.
 *   node --experimental-strip-types scripts/snapshot-first-round-2026.mjs
 */
import { writeFileSync } from "node:fs";
import { UF_ORDER } from "../src/data/candidates.ts";
import { countUrl, parseCount } from "../src/lib/apuracao/tse.ts";

const out = {};
for (const uf of UF_ORDER) {
  const res = await fetch(countUrl("presidente", uf, 1));
  if (!res.ok) throw new Error(`${uf}: HTTP ${res.status}`);
  const count = parseCount(await res.json());
  if (count.status !== "ok" || count.sectionsCounted < count.sectionsTotal) {
    throw new Error(`${uf}: 1º turno não está 100% apurado`);
  }
  const votes = (n) => count.candidates.find((c) => c.number === n)?.votes ?? 0;
  out[uf] = { flavio: votes("22"), lula: votes("13"), validVotes: count.validVotes };
  if (!out[uf].flavio || !out[uf].lula) throw new Error(`${uf}: candidato sem votos`);
}
writeFileSync(
  new URL("../src/data/first-round-2026.json", import.meta.url),
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(`ok ${Object.keys(out).length} UFs`);
