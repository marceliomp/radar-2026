import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ELECTION_2022,
  ELECTION_2022_UF_LIST,
  NATIONAL_2022,
  votes2tNationalUfs,
} from "../src/data/election-2022.ts";
import { UF_META } from "../src/data/calendar.ts";

const NEED = ["SP", "MG", "RJ", "BA", "RS", "SC"];

test("27 UFs with 2nd round Lula vs Bolsonaro", () => {
  assert.equal(ELECTION_2022_UF_LIST.length, 27);
  assert.equal(Object.keys(ELECTION_2022).length, 27);
  for (const uf of ELECTION_2022_UF_LIST) {
    const r = ELECTION_2022[uf];
    assert.ok(r, uf);
    assert.equal(typeof r.lula2, "number", uf);
    assert.equal(typeof r.bolsonaro2, "number", uf);
    assert.ok(r.lula2 > 0 && r.bolsonaro2 > 0, uf);
    assert.ok(Math.abs(r.lula2 + r.bolsonaro2 - 100) < 0.05, `${uf} 2T sum`);
    assert.equal(typeof r.lula1, "number", uf);
    assert.equal(typeof r.bolsonaro1, "number", uf);
  }
});

test("SP/MG/RJ/BA/RS/SC present; SC 2T Bolsonaro ahead", () => {
  for (const uf of NEED) {
    assert.ok(ELECTION_2022[uf], uf);
  }
  const sc = ELECTION_2022.SC;
  assert.ok(sc.bolsonaro2 > sc.lula2, `SC 2T ${sc.bolsonaro2} vs ${sc.lula2}`);
});

test("2T vote sum across 27 UFs ≈ national 50.90", () => {
  const v = votes2tNationalUfs();
  assert.ok(Math.abs(v.shareLula - NATIONAL_2022.lula2) < 0.05, v.shareLula);
  let ew = 0, el = 0;
  for (const uf of ELECTION_2022_UF_LIST) {
    const e = UF_META[uf].electorateM;
    ew += e;
    el += e * ELECTION_2022[uf].lula2;
  }
  const wLula = el / ew;
  assert.ok(Math.abs(wLula - NATIONAL_2022.lula2) < 1.5, `elec weighted ${wLula}`);
});
