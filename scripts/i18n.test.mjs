import assert from "node:assert/strict";
import { test } from "node:test";

async function load() {
  return import("../src/lib/i18n/messages.ts");
}

async function loadLocale() {
  return import("../src/lib/i18n/locale.ts");
}

async function loadFormat() {
  return import("../src/lib/format.ts");
}

function walk(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") keys.push(...walk(v, path));
    else keys.push(path);
  }
  return keys;
}

test("en and pt expose the same message keys", async () => {
  const { pt, en } = await load();
  const a = walk(pt).sort();
  const b = walk(en).sort();
  assert.deepEqual(b, a);
});

test("copy has no em dash", async () => {
  const { pt, en } = await load();
  const blob = JSON.stringify(pt) + JSON.stringify(en);
  assert.doesNotMatch(blob, /\u2014/);
  assert.doesNotMatch(blob, /\u2013/);
});

test("parseLocale accepts en and pt aliases", async () => {
  const { parseLocale, parseLangSearch } = await loadLocale();
  assert.equal(parseLocale("en"), "en");
  assert.equal(parseLocale("en-US"), "en");
  assert.equal(parseLocale("pt-BR"), "pt");
  assert.equal(parseLocale("fr"), undefined);
  assert.deepEqual(parseLangSearch({ lang: "en" }), { lang: "en" });
  assert.deepEqual(parseLangSearch({ lang: "pt" }), { lang: "pt" });
  assert.deepEqual(parseLangSearch({}), {});
});

test("switching back to PT keeps lang=pt so retainSearchParams cannot restore en", async () => {
  const { parseLangSearch, keepRadarSearch } = await loadLocale();
  assert.deepEqual(parseLangSearch({ lang: "pt", hl: 5 }), { lang: "pt" });
  assert.equal(keepRadarSearch({ lang: "pt", hl: 14 }).lang, "pt");
  assert.equal(keepRadarSearch({ lang: "en" }).lang, "en");
  const react = await import("node:fs").then((fs) =>
    fs.readFileSync("src/lib/i18n/react.tsx", "utf8"),
  );
  assert.match(react, /merged\.lang = next/);
  assert.doesNotMatch(react, /delete merged\.lang/);
});

test("english numbers and dates", async () => {
  const { fmtNum, fmtPct, dateShort, dateFull, fieldPeriodLine, fieldRangeLabel } =
    await loadFormat();
  assert.equal(fmtNum(40.2, 1, "en"), "40.2");
  assert.equal(fmtPct(40.2, 1, "en"), "40.2%");
  assert.equal(dateShort("2026-09-01", "en"), "1 Sep");
  assert.equal(dateFull("2026-09-01", "en"), "1 Sep 2026");
  assert.equal(fieldRangeLabel("2026-08-30", "2026-09-01", "en"), "30 Aug to 1 Sep");
  assert.equal(
    fieldPeriodLine("2026-08-30", "2026-09-01", "en"),
    "Fieldwork 30 Aug to 1 Sep",
  );
});
